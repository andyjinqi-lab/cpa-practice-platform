const USERS_KEY = 'authUsers'
const SESSION_KEY = 'authSession'
const RESET_KEY = 'passwordResetRequests'

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    return parsed ?? fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function uid() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

function createToken() {
  const random = Math.random().toString(36).slice(2)
  return `${uid().replace(/-/g, '')}${random}`
}

async function hashPassword(password) {
  if (!password) return ''
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const digest = await crypto.subtle.digest('SHA-256', data)
  const bytes = Array.from(new Uint8Array(digest))
  return bytes.map((b) => b.toString(16).padStart(2, '0')).join('')
}

async function sendResetEmail({ email, resetLink }) {
  try {
    const response = await fetch('/api/send-reset-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, resetLink })
    })
    return response.ok
  } catch {
    return false
  }
}

export async function registerWithEmail({ email, password }) {
  const normalizedEmail = normalizeEmail(email)
  const users = readJson(USERS_KEY, [])

  if (!normalizedEmail) {
    return { ok: false, message: '请输入邮箱地址' }
  }
  if (users.some((user) => user.email === normalizedEmail)) {
    return { ok: false, message: '该邮箱已注册，请直接登录' }
  }

  const passwordHash = await hashPassword(password)
  users.push({
    id: uid(),
    email: normalizedEmail,
    passwordHash,
    createdAt: new Date().toISOString()
  })
  writeJson(USERS_KEY, users)
  return { ok: true }
}

export async function loginWithEmail({ email, password }) {
  const normalizedEmail = normalizeEmail(email)
  const users = readJson(USERS_KEY, [])
  const user = users.find((item) => item.email === normalizedEmail)

  if (!user) {
    return { ok: false, message: '邮箱或密码错误' }
  }

  const passwordHash = await hashPassword(password)
  if (user.passwordHash !== passwordHash) {
    return { ok: false, message: '邮箱或密码错误' }
  }

  writeJson(SESSION_KEY, {
    userId: user.id,
    email: user.email,
    loggedAt: new Date().toISOString()
  })
  return { ok: true }
}

export function getSession() {
  return readJson(SESSION_KEY, null)
}

export function isAuthenticated() {
  return Boolean(getSession()?.email)
}

export function getSessionEmail() {
  const session = getSession()
  return normalizeEmail(session?.email || '')
}

export function getUserScopedKey(baseKey, email) {
  const normalizedEmail = normalizeEmail(email || getSessionEmail())
  return `${baseKey}:${normalizedEmail || 'guest'}`
}

export function logout() {
  localStorage.removeItem(SESSION_KEY)
}

export async function requestPasswordReset(email) {
  const normalizedEmail = normalizeEmail(email)
  const users = readJson(USERS_KEY, [])
  const user = users.find((item) => item.email === normalizedEmail)
  const commonMessage = '如果邮箱已注册，我们会发送一封重置邮件。'

  // 统一返回，防止邮箱枚举
  if (!user) {
    return { ok: true, message: commonMessage }
  }

  const token = createToken()
  const expiresAt = Date.now() + 30 * 60 * 1000
  const requests = readJson(RESET_KEY, [])
    .filter((item) => item.email !== normalizedEmail || item.used)
    .slice(0, 100)

  requests.unshift({
    id: uid(),
    email: normalizedEmail,
    token,
    used: false,
    createdAt: new Date().toISOString(),
    expiresAt
  })
  writeJson(RESET_KEY, requests)

  const origin = window.location.origin
  const resetLink = `${origin}/reset-password?token=${encodeURIComponent(token)}`
  const sent = await sendResetEmail({
    email: normalizedEmail,
    resetLink
  })

  return {
    ok: true,
    message: commonMessage,
    debugResetLink: sent ? '' : resetLink,
    delivery: sent ? 'resend' : 'debug'
  }
}

export function verifyResetToken(token) {
  const requests = readJson(RESET_KEY, [])
  const record = requests.find((item) => item.token === token)
  if (!record) {
    return { ok: false, message: '重置链接无效' }
  }
  if (record.used) {
    return { ok: false, message: '重置链接已使用，请重新申请' }
  }
  if (Date.now() > Number(record.expiresAt || 0)) {
    return { ok: false, message: '重置链接已过期，请重新申请' }
  }
  return { ok: true, email: record.email }
}

export async function resetPasswordWithToken({ token, newPassword }) {
  const tokenCheck = verifyResetToken(token)
  if (!tokenCheck.ok) return tokenCheck

  const users = readJson(USERS_KEY, [])
  const userIndex = users.findIndex((item) => item.email === tokenCheck.email)
  if (userIndex < 0) {
    return { ok: false, message: '用户不存在，请重新注册' }
  }

  users[userIndex].passwordHash = await hashPassword(newPassword)
  users[userIndex].updatedAt = new Date().toISOString()
  writeJson(USERS_KEY, users)

  const requests = readJson(RESET_KEY, []).map((item) => {
    if (item.token === token) return { ...item, used: true }
    if (item.email === tokenCheck.email) return { ...item, used: true }
    return item
  })
  writeJson(RESET_KEY, requests)

  return { ok: true, message: '密码已重置，请用新密码登录' }
}
