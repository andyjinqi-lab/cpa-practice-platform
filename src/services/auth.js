import { PUBLIC_FILING_REVIEW_MODE } from '../config/reviewMode'

const SESSION_KEY = 'authSession'
const LOCAL_REVIEW_KEY = 'publicFilingReviewData'
const TEMP_API_BASE = 'https://cpa-api-iwre.onrender.com'
const isLocalHost =
  typeof window !== 'undefined' && /^(localhost|127\.0\.0\.1)$/i.test(window.location.hostname)
const API_BASE = String(import.meta.env.VITE_API_BASE || (isLocalHost ? '' : TEMP_API_BASE)).replace(/\/$/, '')

function resolveApiUrl(path) {
  const target = String(path || '')
  if (/^https?:\/\//i.test(target)) return target
  if (!API_BASE) return target
  return `${API_BASE}${target}`
}

function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase()
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    return JSON.parse(raw) ?? fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

function clearSessionStorage() {
  localStorage.removeItem(SESSION_KEY)
}

function readLocalReviewData() {
  return readJson(LOCAL_REVIEW_KEY, { latest: null, history: [] })
}

function writeLocalReviewData(data) {
  writeJson(LOCAL_REVIEW_KEY, data)
}

function getSessionToken() {
  return String(getSession()?.token || '')
}

function getAuthHeaders(extra = {}) {
  const token = getSessionToken()
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...extra
  }
}

async function readApiResponse(response) {
  let payload = null
  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  if (!response.ok) {
    return {
      ok: false,
      message: payload?.message || '请求失败，请稍后重试'
    }
  }

  return payload || { ok: true }
}

async function apiRequest(path, options = {}) {
  try {
    const response = await fetch(resolveApiUrl(path), options)
    return await readApiResponse(response)
  } catch {
    return { ok: false, message: '网络连接失败，请稍后重试' }
  }
}

function saveSession(session) {
  writeJson(SESSION_KEY, {
    token: String(session?.token || ''),
    userId: String(session?.userId || ''),
    email: normalizeEmail(session?.email || ''),
    loggedAt: new Date().toISOString()
  })
}

export function getSession() {
  if (PUBLIC_FILING_REVIEW_MODE) return null

  const session = readJson(SESSION_KEY, null)
  if (!session?.token || !session?.email) return null
  return session
}

export function isAuthenticated() {
  if (PUBLIC_FILING_REVIEW_MODE) return true

  const session = getSession()
  return Boolean(session?.token && session?.email)
}

export function getSessionEmail() {
  return normalizeEmail(getSession()?.email || '')
}

export async function registerWithEmail({ email, password }) {
  const result = await apiRequest('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: normalizeEmail(email),
      password: String(password || '')
    })
  })

  if (!result.ok) return result
  saveSession(result.session)
  return { ok: true }
}

export async function loginWithEmail({ email, password }) {
  const result = await apiRequest('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: normalizeEmail(email),
      password: String(password || '')
    })
  })

  if (!result.ok) return result
  saveSession(result.session)
  return { ok: true }
}

export async function logout() {
  await apiRequest('/api/auth/logout', {
    method: 'POST',
    headers: getAuthHeaders()
  })
  clearSessionStorage()
}

export async function requestPasswordReset(email) {
  const result = await apiRequest('/api/auth/password/request', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email: normalizeEmail(email),
      origin: window.location.origin
    })
  })

  if (!result.ok) return result
  return {
    ok: true,
    message: result.message || '如果邮箱已注册，我们会发送一封重置邮件。',
    delivery: 'resend'
  }
}

export async function verifyResetToken(token) {
  return apiRequest('/api/auth/password/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: String(token || '') })
  })
}

export async function resetPasswordWithToken({ token, newPassword }) {
  return apiRequest('/api/auth/password/reset', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      token: String(token || ''),
      newPassword: String(newPassword || '')
    })
  })
}

export async function savePracticeReview(reviewPayload) {
  if (PUBLIC_FILING_REVIEW_MODE) {
    const data = readLocalReviewData()
    const history = Array.isArray(data.history) ? data.history : []
    const nextHistory = [
      reviewPayload,
      ...history.filter((item) => item.submittedAt !== reviewPayload.submittedAt)
    ]

    writeLocalReviewData({
      latest: reviewPayload,
      history: nextHistory
    })

    return { ok: true }
  }

  const [latestResult, historyResult] = await Promise.all([
    apiRequest('/api/reviews/latest', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(reviewPayload)
    }),
    apiRequest('/api/reviews/history/upsert', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(reviewPayload)
    })
  ])

  return { ok: Boolean(latestResult.ok && historyResult.ok) }
}

export async function fetchPracticeReviewData() {
  if (PUBLIC_FILING_REVIEW_MODE) {
    const data = readLocalReviewData()
    return {
      ok: true,
      latest: data.latest || null,
      history: Array.isArray(data.history) ? data.history : []
    }
  }

  const [latestResult, historyResult] = await Promise.all([
    apiRequest('/api/reviews/latest', {
      method: 'GET',
      headers: getAuthHeaders()
    }),
    apiRequest('/api/reviews/history', {
      method: 'GET',
      headers: getAuthHeaders()
    })
  ])

  return {
    ok: Boolean(latestResult.ok && historyResult.ok),
    latest: latestResult.ok ? latestResult.latest || null : null,
    history: historyResult.ok ? historyResult.history || [] : []
  }
}
