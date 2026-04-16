import crypto from 'crypto'
import { Pool } from 'pg'

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
const RESET_TTL_MS = 30 * 60 * 1000

const DATABASE_URL = String(process.env.DATABASE_URL || '').trim()
if (!DATABASE_URL) {
  throw new Error('DATABASE_URL is required. Please configure PostgreSQL before starting the API.')
}

const useSsl = !/(localhost|127\.0\.0\.1)/i.test(DATABASE_URL)
const pool = new Pool({
  connectionString: DATABASE_URL,
  ssl: useSsl ? { rejectUnauthorized: false } : false
})

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function nowIso() {
  return new Date().toISOString()
}

function uid() {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function makeToken() {
  return `${uid().replaceAll('-', '')}${Math.random().toString(36).slice(2)}`
}

function hashPassword(password, salt = crypto.randomBytes(16).toString('hex')) {
  const digest = crypto.pbkdf2Sync(String(password || ''), salt, 120000, 32, 'sha256').toString('hex')
  return `pbkdf2$${salt}$${digest}`
}

function verifyPassword(password, encoded) {
  const [algo, salt, expected] = String(encoded || '').split('$')
  if (algo !== 'pbkdf2' || !salt || !expected) return false
  const digest = crypto.pbkdf2Sync(String(password || ''), salt, 120000, 32, 'sha256').toString('hex')
  return crypto.timingSafeEqual(Buffer.from(digest), Buffer.from(expected))
}

function normalizeReviewPayload(payload) {
  const questions = Array.isArray(payload?.questions) ? payload.questions : []
  return {
    examId: Number(payload?.examId || 0),
    examName: String(payload?.examName || ''),
    examShort: String(payload?.examShort || ''),
    year: Number(payload?.year || 0),
    submittedAt: String(payload?.submittedAt || nowIso()),
    totalQuestions: Number(payload?.totalQuestions || questions.length),
    answeredCount: Number(payload?.answeredCount || 0),
    answerKnownCount: Number(payload?.answerKnownCount || 0),
    correctCount: Number(payload?.correctCount || 0),
    questions
  }
}

function rowToReview(row) {
  if (!row) return null
  return {
    examId: Number(row.exam_id || 0),
    examName: String(row.exam_name || ''),
    examShort: String(row.exam_short || ''),
    year: Number(row.year || 0),
    submittedAt: String(row.submitted_at || nowIso()),
    totalQuestions: Number(row.total_questions || 0),
    answeredCount: Number(row.answered_count || 0),
    answerKnownCount: Number(row.answer_known_count || 0),
    correctCount: Number(row.correct_count || 0),
    questions: Array.isArray(row.questions) ? row.questions : []
  }
}

async function cleanupState(client) {
  const now = Date.now()
  await client.query('DELETE FROM sessions WHERE expires_at <= $1', [now])
  await client.query('DELETE FROM password_resets WHERE used = TRUE OR expires_at <= $1', [now])
}

export async function registerUser({ email, password }) {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return { ok: false, message: 'email_required' }
  if (String(password || '').length < 8) return { ok: false, message: 'password_too_short' }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await cleanupState(client)

    const exists = await client.query('SELECT 1 FROM users WHERE email = $1 LIMIT 1', [normalizedEmail])
    if (exists.rowCount) {
      await client.query('ROLLBACK')
      return { ok: false, message: 'email_exists' }
    }

    const now = nowIso()
    const userId = uid()
    await client.query(
      `INSERT INTO users (id, email, password_hash, created_at, updated_at)
       VALUES ($1, $2, $3, $4, $4)`,
      [userId, normalizedEmail, hashPassword(password), now]
    )

    const sessionToken = makeToken()
    await client.query(
      `INSERT INTO sessions (token, user_id, email, created_at, updated_at, expires_at)
       VALUES ($1, $2, $3, $4, $4, $5)`,
      [sessionToken, userId, normalizedEmail, now, Date.now() + SESSION_TTL_MS]
    )

    await client.query('COMMIT')
    return {
      ok: true,
      session: { token: sessionToken, userId, email: normalizedEmail }
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function loginUser({ email, password }) {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail || !password) return { ok: false, message: 'invalid_credentials' }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await cleanupState(client)

    const userResult = await client.query('SELECT id, email, password_hash FROM users WHERE email = $1 LIMIT 1', [
      normalizedEmail
    ])
    const user = userResult.rows[0]
    if (!user || !verifyPassword(password, user.password_hash)) {
      await client.query('ROLLBACK')
      return { ok: false, message: 'invalid_credentials' }
    }

    await client.query('DELETE FROM sessions WHERE user_id = $1 AND email = $2', [user.id, user.email])
    const now = nowIso()
    const token = makeToken()
    await client.query(
      `INSERT INTO sessions (token, user_id, email, created_at, updated_at, expires_at)
       VALUES ($1, $2, $3, $4, $4, $5)`,
      [token, user.id, user.email, now, Date.now() + SESSION_TTL_MS]
    )

    await client.query('COMMIT')
    return {
      ok: true,
      session: { token, userId: user.id, email: user.email }
    }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function getSessionByToken(token) {
  const safeToken = String(token || '').trim()
  if (!safeToken) return null

  const client = await pool.connect()
  try {
    await cleanupState(client)
    const result = await client.query('SELECT token, user_id, email FROM sessions WHERE token = $1 LIMIT 1', [
      safeToken
    ])
    const session = result.rows[0]
    if (!session) return null
    await client.query('UPDATE sessions SET updated_at = $2 WHERE token = $1', [safeToken, nowIso()])
    return { token: session.token, userId: session.user_id, email: session.email }
  } finally {
    client.release()
  }
}

export async function revokeSession(token) {
  const safeToken = String(token || '').trim()
  if (!safeToken) return
  await pool.query('DELETE FROM sessions WHERE token = $1', [safeToken])
}

export async function createResetRequest(email) {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return null

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await cleanupState(client)

    const userResult = await client.query('SELECT id, email FROM users WHERE email = $1 LIMIT 1', [normalizedEmail])
    const user = userResult.rows[0]
    if (!user) {
      await client.query('ROLLBACK')
      return null
    }

    const token = makeToken()
    await client.query('DELETE FROM password_resets WHERE email = $1', [normalizedEmail])
    await client.query(
      `INSERT INTO password_resets (id, user_id, email, token, used, created_at, expires_at)
       VALUES ($1, $2, $3, $4, FALSE, $5, $6)`,
      [uid(), user.id, user.email, token, nowIso(), Date.now() + RESET_TTL_MS]
    )

    await client.query('COMMIT')
    return { token, email: user.email }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function verifyResetRequest(token) {
  const safeToken = String(token || '').trim()
  if (!safeToken) return { ok: false, message: 'invalid_reset_token' }

  const client = await pool.connect()
  try {
    await cleanupState(client)
    const result = await client.query(
      'SELECT email, used, expires_at FROM password_resets WHERE token = $1 LIMIT 1',
      [safeToken]
    )
    const request = result.rows[0]
    if (!request) return { ok: false, message: 'invalid_reset_token' }
    if (request.used) return { ok: false, message: 'reset_token_used' }
    if (Number(request.expires_at || 0) <= Date.now()) return { ok: false, message: 'reset_token_expired' }
    return { ok: true, email: request.email }
  } finally {
    client.release()
  }
}

export async function resetPassword({ token, newPassword }) {
  if (String(newPassword || '').length < 8) return { ok: false, message: 'password_too_short' }
  const safeToken = String(token || '').trim()
  if (!safeToken) return { ok: false, message: 'invalid_reset_token' }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await cleanupState(client)

    const requestResult = await client.query(
      'SELECT email, used, expires_at FROM password_resets WHERE token = $1 LIMIT 1',
      [safeToken]
    )
    const request = requestResult.rows[0]
    if (!request || request.used) {
      await client.query('ROLLBACK')
      return { ok: false, message: 'invalid_reset_token' }
    }
    if (Number(request.expires_at || 0) <= Date.now()) {
      await client.query('ROLLBACK')
      return { ok: false, message: 'reset_token_expired' }
    }

    const userResult = await client.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [request.email])
    if (!userResult.rowCount) {
      await client.query('ROLLBACK')
      return { ok: false, message: 'user_not_found' }
    }

    await client.query('UPDATE users SET password_hash = $2, updated_at = $3 WHERE email = $1', [
      request.email,
      hashPassword(newPassword),
      nowIso()
    ])
    await client.query('UPDATE password_resets SET used = TRUE WHERE token = $1 OR email = $2', [
      safeToken,
      request.email
    ])

    await client.query('COMMIT')
    return { ok: true, message: 'password_reset_success' }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function upsertPracticeReview({ userId, email, review }) {
  const normalized = normalizeReviewPayload(review)
  if (!normalized.examId || !normalized.year) return { ok: false, message: 'invalid_review_payload' }

  const client = await pool.connect()
  try {
    await client.query('BEGIN')
    await cleanupState(client)

    const now = nowIso()
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
        uid(),
        userId,
        email,
        normalized.examId,
        normalized.examName,
        normalized.examShort,
        normalized.year,
        normalized.submittedAt,
        normalized.totalQuestions,
        normalized.answeredCount,
        normalized.answerKnownCount,
        normalized.correctCount,
        JSON.stringify(normalized.questions || []),
        now
      ]
    )

    await client.query(
      `INSERT INTO latest_reviews (user_id, latest, updated_at)
       VALUES ($1, $2::jsonb, $3)
       ON CONFLICT (user_id)
       DO UPDATE SET latest = EXCLUDED.latest, updated_at = EXCLUDED.updated_at`,
      [userId, JSON.stringify(normalized), now]
    )

    await client.query('COMMIT')
    return { ok: true }
  } catch (error) {
    await client.query('ROLLBACK')
    throw error
  } finally {
    client.release()
  }
}

export async function getPracticeReviews({ userId }) {
  const client = await pool.connect()
  try {
    await cleanupState(client)
    const historyResult = await client.query(
      `SELECT exam_id, exam_name, exam_short, year, submitted_at, total_questions, answered_count,
              answer_known_count, correct_count, questions
       FROM practice_reviews
       WHERE user_id = $1
       ORDER BY submitted_at DESC
       LIMIT 120`,
      [userId]
    )

    const history = historyResult.rows.map(rowToReview)
    const latestResult = await client.query('SELECT latest FROM latest_reviews WHERE user_id = $1 LIMIT 1', [userId])
    const latest = latestResult.rows[0]?.latest || history[0] || null
    return { latest, history }
  } finally {
    client.release()
  }
}
