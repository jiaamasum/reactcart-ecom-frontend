// API client for auth + user details against external backend per docs/auth-and-user-details.md
export type ApiEnvelope<T> = { data?: T; meta?: any; error?: { code?: string; message?: string; fields?: Record<string, string> } }

const API_BASE = (typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_API_BASE_URL) || 'http://localhost:8080'
const LOCAL_FALLBACK = typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_ENABLE_LOCAL_FALLBACK === 'true'

// Decide whether to call via same-origin proxy (to avoid CORS) or direct.
// - Auto-enable proxy if the API base is a different origin than the browser origin.
// - Can be overridden with NEXT_PUBLIC_USE_API_PROXY=true
let USE_PROXY = false
try {
  const envVal = typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_USE_API_PROXY
  if (envVal === 'true') {
    USE_PROXY = true
  } else if (envVal === 'false') {
    USE_PROXY = false
  } else if (typeof window !== 'undefined') {
    const apiOrigin = new URL(API_BASE).origin
    USE_PROXY = window.location.origin !== apiOrigin
  }
} catch {}

function url(path: string) {
  return USE_PROXY ? path : `${API_BASE}${path}`
}
function absUrl(path: string) { return `${API_BASE}${path}` }

// Access token persistence: keep in-memory and mirror to localStorage so refreshes stay authenticated
let accessTokenMemory: string | null = null
const TOKEN_STORAGE_KEY = 'RC_ACCESS_TOKEN'
// Try to hydrate from localStorage at module load (browser only)
if (typeof window !== 'undefined') {
  try {
    const t = window.localStorage.getItem(TOKEN_STORAGE_KEY)
    if (t) accessTokenMemory = t
  } catch {}
}

type FetchOpts = RequestInit & { withCredentials?: boolean; auth?: boolean }

export async function apiFetch<T>(path: string, init?: FetchOpts): Promise<T> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(init?.headers as any),
  }
  const hasBody = init && (init as any).body != null
  const isForm = hasBody && typeof FormData !== 'undefined' && (init as any).body instanceof FormData
  if (hasBody && !isForm) headers['Content-Type'] = 'application/json'

  // Add Authorization header if we have a token and auth isn't explicitly disabled
  const useAuth = init?.auth !== false
  // Lazy-hydrate token from localStorage if needed (browser only)
  if (useAuth && !accessTokenMemory && typeof window !== 'undefined') {
    try { accessTokenMemory = window.localStorage.getItem(TOKEN_STORAGE_KEY) } catch {}
  }
  if (useAuth && accessTokenMemory) headers['Authorization'] = `Bearer ${accessTokenMemory}`

  // Strip our custom options before passing to fetch to avoid TS excess-property errors
  const { withCredentials, auth: _auth, headers: _headersIgnored, ...rest } = (init || {})

  async function doFetch(target: string) {
    return fetch(target, {
      ...rest,
      headers,
      credentials: (withCredentials || useAuth) ? 'include' : undefined,
      mode: (target.startsWith('http') && !target.startsWith((typeof window !== 'undefined' ? window.location.origin : ''))) ? 'cors' : undefined,
    })
  }

  let res: Response
  try {
    res = await doFetch(url(path))
  } catch (err) {
    // Network/CORS failure. Retry via proxy path if not already using it.
    if (!USE_PROXY) {
      res = await doFetch(path)
    } else {
      throw err
    }
  }
  if (!res.ok) {
    let message = `Request failed: ${res.status}`
    let code: string | undefined
    let fields: Record<string, string> | undefined
    try {
      const txt = await res.text()
      try {
        const parsed = JSON.parse(txt)
        if (parsed?.error) {
          code = parsed.error.code
          if (parsed.error.message) message = parsed.error.message
          if (parsed.error.fields) fields = parsed.error.fields
        }
      } catch {
        if (txt) message = `${message}`
      }
    } catch {}
    const err = new Error(message) as Error & { status?: number; code?: string; fields?: Record<string, string> }
    err.status = res.status
    err.code = code
    err.fields = fields
    // Surface details for debugging without breaking UI
    if (typeof window !== 'undefined') {
      // Avoid dev overlay noise for handled API errors
      // eslint-disable-next-line no-console
      console.warn('API error', { path, status: res.status, code, fields, message })
    }
    throw err
  }
  if (res.status === 204) return undefined as unknown as T
  let text = ''
  try { text = await res.text() } catch {}
  if (!text) return undefined as unknown as T
  let json: any
  try { json = JSON.parse(text) } catch { return undefined as unknown as T }
  return (json?.data ?? json) as T
}

// Low-level variant that returns the full envelope (data, meta, error)
export async function apiFetchEnvelope(path: string, init?: FetchOpts): Promise<ApiEnvelope<any>> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    ...(init?.headers as any),
  }
  const hasBody = init && (init as any).body != null
  const isForm = hasBody && typeof FormData !== 'undefined' && (init as any).body instanceof FormData
  if (hasBody && !isForm) headers['Content-Type'] = 'application/json'

  const useAuth = init?.auth !== false
  if (useAuth && !accessTokenMemory && typeof window !== 'undefined') {
    try { accessTokenMemory = window.localStorage.getItem(TOKEN_STORAGE_KEY) } catch {}
  }
  if (useAuth && accessTokenMemory) headers['Authorization'] = `Bearer ${accessTokenMemory}`

  const { withCredentials, auth: _auth, headers: _headersIgnored, ...rest } = (init || {})

  async function doFetch(target: string) {
    return fetch(target, {
      ...rest,
      headers,
      credentials: (withCredentials || (init?.auth !== false)) ? 'include' : undefined,
      mode: (target.startsWith('http') && !target.startsWith((typeof window !== 'undefined' ? window.location.origin : ''))) ? 'cors' : undefined,
    })
  }

  let res: Response
  try {
    res = await doFetch(url(path))
  } catch (err) {
    if (!USE_PROXY) {
      res = await doFetch(path)
    } else {
      throw err
    }
  }

  let text = ''
  try { text = await res.text() } catch {}
  let json: any = undefined
  try { json = text ? JSON.parse(text) : undefined } catch {}

  if (!res.ok) {
    const message = json?.error?.message || `Request failed: ${res.status}`
    const err = new Error(message) as Error & { status?: number; code?: string; fields?: Record<string, string> }
    err.status = res.status
    err.code = json?.error?.code
    err.fields = json?.error?.fields
    if (typeof window !== 'undefined') {
      // eslint-disable-next-line no-console
      console.warn('API error', { path, status: res.status, code: err.code, fields: err.fields, message })
    }
    throw err
  }
  return (json ?? { data: undefined, meta: null, error: null }) as ApiEnvelope<any>
}

