import cors from 'cors'
import dotenv from 'dotenv'
import express from 'express'
import { Resend } from 'resend'

dotenv.config()

const app = express()

const PORT = Number(process.env.PORT || 8787)
const APP_ORIGIN = process.env.APP_ORIGIN || 'http://localhost:5173'
const RESEND_API_KEY = process.env.RESEND_API_KEY || ''
const MAIL_FROM = process.env.MAIL_FROM || ''

const resend = RESEND_API_KEY ? new Resend(RESEND_API_KEY) : null

app.use(cors({ origin: APP_ORIGIN }))
app.use(express.json())

function maskEmail(email) {
  const [name, domain] = String(email || '').split('@')
  if (!name || !domain) return 'invalid-email'
  if (name.length <= 2) return `${name[0]}*@${domain}`
  return `${name.slice(0, 2)}***@${domain}`
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, provider: 'resend' })
})

app.post('/api/send-reset-email', async (req, res) => {
  const { email, resetLink } = req.body || {}

  if (!email || !resetLink) {
    console.warn('[mail-api] invalid payload for send-reset-email')
    res.status(400).json({ ok: false, message: 'missing_email_or_link' })
    return
  }

  console.log(`[mail-api] reset email request: ${maskEmail(email)}`)

  if (!resend || !MAIL_FROM) {
    console.error('[mail-api] service not configured: missing RESEND_API_KEY or MAIL_FROM')
    res.status(500).json({ ok: false, message: 'mail_service_not_configured' })
    return
  }

  try {
    await resend.emails.send({
      from: MAIL_FROM,
      to: [email],
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

    console.log(`[mail-api] reset email sent: ${maskEmail(email)}`)
    res.json({ ok: true })
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[mail-api] send reset email failed (${maskEmail(email)}): ${message}`)
    res.status(500).json({ ok: false, message: 'send_failed' })
  }
})

app.listen(PORT, () => {
  if (APP_ORIGIN.includes('localhost')) {
    console.log('[mail-api] APP_ORIGIN is localhost. Links in email are for local testing only.')
  }
  console.log(`[mail-api] listening on http://localhost:${PORT}`)
})
