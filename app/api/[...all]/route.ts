import { NextRequest } from 'next/server'

// Generic catch‑all proxy for backend API, used by client code when
// NEXT_PUBLIC_API_BASE_URL is a different origin than the app.
// More specific routes (e.g., admin or coupons) take precedence automatically.

export const dynamic = 'force-dynamic'

function getTarget() {
  const isProd = process.env.NODE_ENV === 'production'
  const target = process.env.API_PROXY_TARGET || (!isProd ? 'http://localhost:8080' : '')
  const prefix = process.env.API_PROXY_PATH_PREFIX || ''
  return { base: target, prefix }
}

async function forward(req: NextRequest) {
  const { base, prefix } = getTarget()
  if (!base) {
    return new Response(
      JSON.stringify({ data: null, meta: null, error: { code: 'NO_BACKEND', message: 'API proxy target not configured' } }),
      { status: 502, headers: { 'content-type': 'application/json' } },
    )
  }

  const url = new URL(req.url)
  // Preserve the "/api" prefix since backend endpoints are under /api/**
  const targetUrl = `${base}${prefix}${url.pathname}${url.search}`

  const headers: Record<string, string> = {}
  // Pass through important headers
  const passHeaders = ['accept', 'content-type', 'authorization']
  for (const h of passHeaders) {
    const v = req.headers.get(h)
    if (v) headers[h] = v
  }
  // Forward cookies for all requests
  const cookie = req.headers.get('cookie')
  if (cookie) headers['cookie'] = cookie

  // Read body if present for methods that can carry a payload
  const method = req.method.toUpperCase()
  let body: BodyInit | undefined
  if (!['GET', 'HEAD'].includes(method)) {
    const contentType = req.headers.get('content-type') || ''
    if (contentType.includes('application/json')) {
      try { body = await req.text() } catch { body = undefined }
    } else {
      // For non-JSON (e.g., formdata), just forward the raw body
      try { body = await req.blob() as any } catch { body = undefined }
    }
  }

  const res = await fetch(targetUrl, { method, headers, body, redirect: 'manual' })
  const text = await res.text().catch(() => '')
  // Preserve content-type when possible
  const contentType = res.headers.get('content-type') || 'application/json'
  return new Response(text, { status: res.status, headers: { 'content-type': contentType } })
}

export async function GET(req: NextRequest) { return forward(req) }
export async function POST(req: NextRequest) { return forward(req) }
export async function PUT(req: NextRequest) { return forward(req) }
export async function PATCH(req: NextRequest) { return forward(req) }
export async function DELETE(req: NextRequest) { return forward(req) }
export async function OPTIONS(req: NextRequest) { return forward(req) }