export interface ApiUser {
  id: string
  email: string
  name: string
  role: 'ADMIN' | 'CUSTOMER'
  banned?: boolean
  isBanned?: boolean
  profileImageUrl?: string
  phone?: string
  address?: string
  createdAt?: string
  updatedAt?: string
}

function normalizeRole(role: ApiUser['role']): 'admin' | 'customer' {
  return role === 'ADMIN' ? 'admin' : 'customer'
}

// ----- Admin Settings API -----
export interface AdminStoreSettings {
  storeName: string
  storeDescription?: string
  storeEmail: string
  storePhone: string
  storeAddress: string
}

export interface AdminSeoSettings {
  metaTitle: string
  metaDescription?: string
  metaKeywords?: string
  ogImageUrl?: string
}

export interface AdminCurrencySettings { defaultCurrency: string }

export async function apiGetAdminStoreSettings(): Promise<AdminStoreSettings> {
  return apiFetch<AdminStoreSettings>('/api/admin/settings/store', { method: 'GET' })
}

export async function apiUpdateAdminStoreSettings(payload: AdminStoreSettings): Promise<AdminStoreSettings> {
  return apiFetch<AdminStoreSettings>('/api/admin/settings/store', { method: 'PUT', body: JSON.stringify(payload) })
}

export async function apiGetAdminSeoSettings(): Promise<AdminSeoSettings> {
  return apiFetch<AdminSeoSettings>('/api/admin/settings/seo', { method: 'GET' })
}

export async function apiUpdateAdminSeoSettings(payload: AdminSeoSettings): Promise<AdminSeoSettings> {
  return apiFetch<AdminSeoSettings>('/api/admin/settings/seo', { method: 'PUT', body: JSON.stringify(payload) })
}

export async function apiGetAdminCurrencySettings(): Promise<AdminCurrencySettings> {
  return apiFetch<AdminCurrencySettings>('/api/admin/settings/currency', { method: 'GET' })
}

export async function apiUpdateAdminCurrencySettings(payload: AdminCurrencySettings): Promise<AdminCurrencySettings> {
  return apiFetch<AdminCurrencySettings>('/api/admin/settings/currency', { method: 'PUT', body: JSON.stringify(payload) })
}

// ----- Products & Categories API -----
export interface ProductSummary {
  id: string
  name: string
  description: string
  categoryId: string
  categoryName: string
  price: number
  discountedPrice?: number
  discount?: number
  stock: number
  primaryImageUrl?: string
}

export interface ProductDetail extends ProductSummary {
  images?: string[]
}

export interface Category {
  id: string
  name: string
  slug: string
  productsCount?: number
}

export async function apiGetProducts(params?: { search?: string; categoryId?: string; inStockOnly?: boolean }): Promise<ProductSummary[]> {
  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (params?.categoryId) qs.set('categoryId', params.categoryId)
  if (params?.inStockOnly) qs.set('inStockOnly', 'true')
  const path = `/api/products${qs.toString() ? `?${qs.toString()}` : ''}`
  try {
    return await apiFetch<ProductSummary[]>(path, { method: 'GET', auth: false })
  } catch {
    if (!LOCAL_FALLBACK) throw new Error('Failed to load products')
    // Browser fallback: derive summaries from local mock store
    if (typeof window !== 'undefined') {
      try {
        const mod = await import('./store')
        const list = (mod as any).getProducts?.() || []
        const mapped: ProductSummary[] = list
          .filter((p: any) => (!params?.inStockOnly || p.stock > 0))
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            categoryId: '',
            categoryName: p.category || (p.categories?.[0] ?? 'All'),
            price: p.price,
            discountedPrice: p.discountedPrice,
            discount: p.discount,
            stock: p.stock,
            primaryImageUrl: p.image || (p.images?.[0] ?? undefined),
          }))
        // Simple search filter
        const search = (params?.search || '').toLowerCase()
        const filtered = search ? mapped.filter((m) => `${m.name} ${m.description}`.toLowerCase().includes(search)) : mapped
        const catId = params?.categoryId
        const byCat = catId ? filtered.filter((m) => m.categoryId === catId || m.categoryName === catId) : filtered
        return byCat
      } catch {}
    }
    return []
  }
}

export async function apiGetProduct(id: string): Promise<ProductDetail> {
  try { return await apiFetch<ProductDetail>(`/api/products/${id}`, { method: 'GET' }) }
  catch {
    if (!LOCAL_FALLBACK) throw new Error('Product not found')
    if (typeof window !== 'undefined') {
      try {
        const mod = await import('./store')
        const p: any = (mod as any).getProductById?.(id)
        if (p) {
          return {
            id: p.id,
            name: p.name,
            description: p.description,
            categoryId: '',
            categoryName: p.category || (p.categories?.[0] ?? 'All'),
            price: p.price,
            discountedPrice: p.discountedPrice,
            discount: p.discount,
            stock: p.stock,
            primaryImageUrl: p.image || (p.images?.[0] ?? undefined),
            images: p.images || [],
          }
        }
      } catch {}
    }
    throw new Error('Product not found')
  }
}

export async function apiAdminListProducts(): Promise<ProductSummary[]> {
  return apiFetch<ProductSummary[]>('/api/admin/products', { method: 'GET' })
}

// Search products for admin (inventory/search UI)
export async function apiAdminSearchProducts(params?: {
  search?: string
  categoryId?: string
  inStockOnly?: boolean
  sort?: Array<{ field: string; dir: 'asc' | 'desc' }>
  page?: number
  size?: number
  limit?: number
}): Promise<ProductSummary[]> {
  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (params?.categoryId) qs.set('categoryId', params.categoryId)
  if (params?.inStockOnly) qs.set('inStockOnly', 'true')
  if (typeof params?.page === 'number') qs.set('page', String(params.page))
  if (typeof params?.size === 'number') qs.set('size', String(params.size))
  if (typeof params?.limit === 'number') qs.set('limit', String(params.limit))
  if (params?.sort) params.sort.forEach((s) => qs.append('sort', `${s.field},${s.dir}`))
  const path = `/api/admin/products/search${qs.toString() ? `?${qs.toString()}` : ''}`
  return apiFetch<ProductSummary[]>(path, { method: 'GET' })
}

