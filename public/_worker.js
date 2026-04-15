// Use domain over HTTP for origin fetch in Pages Worker.
// This avoids direct-IP fetch restrictions (Cloudflare error 1003).
const API_ORIGIN = 'http://cpa.afinance.site'

function buildUpstreamUrl(requestUrl) {
  const url = new URL(requestUrl)
  return `${API_ORIGIN}${url.pathname}${url.search}`
}

function stripCors(headers) {
  const next = new Headers(headers)
  next.delete('access-control-allow-origin')
  next.delete('access-control-allow-credentials')
  return next
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url)

    if (url.pathname.startsWith('/api/')) {
      const upstream = await fetch(buildUpstreamUrl(request.url), {
        method: request.method,
        headers: request.headers,
        body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
        redirect: 'manual'
      })

      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: stripCors(upstream.headers)
      })
    }

    return env.ASSETS.fetch(request)
  }
}
