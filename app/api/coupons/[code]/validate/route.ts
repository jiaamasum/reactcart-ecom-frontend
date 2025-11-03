import { NextRequest } from 'next/server'

const getTarget = () => {
  const isProd = process.env.NODE_ENV === 'production'
  const target = process.env.API_PROXY_TARGET || (!isProd ? 'http://localhost:8080' : '')
  const prefix = process.env.API_PROXY_PATH_PREFIX || ''
  return { base: target, prefix }
}

async function forward(req: NextRequest, path: string, init: RequestInit) {
  const { base, prefix } = getTarget()
  if (!base) return new Response(JSON.stringify({ data: null, meta: null, error: { code: 'NO_BACKEND', message: 'API proxy target not configured' } }), { status: 502, headers: { 'content-type': 'application/json' } })
  const url = `${base}${prefix}${path}`
  const headers: Record<string, string> = { 'accept': 'application/json', ...(init.headers as any) }
  const res = await fetch(url, { ...init, headers, redirect: 'manual' })
  const text = await res.text()
  return new Response(text, { status: res.status, headers: { 'content-type': res.headers.get('content-type') || 'application/json' } })
}

export async function GET(req: NextRequest, { params }: { params: { code: string } }) {
  const { search } = new URL(req.url)
  return forward(req, `/api/coupons/${encodeURIComponent(params.code)}/validate${search}`, { method: 'GET' })
}