export async function apiAdminCreateProduct(payload: {
  name: string
  description: string
  categoryId: string
  price: number
  discountedPrice?: number
  stock: number
  primaryImageUrl?: string
  images?: string[]
  active?: boolean
}): Promise<ProductDetail> {
  return apiFetch<ProductDetail>('/api/admin/products', { method: 'POST', body: JSON.stringify(payload) })
}

export async function apiAdminReplaceProduct(id: string, payload: {
  name: string
  description: string
  categoryId: string
  price: number
  discountedPrice?: number | null
  stock: number
  primaryImageUrl?: string
  images?: string[]
  active?: boolean
}): Promise<ProductDetail> {
  return apiFetch<ProductDetail>(`/api/admin/products/${id}`, { method: 'PUT', body: JSON.stringify(payload) })
}

export async function apiAdminUpdateProduct(id: string, payload: Partial<{
  name: string
  description: string
  categoryId: string
  price: number
  discountedPrice?: number | null
  stock: number
  primaryImageUrl?: string
  images?: string[]
  active?: boolean
}>): Promise<ProductDetail> {
  // Prefer PUT when image fields are present so arrays are replaced server-side.
  const hasImageFields = Object.prototype.hasOwnProperty.call(payload || {}, 'images') ||
    Object.prototype.hasOwnProperty.call(payload || {}, 'primaryImageUrl')

  const endpoint = `/api/admin/products/${id}`

  async function trySend(method: 'PUT' | 'PATCH', bodyObj: any): Promise<ProductDetail> {
    return apiFetch<ProductDetail>(endpoint, { method, body: JSON.stringify(bodyObj) })
  }

  try {
    if (hasImageFields) {
      // PUT first to ensure replacement semantics for images
      return await trySend('PUT', payload)
    }
    // Default to PATCH for partial updates
    return await trySend('PATCH', payload)
  } catch (err: any) {
    // Handle discountedPrice explicit clearing across different backends
    const intendsClearDiscount = payload &&
      Object.prototype.hasOwnProperty.call(payload, 'discountedPrice') &&
      (payload as any).discountedPrice === null

    if (intendsClearDiscount) {
      const base = { ...payload } as any
      delete base.discountedPrice
      try {
        // Retry with a conventional remove flag using the same method preference
        if (hasImageFields) return await trySend('PUT', { ...base, removeDiscount: true })
        return await trySend('PATCH', { ...base, removeDiscount: true })
      } catch {
        // Final fallback: send without any discount field
        if (hasImageFields) return await trySend('PUT', base)
        return await trySend('PATCH', base)
      }
    }

    // If PUT was preferred and failed (e.g., not supported), fall back to PATCH once
    if (hasImageFields) {
      return await trySend('PATCH', payload)
    }

    throw err
  }
}

// Update only stock (inventory)
export async function apiAdminUpdateProductStock(id: string, stock: number): Promise<{ id: string; stock: number }> {
  return apiFetch<{ id: string; stock: number }>(`/api/admin/products/${encodeURIComponent(id)}/stock`, {
    method: 'PATCH',
    body: JSON.stringify({ stock }),
  })
}

