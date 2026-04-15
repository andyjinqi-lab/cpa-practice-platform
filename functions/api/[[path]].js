const API_ORIGIN = 'https://api-cpa.pages.dev'

export async function onRequest(context) {
  const request = context.request
  const incomingUrl = new URL(request.url)
  const targetUrl = new URL(`${API_ORIGIN}${incomingUrl.pathname}${incomingUrl.search}`)

  const headers = new Headers(request.headers)
  headers.set('host', 'api-cpa.pages.dev')

  const init = {
    method: request.method,
    headers,
    body: ['GET', 'HEAD'].includes(request.method) ? undefined : request.body,
    redirect: 'manual'
  }

  const upstream = await fetch(targetUrl.toString(), init)
  const responseHeaders = new Headers(upstream.headers)

  // Response is same-origin to Pages domain, so CORS is unnecessary here.
  responseHeaders.delete('access-control-allow-origin')
  responseHeaders.delete('access-control-allow-credentials')

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders
  })
}
