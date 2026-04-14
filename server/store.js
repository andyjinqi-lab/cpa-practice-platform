import crypto from 'crypto'
import fs from 'fs/promises'
import path from 'path'

const DATA_DIR = process.env.DATA_DIR || path.resolve(process.cwd(), 'server', 'data')
const DATA_FILE = path.join(DATA_DIR, 'app-db.json')
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
const RESET_TTL_MS = 30 * 60 * 1000

const EMPTY_DATA = {
  users: [],
  sessions: [],
  passwordResets: [],
  practiceReviews: [],
  latestReviews: {}
}

let loaded = false
let state = structuredClone(EMPTY_DATA)
let writeQueue = Promise.resolve()

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

async function loadState() {
  if (loaded) return

  await fs.mkdir(DATA_DIR, { recursive: true })

  try {
    const raw = await fs.readFile(DATA_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    state = {
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      passwordResets: Array.isArray(parsed.passwordResets) ? parsed.passwordResets : [],
      practiceReviews: Array.isArray(parsed.practiceReviews) ? parsed.practiceReviews : [],
      latestReviews: parsed.latestReviews && typeof parsed.latestReviews === 'object' ? parsed.latestReviews : {}
    }
  } catch {
    state = structuredClone(EMPTY_DATA)
    await fs.writeFile(DATA_FILE, JSON.stringify(state, null, 2))
  }

  loaded = true
}

function queueWrite() {
  writeQueue = writeQueue.then(() => fs.writeFile(DATA_FILE, JSON.stringify(state, null, 2)))
  return writeQueue
}

function cleanupState() {
  const now = Date.now()
  state.sessions = state.sessions.filter((item) => Number(item.expiresAt || 0) > now)
  state.passwordResets = state.passwordResets
    .filter((item) => !item.used && Number(item.expiresAt || 0) > now)
    .slice(0, 500)
  state.practiceReviews = state.practiceReviews.slice(0, 4000)
}

async function mutateState(mutator) {
  await loadState()
  const result = mutator()
  cleanupState()
  await queueWrite()
  return result
}

async function readState(reader) {
  await loadState()
  return reader()
}

export async function registerUser({ email, password }) {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return { ok: false, message: '请输入邮箱地址' }
  if (String(password || '').length < 8) return { ok: false, message: '密码至少 8 位' }

  return mutateState(() => {
    if (state.users.some((item) => item.email === normalizedEmail)) {
      return { ok: false, message: '该邮箱已注册，请直接登录' }
    }

    const now = nowIso()
    const user = {
      id: uid(),
      email: normalizedEmail,
      passwordHash: hashPassword(password),
      createdAt: now,
      updatedAt: now
    }
    state.users.push(user)

    const sessionToken = makeToken()
    const session = {
      token: sessionToken,
      userId: user.id,
      email: user.email,
      createdAt: now,
      updatedAt: now,
      expiresAt: Date.now() + SESSION_TTL_MS
    }
    state.sessions.push(session)

    return {
      ok: true,
      session: { token: sessionToken, userId: user.id, email: user.email }
    }
  })
}

export async function loginUser({ email, password }) {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail || !password) return { ok: false, message: '邮箱或密码错误' }

  return mutateState(() => {
    const user = state.users.find((item) => item.email === normalizedEmail)
    if (!user) return { ok: false, message: '邮箱或密码错误' }
    if (!verifyPassword(password, user.passwordHash)) return { ok: false, message: '邮箱或密码错误' }

    state.sessions = state.sessions.filter((item) => !(item.userId === user.id && item.email === user.email))
    const now = nowIso()
    const token = makeToken()
    state.sessions.push({
      token,
      userId: user.id,
      email: user.email,
      createdAt: now,
      updatedAt: now,
      expiresAt: Date.now() + SESSION_TTL_MS
    })

    return {
      ok: true,
      session: { token, userId: user.id, email: user.email }
    }
  })
}