export async function apiAdminDeleteProduct(id: string): Promise<ApiEnvelope<any>> {
  // Use apiFetchEnvelope so we go through the same-origin proxy when needed
  const env = await apiFetchEnvelope(`/api/admin/products/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
  return env
}

export async function apiListCategories(): Promise<Category[]> {
  try { return await apiFetch<Category[]>('/api/categories', { method: 'GET', auth: false }) }
  catch {
    if (!LOCAL_FALLBACK) throw new Error('Failed to load categories')
    if (typeof window !== 'undefined') {
      try {
        const mod = await import('./store')
        const list: any[] = (mod as any).getProducts?.() || []
        const names = Array.from(new Set(list.flatMap((p: any) => [p.category, ...(p.categories || [])]).filter(Boolean))) as string[]
        const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        return names.map((name) => ({ id: slugify(name), name, slug: slugify(name) }))
      } catch {}
    }
    return []
  }
}

// ----- Public: Products by Category -----
export async function apiGetProductsByCategoryId(
  categoryId: string,
  params?: { search?: string; inStockOnly?: boolean },
): Promise<ProductSummary[]> {
  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (params?.inStockOnly) qs.set('inStockOnly', 'true')
  const path = `/api/categories/${encodeURIComponent(categoryId)}/products${qs.toString() ? `?${qs.toString()}` : ''}`
  try { return await apiFetch<ProductSummary[]>(path, { method: 'GET', auth: false }) }
  catch {
    if (!LOCAL_FALLBACK) throw new Error('Failed to load products')
    if (typeof window !== 'undefined') {
      try {
        const mod = await import('./store')
        const list: any[] = (mod as any).getProducts?.() || []
        const mapped: ProductSummary[] = list
          .filter((p: any) => (!params?.inStockOnly || p.stock > 0))
          .map((p: any) => ({
            id: p.id,
            name: p.name,
            description: p.description,
            categoryId: '',
            categoryName: p.category || (p.categories?.[0] ?? 'All'),
            price: p.price,
            discountedPrice: p.discountedPrice,
            discount: p.discount,
            stock: p.stock,
            primaryImageUrl: p.image || (p.images?.[0] ?? undefined),
          }))
        const search = (params?.search || '').toLowerCase()
        const filtered = search ? mapped.filter((m) => `${m.name} ${m.description}`.toLowerCase().includes(search)) : mapped
        // In fallback, accept either id or name matching
        const byCat = filtered.filter((m) => m.categoryId === categoryId || m.categoryName === categoryId)
        return byCat
      } catch {}
    }
    return []
  }
}

export async function apiGetProductsByCategorySlug(
  slug: string,
  params?: { search?: string; inStockOnly?: boolean },
): Promise<ProductSummary[]> {
  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (params?.inStockOnly) qs.set('inStockOnly', 'true')
  const path = `/api/categories/slug/${encodeURIComponent(slug)}/products${qs.toString() ? `?${qs.toString()}` : ''}`
  try { return await apiFetch<ProductSummary[]>(path, { method: 'GET', auth: false }) }
  catch {
    if (!LOCAL_FALLBACK) throw new Error('Failed to load products')
    if (typeof window !== 'undefined') {
      try {
        const mod = await import('./store')
        const list: any[] = (mod as any).getProducts?.() || []
        const mapped: ProductSummary[] = list.map((p: any) => ({
          id: p.id,
          name: p.name,
          description: p.description,
          categoryId: '',
          categoryName: p.category || (p.categories?.[0] ?? 'All'),
          price: p.price,
          discountedPrice: p.discountedPrice,
          discount: p.discount,
          stock: p.stock,
          primaryImageUrl: p.image || (p.images?.[0] ?? undefined),
        }))
        const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
        const bySlug = mapped.filter((m) => slugify(m.categoryName) === slug)
        const search = (params?.search || '').toLowerCase()
        const filtered = search ? bySlug.filter((m) => `${m.name} ${m.description}`.toLowerCase().includes(search)) : bySlug
        return params?.inStockOnly ? filtered.filter((m) => m.stock > 0) : filtered
      } catch {}
    }
    return []
  }
}

export async function apiAdminListCategories(): Promise<Category[]> {
  return apiFetch<Category[]>('/api/admin/categories', { method: 'GET' })
}

export async function apiAdminCreateCategory(name: string): Promise<Category> {
  return apiFetch<Category>('/api/admin/categories', { method: 'POST', body: JSON.stringify({ name }) })
}

export async function apiAdminUpdateCategory(id: string, patch: Partial<{ name: string; slug: string }>): Promise<Category> {
  return apiFetch<Category>(`/api/admin/categories/${id}`, { method: 'PATCH', body: JSON.stringify(patch) })
}

export async function apiAdminDeleteCategory(id: string): Promise<void> {
  await apiFetch<void>(`/api/admin/categories/${id}`, { method: 'DELETE' })
}

// ----- Public Settings (for SEO + Store info) -----
export interface PublicSettings {
  storeName: string
  storeDescription?: string
  storeEmail?: string
  storePhone?: string
  storeAddress?: string
  metaTitle?: string
  metaDescription?: string
  metaKeywords?: string
  ogImageUrl?: string
  defaultCurrency?: string
}

export async function apiGetPublicSettings(): Promise<PublicSettings | null> {
  try { return await apiFetch<PublicSettings>('/api/settings', { method: 'GET', auth: false }) } catch { return null }
}

export async function apiLogin(email: string, password: string) {
  const data = await apiFetch<{ user: ApiUser; accessToken: string; refreshToken: string }>(
    '/api/auth/login',
    { method: 'POST', body: JSON.stringify({ email, password }), auth: false, withCredentials: false },
  )
  accessTokenMemory = data.accessToken || null
  if (typeof window !== 'undefined') {
    try {
      if (accessTokenMemory) window.localStorage.setItem(TOKEN_STORAGE_KEY, accessTokenMemory)
      else window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    } catch {}
  }
  return data.user
}

export async function apiRegister(email: string, name: string, password: string) {
  const data = await apiFetch<{ user: ApiUser; accessToken: string; refreshToken: string }>(
    '/api/auth/register',
    { method: 'POST', body: JSON.stringify({ email, name, password }), auth: false, withCredentials: false },
  )
  accessTokenMemory = data.accessToken || null
  if (typeof window !== 'undefined') {
    try {
      if (accessTokenMemory) window.localStorage.setItem(TOKEN_STORAGE_KEY, accessTokenMemory)
      else window.localStorage.removeItem(TOKEN_STORAGE_KEY)
    } catch {}
  }
  return data.user
}

export async function apiLogout() {
  try { await apiFetch<void>('/api/auth/logout', { method: 'POST', auth: false, withCredentials: false }) } catch {}
  accessTokenMemory = null
  if (typeof window !== 'undefined') {
    try { window.localStorage.removeItem(TOKEN_STORAGE_KEY) } catch {}
  }
}

// Change password with old password
export async function apiForgotPassword(email: string, oldPassword: string, newPassword: string) {
  await apiFetch<void>('/api/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email, oldPassword, newPassword }), auth: false, withCredentials: false })
}

// Reset password with just email + new
export async function apiResetPassword(email: string, newPassword: string, confirmPassword: string) {
  await apiFetch<void>('/api/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, newPassword, confirmPassword }), auth: false, withCredentials: false })
}

export async function apiGetMe(): Promise<ApiUser> {
  const u = await apiFetch<ApiUser>('/api/user-details', { method: 'GET' })
  return u
}

export async function apiPatchMe(updates: Partial<ApiUser>): Promise<ApiUser> {
  const u = await apiFetch<ApiUser>('/api/user-details', { method: 'PUT', body: JSON.stringify(updates) })
  return u
}

// ----- Admin: Customers / Users Management -----
export type AdminUser = ApiUser

export async function apiAdminListUsers(): Promise<AdminUser[]> {
  return apiFetch<AdminUser[]>('/api/admin/users', { method: 'GET' })
}

export async function apiAdminSearchUsers(params?: { role?: 'ADMIN' | 'CUSTOMER'; search?: string; limit?: number; sort?: Array<{ field: string; dir: 'asc' | 'desc' }> }): Promise<AdminUser[]> {
  const qs = new URLSearchParams()
  if (params?.role) qs.set('role', params.role)
  if (params?.search) qs.set('search', params.search)
  if (typeof params?.limit === 'number') qs.set('limit', String(params.limit))
  if (params?.sort) params.sort.forEach((s) => qs.append('sort', `${s.field},${s.dir}`))
  const path = `/api/admin/users${qs.toString() ? `?${qs.toString()}` : ''}`
  return apiFetch<AdminUser[]>(path, { method: 'GET' })
}

export async function apiAdminGetUser(id: string): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'GET' })
}

export async function apiAdminCreateCustomer(payload: { email: string; name: string; password: string; phone?: string; address?: string; profileImageUrl?: string; banned?: boolean }): Promise<AdminUser> {
  return apiFetch<AdminUser>('/api/admin/users', { method: 'POST', body: JSON.stringify(payload) })
}

export async function apiAdminPatchUser(id: string, patch: Partial<{ name: string; phone: string; address: string; profileImageUrl: string; banned: boolean; role: 'ADMIN' | 'CUSTOMER' }>): Promise<AdminUser> {
  return apiFetch<AdminUser>(`/api/admin/users/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) })
}

export async function apiAdminPromoteUser(id: string): Promise<Pick<AdminUser, 'id' | 'role'>> {
  return apiFetch<Pick<AdminUser, 'id' | 'role'>>(`/api/admin/users/${encodeURIComponent(id)}/promote`, { method: 'POST' })
}

