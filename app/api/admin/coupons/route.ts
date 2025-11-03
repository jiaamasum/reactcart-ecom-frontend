import { NextRequest } from "next/server"

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

export async function GET(req: NextRequest) {
  const { search } = new URL(req.url)
  return forward(req, `/api/admin/coupons${search}`, { method: 'GET' })
}

export async function POST(req: NextRequest) {
  // Read client payload and sanitize to match docs/admin-coupons.md
  const body = await req.json().catch(() => ({}))
  const payload: any = {}
  if (typeof body.code === 'string') payload.code = String(body.code).toUpperCase()
  if (body.discountType === 'PERCENT' || body.discountType === 'FIXED') payload.discountType = body.discountType
  if (typeof body.discount === 'number') payload.discount = body.discount
  if (typeof body.maxUses === 'number' && isFinite(body.maxUses) && body.maxUses > 0) payload.maxUses = Math.floor(body.maxUses)

  const toSecs = (v: any): string | undefined => {
    if (!v || typeof v !== 'string') return undefined
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) return `${v}:00`
    if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(v)) return v
    const d = new Date(v)
    if (!isNaN(d.getTime())) {
      const pad = (n: number) => String(n).padStart(2, '0')
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
    }
    return undefined
  }
  const exp = toSecs(body.expiryDate)
  if (exp) payload.expiryDate = exp

  const addOne = (key: 'productIds'|'categoryIds'|'customerIds') => {
    const arr = Array.isArray(body[key]) ? body[key].filter((x: any) => typeof x === 'string' && x.trim()) : []
    if (arr.length) payload[key] = arr.slice(0, 50) // safety cap
  }

  // Only one assignment type allowed — choose the first provided, in priority order
  if (Array.isArray(body.productIds) && body.productIds.length) addOne('productIds')
  else if (Array.isArray(body.categoryIds) && body.categoryIds.length) addOne('categoryIds')
  else if (Array.isArray(body.customerIds) && body.customerIds.length) addOne('customerIds')
  // If none included, leave all three undefined to create GLOBAL coupon

  // Forward to backend; retry with compatible variants if backend responds 500
  const trySend = async (p: any) => {
    return forward(req, '/api/admin/coupons', { method: 'POST', body: JSON.stringify(p), headers: { 'content-type': 'application/json; charset=utf-8' } })
  }

  let res = await trySend(payload)
  if (res.status === 500) {
    const variants: any[] = []
    const base = { ...payload }
    // Date variants
    if (base.expiryDate && typeof base.expiryDate === 'string') {
      if (!/Z$/.test(base.expiryDate)) variants.push({ ...base, expiryDate: `${base.expiryDate}Z` })
      try {
        const d = new Date(base.expiryDate)
        if (!isNaN(d.getTime())) variants.push({ ...base, expiryDate: d.toISOString() })
      } catch {}
    }
    // Explicit active flag
    variants.push({ ...base, active: true })
    // Singular id fallbacks (productId/categoryId/customerId)
    if (Array.isArray(base.productIds) && base.productIds.length === 1) variants.push({ ...base, productId: base.productIds[0], productIds: undefined })
    if (Array.isArray(base.categoryIds) && base.categoryIds.length === 1) variants.push({ ...base, categoryId: base.categoryIds[0], categoryIds: undefined })
    if (Array.isArray(base.customerIds) && base.customerIds.length === 1) variants.push({ ...base, customerId: base.customerIds[0], customerIds: undefined })
    // Array of objects variants [{id: ...}]
    const toObjArr = (arr: any[]) => arr.map((x) => (typeof x === 'object' ? x : { id: x }))
    if (Array.isArray(base.productIds)) variants.push({ ...base, productIds: toObjArr(base.productIds) })
    if (Array.isArray(base.categoryIds)) variants.push({ ...base, categoryIds: toObjArr(base.categoryIds) })
    if (Array.isArray(base.customerIds)) variants.push({ ...base, customerIds: toObjArr(base.customerIds) })
    // Numeric ids variants
    const toNumArr = (arr: any[]) => arr.map((x) => (Number.isFinite(Number(x)) ? Number(x) : x))
    if (Array.isArray(base.productIds)) variants.push({ ...base, productIds: toNumArr(base.productIds) })
    if (Array.isArray(base.categoryIds)) variants.push({ ...base, categoryIds: toNumArr(base.categoryIds) })
    if (Array.isArray(base.customerIds)) variants.push({ ...base, customerIds: toNumArr(base.customerIds) })
    // Remove maxUses entirely
    if (Object.prototype.hasOwnProperty.call(base, 'maxUses')) variants.push({ ...base, maxUses: undefined })
    for (const v of variants) {
      const r = await trySend(v)
      if (r.status !== 500) return r
    }
  }
  return res
}
