import fs from 'fs/promises'
import path from 'path'
import { Pool } from 'pg'

const DATABASE_URL = String(process.env.DATABASE_URL || '').trim()
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required')
}

const jsonPath = process.argv[2]
  ? path.resolve(process.cwd(), process.argv[2])
  : path.resolve(process.cwd(), 'server', 'data', 'app-db.json')

const useSsl = !/(localhost|127\.0\.0\.1)/i.test(DATABASE_URL)
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false
})

const raw = await fs.readFile(jsonPath, 'utf8')
const data = JSON.parse(raw)

const users = Array.isArray(data.users) ? data.users : []
const sessions = Array.isArray(data.sessions) ? data.sessions : []
const resets = Array.isArray(data.passwordResets) ? data.passwordResets : []
const reviews = Array.isArray(data.practiceReviews) ? data.practiceReviews : []
const latestMap = data.latestReviews && typeof data.latestReviews === 'object' ? data.latestReviews : {}

const client = await pool.connect()
try {
  await client.query('BEGIN')

  for (const user of users) {
    await client.query(
      `INSERT INTO users (id, email, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (id)
       DO UPDATE SET
         email = EXCLUDED.email,
         password_hash = EXCLUDED.password_hash,
         created_at = EXCLUDED.created_at,
         updated_at = EXCLUDED.updated_at`,
      [
        String(user.id || ''),
        String(user.email || '').toLowerCase(),
        String(user.passwordHash || ''),
        String(user.createdAt || new Date().toISOString()),
        String(user.updatedAt || new Date().toISOString())
      ]
    )
  }

  for (const session of sessions) {
    await client.query(
      `INSERT INTO sessions (token, user_id, email, created_at, updated_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6)
       ON CONFLICT (token)
       DO UPDATE SET
         user_id = EXCLUDED.user_id,
         email = EXCLUDED.email,
         created_at = EXCLUDED.created_at,
         updated_at = EXCLUDED.updated_at,
         expires_at = EXCLUDED.expires_at`,
      [
        String(session.token || ''),
        String(session.userId || ''),
        String(session.email || '').toLowerCase(),
        String(session.createdAt || new Date().toISOString()),
        String(session.updatedAt || new Date().toISOString()),
        Number(session.expiresAt || 0)
      ]
    )
  }

  for (const reset of resets) {
    await client.query(
      `INSERT INTO password_resets (id, user_id, email, token, used, created_at, expires_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (token)
       DO UPDATE SET
         id = EXCLUDED.id,
         user_id = EXCLUDED.user_id,
         email = EXCLUDED.email,
         used = EXCLUDED.used,
         created_at = EXCLUDED.created_at,
         expires_at = EXCLUDED.expires_at`,
      [
        String(reset.id || ''),
        String(reset.userId || ''),
        String(reset.email || '').toLowerCase(),
        String(reset.token || ''),
        Boolean(reset.used),
        String(reset.createdAt || new Date().toISOString()),
        Number(reset.expiresAt || 0)
      ]
    )
  }

  for (const review of reviews) {
    await client.query(
      `INSERT INTO practice_reviews (
         id, user_id, email, exam_id, exam_name, exam_short, year,
         submitted_at, total_questions, answered_count, answer_known_count, correct_count,
         questions, updated_at
       )
       VALUES (
         $1, $2, $3, $4, $5, $6, $7,
         $8, $9, $10, $11, $12,
         $13::jsonb, $14
       )
       ON CONFLICT (user_id, exam_id, year)
       DO UPDATE SET
         id = EXCLUDED.id,
         email = EXCLUDED.email,
         exam_name = EXCLUDED.exam_name,
         exam_short = EXCLUDED.exam_short,
         submitted_at = EXCLUDED.submitted_at,
         total_questions = EXCLUDED.total_questions,
         answered_count = EXCLUDED.answered_count,
         answer_known_count = EXCLUDED.answer_known_count,
         correct_count = EXCLUDED.correct_count,
         questions = EXCLUDED.questions,
         updated_at = EXCLUDED.updated_at`,
      [
        String(review.id || ''),
        String(review.userId || ''),
        String(review.email || '').toLowerCase(),
        Number(review.examId || 0),
        String(review.examName || ''),
        String(review.examShort || ''),
        Number(review.year || 0),
        String(review.submittedAt || new Date().toISOString()),
        Number(review.totalQuestions || 0),
        Number(review.answeredCount || 0),
        Number(review.answerKnownCount || 0),
        Number(review.correctCount || 0),
        JSON.stringify(Array.isArray(review.questions) ? review.questions : []),
        String(review.updatedAt || new Date().toISOString())
      ]
    )
  }

  for (const [userId, latest] of Object.entries(latestMap)) {
    await client.query(
      `INSERT INTO latest_reviews (user_id, latest, updated_at)
       VALUES ($1, $2::jsonb, $3)
       ON CONFLICT (user_id)
       DO UPDATE SET latest = EXCLUDED.latest, updated_at = EXCLUDED.updated_at`,
      [String(userId || ''), JSON.stringify(latest || {}), new Date().toISOString()]
    )
  }

  await client.query('COMMIT')
  console.log(`migrated users=${users.length} sessions=${sessions.length} reviews=${reviews.length}`)
} catch (error) {
  await client.query('ROLLBACK')
  throw error
} finally {
  client.release()
  await pool.end()
}