export async function apiAdminBanUser(id: string): Promise<void> {
  await apiFetch<void>(`/api/admin/users/${encodeURIComponent(id)}/ban`, { method: 'POST' })
}

export async function apiAdminUnbanUser(id: string): Promise<void> {
  await apiFetch<void>(`/api/admin/users/${encodeURIComponent(id)}/unban`, { method: 'POST' })
}

// ----- Admin: Coupons -----
export type CouponDiscountType = 'PERCENT' | 'FIXED'
export interface AdminCoupon {
  id: string
  code: string
  discountType: CouponDiscountType
  discount: number
  expiryDate: string | null
  maxUses: number | null
  usedCount: number
  active: boolean
  productIds: string[]
  categoryIds: string[]
  customerIds: string[]
  createdAt?: string
  updatedAt?: string
}

export async function apiAdminGetCouponSummary(): Promise<{ total: number; active: number; expired: number }> {
  return apiFetch<{ total: number; active: number; expired: number }>(`/api/admin/coupons/summary`, { method: 'GET' })
}

export async function apiAdminListCoupons(params?: { search?: string; sort?: Array<{ field: string; dir: 'asc' | 'desc' }>; limit?: number }): Promise<AdminCoupon[]> {
  const qs = new URLSearchParams()
  if (params?.search) qs.set('search', params.search)
  if (typeof params?.limit === 'number') qs.set('limit', String(params.limit))
  if (params?.sort) params.sort.forEach((s) => qs.append('sort', `${s.field},${s.dir}`))
  const path = `/api/admin/coupons${qs.toString() ? `?${qs.toString()}` : ''}`
  return apiFetch<AdminCoupon[]>(path, { method: 'GET' })
}

export async function apiAdminGetCoupon(id: string): Promise<AdminCoupon> {
  return apiFetch<AdminCoupon>(`/api/admin/coupons/${encodeURIComponent(id)}`, { method: 'GET' })
}

export async function apiAdminCreateCoupon(payload: {
  code: string
  discountType: CouponDiscountType
  discount: number
  expiryDate?: string | null
  maxUses?: number | null
  productIds?: string[]
  categoryIds?: string[]
  customerIds?: string[]
}): Promise<AdminCoupon> {
  const send = (p: any) => apiFetch<AdminCoupon>(`/api/admin/coupons`, { method: 'POST', body: JSON.stringify(p) })
  try {
    return await send(payload)
  } catch (err: any) {
    if (err?.status === 500) {
      const variants: any[] = []
      const base: any = { ...payload }
      // Date variants
      if (base.expiryDate && typeof base.expiryDate === 'string') {
        if (!/Z$/.test(base.expiryDate) && /T\d{2}:\d{2}/.test(base.expiryDate)) {
          variants.push({ ...base, expiryDate: `${base.expiryDate}${base.expiryDate.endsWith(':00') ? 'Z' : ':00Z'}` })
        }
        try {
          const d = new Date(base.expiryDate)
          if (!isNaN(d.getTime())) variants.push({ ...base, expiryDate: d.toISOString() })
        } catch {}
      }
      // Explicit active flag
      variants.push({ ...base, active: true })
      // Singular ID fallbacks for some backends
      if (Array.isArray(base.productIds) && base.productIds.length === 1) variants.push({ ...base, productId: base.productIds[0], productIds: undefined })
      if (Array.isArray(base.categoryIds) && base.categoryIds.length === 1) variants.push({ ...base, categoryId: base.categoryIds[0], categoryIds: undefined })
      if (Array.isArray(base.customerIds) && base.customerIds.length === 1) variants.push({ ...base, customerId: base.customerIds[0], customerIds: undefined })
      // Remove maxUses entirely (or ensure number)
      if (Object.prototype.hasOwnProperty.call(base, 'maxUses')) variants.push(({ ...base, maxUses: undefined }))
      for (const v of variants) {
        try { return await send(v) } catch (e: any) { if (e?.status && e.status !== 500) throw e }
      }
    }
    throw err
  }
}

