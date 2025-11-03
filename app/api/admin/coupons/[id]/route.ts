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
  const headers: Record<string, string> = { 'accept': 'application/json', 'content-type': 'application/json; charset=utf-8', ...(init.headers as any) }
  const auth = req.headers.get('authorization')
  if (auth) headers['authorization'] = auth
  const cookie = req.headers.get('cookie')
  if (cookie) headers['cookie'] = cookie
  const res = await fetch(url, { ...init, headers, redirect: 'manual' })
  const text = await res.text()
  return new Response(text, { status: res.status, headers: { 'content-type': res.headers.get('content-type') || 'application/json' } })
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => ({}))
  // Only forward fields that are expected for partial update
  const patch: any = {}
  if ('code' in body) patch.code = body.code
  if ('discountType' in body) patch.discountType = body.discountType
  if ('discount' in body) patch.discount = body.discount
  if ('expiryDate' in body) patch.expiryDate = body.expiryDate
  if ('maxUses' in body) patch.maxUses = body.maxUses
  if ('productIds' in body) patch.productIds = body.productIds
  if ('categoryIds' in body) patch.categoryIds = body.categoryIds
  if ('customerIds' in body) patch.customerIds = body.customerIds
  if ('active' in body) patch.active = body.active
  if ('global' in body) patch.global = body.global

  return forward(req, `/api/admin/coupons/${encodeURIComponent(params.id)}`, {
    method: 'PATCH',
    body: JSON.stringify(patch),
  })
}

