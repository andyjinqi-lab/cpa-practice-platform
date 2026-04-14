import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { Resend } from 'resend'
import {
  createResetRequest,
  getPracticeReviews,
  getSessionByToken,
  loginUser,
  registerUser,
  resetPassword,
  revokeSession,
  upsertPracticeReview,
  verifyResetRequest
} from './store.js'

dotenv.config()

const app = express()

const PORT = Number(process.env.PORT || 8787)
const APP_ORIGIN = process.env.APP_ORIGIN || 'http://localhost:5173'
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const MAIL_FROM = process.env.MAIL_FROM || ''
const DEFAULT_ORIGIN = APP_ORIGIN.split(',')[0].trim()
const ALLOWED_ORIGINS = APP_ORIGIN.split(',')
  .map((item) => item.trim())
  .filter(Boolean)

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || ALLOWED_ORIGINS.length === 0 || ALLOWED_ORIGINS.includes(origin)) {
        callback(null, true)
        return
      }
      callback(new Error('cors_origin_not_allowed'))
    }
  })
)
app.use(express.json({ limit: '2mb' }))

function maskEmail(email) {
  const [name, domain] = String(email || '').split('@')
  if (!name || !domain) return 'invalid-email'
  if (name.length <= 2) return `${name[0]}*@${domain}`
  return `${name.slice(0, 2)}***@${domain}`
}

function getBearerToken(req) {
  const header = String(req.headers.authorization || '')
  if (!header.startsWith('Bearer ')) return ''
  return header.slice(7).trim()
}

function safeOrigin(origin) {
  const value = String(origin || '').trim()
  return /^https?:\/\//i.test(value) ? value.replace(/\/$/, '') : DEFAULT_ORIGIN
}

async function requireAuth(req, res, next) {
  try {
    const token = getBearerToken(req)
    if (!token) {
      res.status(401).json({ ok: false, message: 'unauthorized' })
      return
    }
    const session = await getSessionByToken(token)
    if (!session) {
      res.status(401).json({ ok: false, message: 'session_expired' })
      return
    }
    req.auth = session
    req.authToken = token
    next()
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[api] auth middleware failed: ${message}`)
    res.status(500).json({ ok: false, message: 'internal_error' })
  }
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, provider: 'resend', storage: 'server-file-db' })
})

app.post('/api/auth/register', async (req, res) => {
  const { email, password } = req.body || {}
  const result = await registerUser({ email, password })
  if (!result.ok) {
    res.status(400).json(result)
    return
  }
  res.json(result)
})

app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body || {}
  const result = await loginUser({ email, password })
  if (!result.ok) {
    res.status(400).json(result)
    return
  }
  res.json(result)
})

app.get('/api/auth/session', requireAuth, async (req, res) => {
  res.json({
    ok: true,
    session: {
      token: req.authToken,
      userId: req.auth.userId,
      email: req.auth.email
    }
  })
})

app.post('/api/auth/logout', requireAuth, async (req, res) => {
  await revokeSession(req.authToken)
  res.json({ ok: true })
})

app.post('/api/auth/password/request', async (req, res) => {
  const { email, origin } = req.body || {}
  const commonMessage = '如果邮箱已注册，我们会发送一封重置邮件。'
  const request = await createResetRequest(email)
  if (!request) {
    res.json({ ok: true, message: commonMessage })
    return
  }

  const resetLink = `${safeOrigin(origin)}/reset-password?token=${encodeURIComponent(request.token)}`
  console.log(`[mail-api] reset email request: ${maskEmail(request.email)}`)

  if (!resend || !MAIL_FROM) {
    console.error('[mail-api] service not configured: missing RESEND_API_KEY or MAIL_FROM')
    res.status(500).json({ ok: false, message: 'mail_service_not_configured' })
    return
  }

  try {
    await resend.emails.send({
      from: MAIL_FROM,
      to: [request.email],
      subject: '【CPA真题平台】密码重置请求',
      text: [
        '你刚刚提交了密码重置请求。',
        '请在 30 分钟内打开下面的链接完成重置：',
        resetLink,
        '',
        '如果不是你本人操作，请忽略这封邮件。'
      ].join('\n'),
      html: `
        <div style="font-family:Arial,Helvetica,sans-serif;color:#1f2937;line-height:1.7;">
          <h2 style="margin:0 0 12px;">重置密码</h2>
          <p>你刚刚提交了密码重置请求。</p>
          <p>请在 30 分钟内点击下面的链接完成重置：</p>
          <p><a href="${resetLink}" target="_blank" rel="noreferrer">${resetLink}</a></p>
          <p>如果不是你本人操作，请忽略本邮件。</p>
        </div>
      `
    })
    console.log(`[mail-api] reset email sent: ${maskEmail(request.email)}`)
    res.json({ ok: true, message: commonMessage })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[mail-api] send reset email failed (${maskEmail(request.email)}): ${message}`)
    res.status(500).json({ ok: false, message: 'send_failed' })
  }
})

app.post('/api/auth/password/verify', async (req, res) => {
  const { token } = req.body || {}
  const result = await verifyResetRequest(token)
  if (!result.ok) {
    res.status(400).json(result)
    return
  }
  res.json(result)
})

app.post('/api/auth/password/reset', async (req, res) => {
  const { token, newPassword } = req.body || {}
  const result = await resetPassword({ token, newPassword })
  if (!result.ok) {
    res.status(400).json(result)
    return
  }
  res.json(result)
})

app.get('/api/reviews/latest', requireAuth, async (req, res) => {
  const result = await getPracticeReviews({ userId: req.auth.userId })
  res.json({ ok: true, latest: result.latest || null })
})

app.get('/api/reviews/history', requireAuth, async (req, res) => {
  const result = await getPracticeReviews({ userId: req.auth.userId })
  res.json({ ok: true, history: result.history || [] })
})

app.put('/api/reviews/latest', requireAuth, async (req, res) => {
  const review = req.body || {}
  const result = await upsertPracticeReview({
    userId: req.auth.userId,
    email: req.auth.email,
    review
  })
  if (!result.ok) {
    res.status(400).json(result)
    return
  }
  res.json({ ok: true })
})

app.post('/api/reviews/history/upsert', requireAuth, async (req, res) => {
  const review = req.body || {}
  const result = await upsertPracticeReview({
    userId: req.auth.userId,
    email: req.auth.email,
    review
  })
  if (!result.ok) {
    res.status(400).json(result)
    return
  }
  res.json({ ok: true })
})

app.listen(PORT, () => {
  if (DEFAULT_ORIGIN.includes('localhost')) {
    console.log('[mail-api] APP_ORIGIN is localhost. Links in email are for local testing only.')
  }
  console.log(`[mail-api] listening on http://localhost:${PORT}`)
})