export async function getSessionByToken(token) {
  const safeToken = String(token || '').trim()
  if (!safeToken) return null

  return mutateState(() => {
    const session = state.sessions.find((item) => item.token === safeToken)
    if (!session) return null
    if (Number(session.expiresAt || 0) <= Date.now()) {
      state.sessions = state.sessions.filter((item) => item.token !== safeToken)
      return null
    }
    session.updatedAt = nowIso()
    return { token: session.token, userId: session.userId, email: session.email }
  })
}

export async function revokeSession(token) {
  const safeToken = String(token || '').trim()
  if (!safeToken) return
  await mutateState(() => {
    state.sessions = state.sessions.filter((item) => item.token !== safeToken)
  })
}

export async function createResetRequest(email) {
  const normalizedEmail = normalizeEmail(email)
  if (!normalizedEmail) return null

  return mutateState(() => {
    const user = state.users.find((item) => item.email === normalizedEmail)
    if (!user) return null

    const token = makeToken()
    state.passwordResets = state.passwordResets.filter((item) => item.email !== normalizedEmail)
    state.passwordResets.unshift({
      id: uid(),
      userId: user.id,
      email: user.email,
      token,
      used: false,
      createdAt: nowIso(),
      expiresAt: Date.now() + RESET_TTL_MS
    })
    return { token, email: user.email }
  })
}

export async function verifyResetRequest(token) {
  const safeToken = String(token || '').trim()
  if (!safeToken) return { ok: false, message: '重置链接无效' }

  return readState(() => {
    const request = state.passwordResets.find((item) => item.token === safeToken)
    if (!request) return { ok: false, message: '重置链接无效' }
    if (request.used) return { ok: false, message: '重置链接已使用，请重新申请' }
    if (Number(request.expiresAt || 0) <= Date.now()) return { ok: false, message: '重置链接已过期，请重新申请' }
    return { ok: true, email: request.email }
  })
}

export async function resetPassword({ token, newPassword }) {
  if (String(newPassword || '').length < 8) return { ok: false, message: '新密码至少 8 位' }
  const safeToken = String(token || '').trim()
  if (!safeToken) return { ok: false, message: '重置链接无效' }

  return mutateState(() => {
    const request = state.passwordResets.find((item) => item.token === safeToken)
    if (!request || request.used) return { ok: false, message: '重置链接无效或已使用' }
    if (Number(request.expiresAt || 0) <= Date.now()) return { ok: false, message: '重置链接已过期，请重新申请' }

    const user = state.users.find((item) => item.email === request.email)
    if (!user) return { ok: false, message: '用户不存在，请重新注册' }

    user.passwordHash = hashPassword(newPassword)
    user.updatedAt = nowIso()

    state.passwordResets = state.passwordResets.map((item) => {
      if (item.token === safeToken || item.email === request.email) return { ...item, used: true }
      return item
    })

    return { ok: true, message: '密码已重置，请用新密码登录' }
  })
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

export async function upsertPracticeReview({ userId, email, review }) {
  const normalized = normalizeReviewPayload(review)
  if (!normalized.examId || !normalized.year) return { ok: false, message: 'invalid_review_payload' }

  return mutateState(() => {
    state.practiceReviews = state.practiceReviews.filter(
      (item) => !(item.userId === userId && item.examId === normalized.examId && item.year === normalized.year)
    )
    state.practiceReviews.unshift({
      ...normalized,
      id: uid(),
      userId,
      email,
      updatedAt: nowIso()
    })

    state.latestReviews[userId] = normalized
    return { ok: true }
  })
}

export async function getPracticeReviews({ userId }) {
  return readState(() => {
    const history = state.practiceReviews
      .filter((item) => item.userId === userId)
      .sort((a, b) => new Date(b.submittedAt).getTime() - new Date(a.submittedAt).getTime())
      .slice(0, 120)

    const latest = state.latestReviews[userId] || history[0] || null
    return { latest, history }
  })
}