export async function apiAdminPatchCoupon(
  id: string,
  patch: Partial<{
    code: string
    discountType: CouponDiscountType
    discount: number
    expiryDate: string | null
    maxUses: number | null
    productIds: string[]
    categoryIds: string[]
    customerIds: string[]
    active: boolean
    global: boolean
  }>,
): Promise<AdminCoupon> {
  return apiFetch<AdminCoupon>(`/api/admin/coupons/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) })
}

export async function apiAdminDeleteCoupon(id: string): Promise<void> {
  await apiFetch<void>(`/api/admin/coupons/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// ----- Public: Coupons validate/redeem -----
export interface PublicCouponValidation {
  valid?: boolean
  code?: string
  discountType?: CouponDiscountType
  discount?: number
  discountAmount?: number
  amountOff?: number
  message?: string
  [key: string]: any
}

// ----- Cart API (docs/cart-doc.md) -----
export interface CartItemView {
  id?: string
  productId: string
  name?: string
  price?: number
  discountedPrice?: number | null
  stock?: number
  quantity: number
  lineTotal?: number
}

export interface CartView {
  id: string
  userId?: string | null
  items: CartItemView[]
  totalQuantity: number
  subtotal: number
  appliedCouponCode?: string | null
  discountAmount?: number
  total?: number | null
  updatedAt?: string
}

// Guest: public endpoints
export async function apiCreateGuestCart(): Promise<{ cartId: string }> {
  const env = await apiFetchEnvelope('/api/carts', { method: 'POST', auth: false })
  const id = (env?.data?.cartId || (env as any)?.cartId || (env as any)?.meta?.cartId) as string
  if (!id) throw new Error('Failed to create guest cart')
  return { cartId: id }
}

export async function apiGetCart(cartId: string): Promise<CartView> {
  return apiFetch<CartView>(`/api/carts/${encodeURIComponent(cartId)}`, { method: 'GET', auth: false, withCredentials: false })
}

export async function apiCartAddItem(cartId: string, productId: string | number | { id?: string; value?: string|number; key?: string }, quantity: number): Promise<CartView> {
  // Build body with productId first, then quantity (insertion order preserved)
  const body: any = {}
  if (typeof productId === 'object') {
    const pid = (productId as any).id ?? (productId as any).value ?? (productId as any).key
    body.productId = pid != null ? pid : productId
  } else {
    body.productId = productId
  }
  body.quantity = quantity
  return apiFetch<CartView>(`/api/carts/${encodeURIComponent(cartId)}/items`, {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
    auth: false,
    withCredentials: false,
  })
}

// Low-level variant to post an exact body shape for add-to-cart.
export async function apiCartAddItemRaw(cartId: string, body: any): Promise<CartView> {
  return apiFetch<CartView>(`/api/carts/${encodeURIComponent(cartId)}/items`, {
    method: 'POST',
    body: JSON.stringify(body ?? {}),
    headers: { 'content-type': 'application/json' },
    auth: false,
    withCredentials: false,
  })
}

// Absolute-call variant to avoid any proxy or retry logic; matches Swagger exactly
export async function apiCartAddItemAbsolute(cartId: string, body: any): Promise<CartView> {
  const res = await fetch(absUrl(`/api/carts/${encodeURIComponent(cartId)}/items`), {
    method: 'POST',
    headers: { 'Accept': 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify(body ?? {}),
    mode: 'cors',
    credentials: undefined,
  })
  const text = await res.text().catch(() => '')
  let json: any = undefined
  try { json = text ? JSON.parse(text) : undefined } catch {}
  if (!res.ok) {
    const err = new Error(json?.error?.message || `Request failed: ${res.status}`) as Error & { status?: number; code?: string; fields?: Record<string,string> }
    err.status = res.status; err.code = json?.error?.code; err.fields = json?.error?.fields; throw err
  }
  return (json?.data ?? json) as CartView
}

// Minimal relative POST helper that bypasses apiFetch logic entirely
export async function postJsonRelative<T>(path: string, body: any): Promise<T> {
  // Attach Authorization when available so authenticated proxy routes work
  let token = accessTokenMemory
  if (!token && typeof window !== 'undefined') {
    try { token = window.localStorage.getItem(TOKEN_STORAGE_KEY) } catch {}
  }
  const headers: Record<string, string> = { 'Accept': 'application/json', 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(path, {
    method: 'POST',
    headers,
    body: JSON.stringify(body ?? {}),
    credentials: 'include',
  })
  const txt = await res.text().catch(() => '')
  let json: any
  try { json = txt ? JSON.parse(txt) : undefined } catch { json = undefined }
  if (!res.ok) {
    const err = new Error(json?.error?.message || `Request failed: ${res.status}`) as Error & { status?: number; code?: string }
    err.status = res.status; err.code = json?.error?.code; throw err
  }
  return (json?.data ?? json) as T
}

export async function patchJsonRelative<T>(path: string, body: any): Promise<T> {
  let token = accessTokenMemory
  if (!token && typeof window !== 'undefined') {
    try { token = window.localStorage.getItem(TOKEN_STORAGE_KEY) } catch {}
  }
  const headers: Record<string, string> = { 'Accept': 'application/json', 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(path, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(body ?? {}),
    credentials: 'include',
  })
  const txt = await res.text().catch(() => '')
  let json: any
  try { json = txt ? JSON.parse(txt) : undefined } catch { json = undefined }
  if (!res.ok) {
    const err = new Error(json?.error?.message || `Request failed: ${res.status}`) as Error & { status?: number; code?: string }
    err.status = res.status; err.code = json?.error?.code; throw err
  }
  return (json?.data ?? json) as T
}

export async function deleteRelative<T>(path: string): Promise<T> {
  let token = accessTokenMemory
  if (!token && typeof window !== 'undefined') {
    try { token = window.localStorage.getItem(TOKEN_STORAGE_KEY) } catch {}
  }
  const headers: Record<string, string> = { 'Accept': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(path, { method: 'DELETE', headers, credentials: 'include' })
  const txt = await res.text().catch(() => '')
  let json: any
  try { json = txt ? JSON.parse(txt) : undefined } catch { json = undefined }
  if (!res.ok) {
    const err = new Error(json?.error?.message || `Request failed: ${res.status}`) as Error & { status?: number; code?: string }
    err.status = res.status; err.code = json?.error?.code; throw err
  }
  return (json?.data ?? json) as T
}

export async function apiCartUpdateItemRelative(cartId: string, productId: string, quantity: number): Promise<CartView> {
  return patchJsonRelative<CartView>(`/api/carts/${encodeURIComponent(cartId)}/items/${encodeURIComponent(productId)}`, { quantity })
}

export async function apiCartRemoveItemRelative(cartId: string, productId: string): Promise<CartView> {
  return deleteRelative<CartView>(`/api/carts/${encodeURIComponent(cartId)}/items/${encodeURIComponent(productId)}`)
}

export async function apiCartClearRelative(cartId: string): Promise<CartView> {
  return deleteRelative<CartView>(`/api/carts/${encodeURIComponent(cartId)}`)
}

export async function apiCartUpdateItem(cartId: string, productId: string, quantity: number): Promise<CartView> {
  const body = { quantity }
  return apiFetch<CartView>(`/api/carts/${encodeURIComponent(cartId)}/items/${encodeURIComponent(productId)}`, {
    method: 'PATCH',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json' },
    auth: false,
    withCredentials: false,
  })
}

export async function apiCartRemoveItem(cartId: string, productId: string): Promise<CartView> {
  return apiFetch<CartView>(`/api/carts/${encodeURIComponent(cartId)}/items/${encodeURIComponent(productId)}`, { method: 'DELETE', auth: false, withCredentials: false })
}

export async function apiCartClear(cartId: string): Promise<CartView> {
  return apiFetch<CartView>(`/api/carts/${encodeURIComponent(cartId)}`, { method: 'DELETE', auth: false, withCredentials: false })
}

export async function apiCartApplyCoupon(cartId: string, code: string): Promise<CartView> {
  return apiFetch<CartView>(`/api/carts/${encodeURIComponent(cartId)}/apply-coupon`, {
    method: 'POST',
    body: JSON.stringify({ code }),
    headers: { 'content-type': 'application/json' },
    auth: false,
    withCredentials: false,
  })
}

export async function apiCartRemoveCoupon(cartId: string): Promise<CartView> {
  return apiFetch<CartView>(`/api/carts/${encodeURIComponent(cartId)}/coupon`, { method: 'DELETE', auth: false, withCredentials: false })
}

// Authenticated user cart
export async function apiMeGetCart(): Promise<CartView> {
  return apiFetch<CartView>('/api/me/cart', { method: 'GET' })
}

export async function apiMeCartMerge(guestCartId: string, strategy: 'sum' | 'replace' = 'sum'): Promise<CartView> {
  return apiFetch<CartView>('/api/me/cart/merge', { method: 'POST', body: JSON.stringify({ guestCartId, strategy }) })
}

export async function apiMeCartApplyCoupon(code: string): Promise<CartView> {
  return apiFetch<CartView>('/api/me/cart/apply-coupon', { method: 'POST', body: JSON.stringify({ code }) })
}

export async function apiMeCartRemoveCoupon(): Promise<CartView> {
  return apiFetch<CartView>('/api/me/cart/coupon', { method: 'DELETE' })
}

// ----- Cart Summary Sync (per docs/cart-summary-sync.md) -----
export async function apiCartSyncSummary(
  cartId: string,
  code?: string | null,
  snapshot?: { subtotal?: number; discountAmount?: number; total?: number }
): Promise<CartView> {
  const payload: any = {}
  if (code !== undefined) payload.code = code
  if (snapshot && typeof snapshot.subtotal === 'number') payload.subtotal = snapshot.subtotal
  if (snapshot && typeof snapshot.discountAmount === 'number') payload.discountAmount = snapshot.discountAmount
  if (snapshot && typeof snapshot.total === 'number') payload.total = snapshot.total
  const body = Object.keys(payload).length ? JSON.stringify(payload) : undefined
  return apiFetch<CartView>(`/api/carts/${encodeURIComponent(cartId)}/summary`, {
    method: 'PATCH',
    body,
    headers: body ? { 'content-type': 'application/json' } : undefined,
    auth: false,
    withCredentials: false,
  })
}

export async function apiMeCartSyncSummary(
  code?: string | null,
  snapshot?: { subtotal?: number; discountAmount?: number; total?: number }
): Promise<CartView> {
  const payload: any = {}
  if (code !== undefined) payload.code = code
  if (snapshot && typeof snapshot.subtotal === 'number') payload.subtotal = snapshot.subtotal
  if (snapshot && typeof snapshot.discountAmount === 'number') payload.discountAmount = snapshot.discountAmount
  if (snapshot && typeof snapshot.total === 'number') payload.total = snapshot.total
  const body = Object.keys(payload).length ? JSON.stringify(payload) : undefined
  return apiFetch<CartView>('/api/me/cart/summary', {
    method: 'PATCH',
    body,
    headers: body ? { 'content-type': 'application/json' } : undefined,
  })
}

export async function apiCartCheckout(cartId: string): Promise<{ cartId: string }> {
  const env = await apiFetchEnvelope(`/api/carts/${encodeURIComponent(cartId)}/checkout`, { method: 'POST', auth: false, withCredentials: false })
  const id = (env?.data?.cartId || cartId) as string
  return { cartId: id }
}

export async function apiValidateCoupon(
  code: string,
  params?: { customerId?: string; productIds?: string[]; categoryIds?: string[]; subtotal?: number }
): Promise<PublicCouponValidation> {
  const qs = new URLSearchParams()
  if (params?.customerId) qs.set('customerId', params.customerId)
  if (params?.subtotal != null) qs.set('subtotal', String(params.subtotal))
  ;(params?.productIds || []).forEach((id) => qs.append('productIds', id))
  ;(params?.categoryIds || []).forEach((id) => qs.append('categoryIds', id))
  const path = `/api/coupons/${encodeURIComponent(code)}/validate${qs.toString() ? `?${qs.toString()}` : ''}`
  return apiFetch<PublicCouponValidation>(path, { method: 'GET', auth: false })
}

export async function apiRedeemCoupon(
  code: string,
  body: { orderId?: string; customerId?: string; productIds?: string[]; categoryIds?: string[] }
): Promise<any> {
  return apiFetch<any>(`/api/coupons/${encodeURIComponent(code)}/redeem`, { method: 'POST', body: JSON.stringify(body), auth: false })
}

// ----- Orders API (guest + auth) -----
export interface OrderItemView {
  productId: string
  name?: string
  price?: number
  discountedPrice?: number | null
  quantity: number
  lineTotal?: number
}

export interface OrderView {
  id: string
  userId?: string | null
  orderNumberFormatted?: string
  orderNumber?: string
  items: OrderItemView[]
  subtotal?: number
  discountAmount?: number
  total: number
  couponCode?: string | null
  paymentMethod?: 'COD' | 'CARD' | string
  status?: string
  shippingAddress?: string
  createdAt?: string
}

export async function apiCreateOrderGuest(payload: any): Promise<OrderView> {
  // Backend expects card details nested under `card: { number, expiry, cvv }` when paymentMethod=CARD
  return apiFetch<OrderView>('/api/orders', { method: 'POST', body: JSON.stringify(payload), auth: false, withCredentials: false })
}

export async function apiCreateOrderMe(payload: any): Promise<OrderView> {
  return apiFetch<OrderView>('/api/me/orders', { method: 'POST', body: JSON.stringify(payload) })
}

export async function apiGetOrder(id: string): Promise<OrderView> {
  return apiFetch<OrderView>(`/api/orders/${encodeURIComponent(id)}`, { method: 'GET' })
}

export async function apiGetOrderByNumber(number: string): Promise<OrderView> {
  return apiFetch<OrderView>(`/api/orders/number/${encodeURIComponent(number)}`, { method: 'GET' })
}

// ----- Admin Orders API -----
export async function apiAdminListOrders(): Promise<OrderView[]> {
  return apiFetch<OrderView[]>('/api/admin/orders', { method: 'GET' })
}

export interface AdminOrdersQuery {
  status?: 'ALL'|'PENDING'|'CONFIRMED'|'IN_PROCESS'|'DELIVERED'|'CANCELLED'
  search?: string
  minTotal?: number
  maxTotal?: number
  page?: number
  size?: number
  sort?: string // e.g., 'createdAt,DESC'
}

export async function apiAdminSearchOrders(params: AdminOrdersQuery = {}): Promise<{ items: OrderView[]; meta: { total?: number; page?: number; size?: number; totalPages?: number } }> {
  const qs = new URLSearchParams()
  if (params.status) qs.set('status', params.status)
  if (params.search) qs.set('search', params.search)
  if (typeof params.minTotal === 'number') qs.set('minTotal', String(params.minTotal))
  if (typeof params.maxTotal === 'number') qs.set('maxTotal', String(params.maxTotal))
  if (typeof params.page === 'number') qs.set('page', String(params.page))
  if (typeof params.size === 'number') qs.set('size', String(params.size))
  if (params.sort) qs.set('sort', params.sort)
  const path = `/api/admin/orders${qs.toString() ? `?${qs.toString()}` : ''}`
  const env = await apiFetchEnvelope(path, { method: 'GET' })
  return { items: (env.data || []) as OrderView[], meta: (env.meta || {}) }
}

export async function apiAdminGetOrder(id: string): Promise<OrderView> {
  return apiFetch<OrderView>(`/api/admin/orders/${encodeURIComponent(id)}`, { method: 'GET' })
}

export async function apiAdminUpdateOrderStatus(id: string, status: 'PENDING'|'CONFIRMED'|'IN_PROCESS'|'DELIVERED'|'CANCELLED') {
  return apiFetch<{ id: string; status: string }>(`/api/admin/orders/${encodeURIComponent(id)}/status`, { method: 'PATCH', body: JSON.stringify({ status }) })
}

export async function apiAdminDeleteOrder(id: string): Promise<{ id: string }> {
  return apiFetch<{ id: string }>(`/api/admin/orders/${encodeURIComponent(id)}`, { method: 'DELETE' })
}

// ----- Admin Dashboard -----
export interface AdminDashboardMetrics {
  totalRevenue: number
  totalOrders: number
  totalCustomers: number
  totalProducts: number
  statusDistribution: { PENDING: number; CONFIRMED: number; IN_PROCESS: number; DELIVERED: number; CANCELLED: number }
  revenueTrend: Array<{ year: number; month: number; label: string; total: number }>
  quickStats: { completedOrders: number; pendingOrders: number; activeCoupons: number; lowStockProducts: number }
  recentOrders: Array<{ id: string; orderNumber?: number; orderNumberFormatted?: string; createdAt?: string; status?: string; total?: number; customer?: string }>
}

export async function apiAdminGetDashboard(lowStockThreshold?: number): Promise<AdminDashboardMetrics> {
  const qs = new URLSearchParams()
  if (typeof lowStockThreshold === 'number') qs.set('lowStockThreshold', String(lowStockThreshold))
  const path = `/api/admin/dashboard${qs.toString() ? `?${qs.toString()}` : ''}`
  return apiFetch<AdminDashboardMetrics>(path, { method: 'GET' })
}

export async function apiListMyOrders(): Promise<OrderView[]> {
  return apiFetch<OrderView[]>('/api/me/orders', { method: 'GET' })
}

export async function apiCancelMyOrder(id: string): Promise<OrderView> {
  return apiFetch<OrderView>(`/api/me/orders/${encodeURIComponent(id)}/cancel`, { method: 'PATCH' })
}

// Relative (proxy) variant that carries Authorization automatically
export async function apiCancelMyOrderRelative(id: string): Promise<OrderView> {
  return patchJsonRelative<OrderView>(`/api/me/orders/${encodeURIComponent(id)}/cancel`, undefined as any)
}

// ----- My Order Stats -----
export interface MyOrderStats { totalOrders: number; completedOrders: number; totalSpent: number }
export async function apiGetMyOrderStats(): Promise<MyOrderStats> {
  return apiFetch<MyOrderStats>('/api/me/orders/stats', { method: 'GET' })
}

// Send PATCH with no body (no Content-Type) via proxy; useful if backend dislikes empty JSON
export async function patchNoBodyRelative<T>(path: string): Promise<T> {
  // attach token if present
  let token = accessTokenMemory
  if (!token && typeof window !== 'undefined') {
    try { token = window.localStorage.getItem(TOKEN_STORAGE_KEY) } catch {}
  }
  const headers: Record<string, string> = { 'Accept': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(path, { method: 'PATCH', headers, credentials: 'include' })
  const txt = await res.text().catch(() => '')
  let json: any
  try { json = txt ? JSON.parse(txt) : undefined } catch { json = undefined }
  if (!res.ok) {
    const err = new Error(json?.error?.message || `Request failed: ${res.status}`) as Error & { status?: number; code?: string }
    err.status = res.status; (err as any).code = json?.error?.code
    throw err
  }
  return (json?.data ?? json) as T
}

// ----- Relative (proxy) coupon helpers for carts -----
export async function apiCartApplyCouponRelative(cartId: string, code: string): Promise<CartView> {
  return postJsonRelative<CartView>(`/api/carts/${encodeURIComponent(cartId)}/apply-coupon`, { code })
}

export async function apiCartRemoveCouponRelative(cartId: string): Promise<CartView> {
  return deleteRelative<CartView>(`/api/carts/${encodeURIComponent(cartId)}/coupon`)
}

export async function apiMeCartApplyCouponRelative(code: string): Promise<CartView> {
  return postJsonRelative<CartView>(`/api/me/cart/apply-coupon`, { code })
}

export async function apiMeCartRemoveCouponRelative(): Promise<CartView> {
  return deleteRelative<CartView>(`/api/me/cart/coupon`)
}

// Relative helpers for summary sync
export async function apiCartSyncSummaryRelative(
  cartId: string,
  code?: string | null,
  snapshot?: { subtotal?: number; discountAmount?: number; total?: number }
): Promise<CartView> {
  const payload: any = {}
  if (code !== undefined) payload.code = code
  if (snapshot && typeof snapshot.subtotal === 'number') payload.subtotal = snapshot.subtotal
  if (snapshot && typeof snapshot.discountAmount === 'number') payload.discountAmount = snapshot.discountAmount
  if (snapshot && typeof snapshot.total === 'number') payload.total = snapshot.total
  return patchJsonRelative<CartView>(`/api/carts/${encodeURIComponent(cartId)}/summary`, Object.keys(payload).length ? payload : (undefined as any))
}

export async function apiMeCartSyncSummaryRelative(
  code?: string | null,
  snapshot?: { subtotal?: number; discountAmount?: number; total?: number }
): Promise<CartView> {
  const payload: any = {}
  if (code !== undefined) payload.code = code
  if (snapshot && typeof snapshot.subtotal === 'number') payload.subtotal = snapshot.subtotal
  if (snapshot && typeof snapshot.discountAmount === 'number') payload.discountAmount = snapshot.discountAmount
  if (snapshot && typeof snapshot.total === 'number') payload.total = snapshot.total
  return patchJsonRelative<CartView>(`/api/me/cart/summary`, Object.keys(payload).length ? payload : (undefined as any))
}
