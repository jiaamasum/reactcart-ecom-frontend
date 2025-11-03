import { NextResponse, type NextRequest } from 'next/server'

// Mirror the API base logic used in lib/api.ts
const API_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL as string) || 'http://localhost:8080'

async function forwardWithBody(req: NextRequest, id: string, method: 'PUT' | 'PATCH') {
  const url = `${API_BASE}/api/admin/products/${encodeURIComponent(id)}`
  const upstreamHeaders: Record<string, string> = { Accept: 'application/json' }
  const auth = req.headers.get('authorization')
  if (auth) upstreamHeaders['Authorization'] = auth
  const cookie = req.headers.get('cookie')
  if (cookie) upstreamHeaders['Cookie'] = cookie
  const ct = req.headers.get('content-type')
  if (ct) upstreamHeaders['Content-Type'] = ct

  let body = ''
  try { body = await req.text() } catch {}

  try {
    const res = await fetch(url, { method, headers: upstreamHeaders, body })
    const text = await res.text().catch(() => '')
    let json: any = null
    try { json = text ? JSON.parse(text) : null } catch {}
    if (!res.ok && (!json || typeof json !== 'object')) {
      return NextResponse.json(
        { data: null, meta: null, error: { code: `UPSTREAM_${res.status}`, message: text || `${method} failed`, fields: null } },
        { status: res.status },
      )
    }
    return NextResponse.json(json ?? { data: null, meta: null, error: null }, { status: res.status })
  } catch (err: any) {
    const message = err?.message || `Upstream ${method} failed`
    return NextResponse.json(
      { data: null, meta: null, error: { code: 'UPSTREAM_ERROR', message, fields: null } },
      { status: 502 },
    )
  }
}

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id
  if (!id) {
    return NextResponse.json(
      { data: null, meta: null, error: { code: 'BAD_REQUEST', message: 'Missing product id', fields: null } },
      { status: 400 },
    )
  }
  return forwardWithBody(req, id, 'PUT')
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id
  if (!id) {
    return NextResponse.json(
      { data: null, meta: null, error: { code: 'BAD_REQUEST', message: 'Missing product id', fields: null } },
      { status: 400 },
    )
  }
  return forwardWithBody(req, id, 'PATCH')
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const id = params.id
  if (!id) {
    return NextResponse.json(
      { data: null, meta: null, error: { code: 'BAD_REQUEST', message: 'Missing product id', fields: null } },
      { status: 400 },
    )
  }

  const url = `${API_BASE}/api/admin/products/${encodeURIComponent(id)}`

  // Forward auth headers and cookies
  // For DELETE with no body, avoid setting Content-Type which can break some servers
  const upstreamHeaders: Record<string, string> = { Accept: 'application/json' }
  const auth = req.headers.get('authorization')
  if (auth) upstreamHeaders['Authorization'] = auth
  const cookie = req.headers.get('cookie')
  if (cookie) upstreamHeaders['Cookie'] = cookie

  try {
    // Primary: exact endpoint as documented (no body, no content-type)
    let res = await fetch(url, { method: 'DELETE', headers: upstreamHeaders })
    // If upstream rejects with server error or method not allowed, try tolerant fallbacks
    if (!res.ok && (res.status === 500 || res.status === 405 || res.status === 404)) {
      // Fallback #1: some backends support id as a query param
      const qp = `${API_BASE}/api/admin/products?id=${encodeURIComponent(id)}`
      const res1 = await fetch(qp, { method: 'DELETE', headers: upstreamHeaders })
      if (res1.ok) res = res1
      else {
        // Fallback #2: POST to a conventional /delete path with JSON body
        const postHeaders: Record<string, string> = { ...upstreamHeaders, 'Content-Type': 'application/json' }
        const alt = `${API_BASE}/api/admin/products/${encodeURIComponent(id)}/delete`
        const res2 = await fetch(alt, { method: 'POST', headers: postHeaders, body: JSON.stringify({ id }) })
        if (res2.ok) res = res2
        else {
          // Final fallback: POST /delete collection endpoint
          const alt2 = `${API_BASE}/api/admin/products/delete`
          const res3 = await fetch(alt2, { method: 'POST', headers: postHeaders, body: JSON.stringify({ id }) })
          if (res3.ok) res = res3
          else res = res2 // keep a failing response to surface details
        }
      }
    }

    const text = await res.text().catch(() => '')
    let json: any = null
    try { json = text ? JSON.parse(text) : null } catch {}

    // If upstream failed and didn't return a JSON envelope, synthesize one for clarity
    if (!res.ok && (!json || typeof json !== 'object')) {
      return NextResponse.json(
        { data: null, meta: null, error: { code: `UPSTREAM_${res.status}`, message: text || 'Delete failed', fields: null } },
        { status: res.status },
      )
    }

    const body = json ?? { data: null, meta: null, error: null }
    return NextResponse.json(body, { status: res.status })
  } catch (err: any) {
    const message = err?.message || 'Upstream delete failed'
    return NextResponse.json(
      { data: null, meta: null, error: { code: 'UPSTREAM_ERROR', message, fields: null } },
      { status: 502 },
    )
  }
}
