"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import { useAuth } from "./auth-context"
import {
  apiCreateGuestCart,
  apiGetCart,
  apiMeGetCart,
  apiMeCartMerge,
  apiCartAddItem,
  apiCartUpdateItem,
  apiCartRemoveItem,
  apiCartApplyCoupon,
  apiCartRemoveCoupon,
  apiCartClear,
  apiCartAddItemRaw,
  postJsonRelative,
  apiCartUpdateItemRelative,
  apiCartRemoveItemRelative,
  apiCartClearRelative,
  apiCartApplyCouponRelative,
  apiCartRemoveCouponRelative,
  apiMeCartApplyCouponRelative,
  apiMeCartRemoveCouponRelative,
  apiCartSyncSummaryRelative,
  apiMeCartSyncSummaryRelative,
  type CartView,
} from "./api"

interface CartTotals { subtotal?: number; discountAmount?: number; total?: number }
interface CartContextType {
  cart: CartView | null
  loading: boolean
  refresh: () => Promise<void>
  resetClientCart: () => void
  addToCart: (productId: string, quantity: number, meta?: { totals?: CartTotals }) => Promise<boolean>
  removeFromCart: (productId: string, meta?: { totals?: CartTotals }) => Promise<boolean>
  updateCartItem: (productId: string, quantity: number, meta?: { totals?: CartTotals }) => Promise<boolean>
  applyCoupon: (code: string, meta?: { totals?: CartTotals }) => Promise<boolean>
  removeCoupon: (meta?: { totals?: CartTotals }) => Promise<boolean>
  clearCart: (meta?: { totals?: CartTotals }) => Promise<boolean>
  cartCount: number
}

const CartContext = createContext<CartContextType | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  // Enable local fallback cart only when env is true
  const LOCAL_FALLBACK = typeof process !== 'undefined' && (process as any).env?.NEXT_PUBLIC_ENABLE_LOCAL_FALLBACK === 'true'
  const [mounted, setMounted] = useState(false)
  const [cartCount, setCartCount] = useState(0)
  const [cart, setCart] = useState<CartView | null>(null)
  const [loading, setLoading] = useState(true)
  const CART_KEY = 'RC_GUEST_CART_ID'
  const LOCAL_CART_KEY = 'RC_LOCAL_CART_VIEW'

  const computeTotals = (items: CartItemView[]): { totalQuantity: number; subtotal: number; total: number } => {
    const totalQuantity = items.reduce((s, it) => s + (it.quantity || 0), 0)
    const subtotal = items.reduce((s, it) => s + ((it.discountedPrice ?? it.price ?? 0) * (it.quantity || 0)), 0)
    const total = subtotal
    return { totalQuantity, subtotal, total }
  }

  const readLocalCart = (): CartView | null => {
    if (typeof window === 'undefined') return null
    try { const raw = window.localStorage.getItem(LOCAL_CART_KEY); return raw ? JSON.parse(raw) as CartView : null } catch { return null }
  }
  const writeLocalCart = (cv: CartView | null) => {
    if (typeof window === 'undefined') return
    try { if (cv) window.localStorage.setItem(LOCAL_CART_KEY, JSON.stringify(cv)); else window.localStorage.removeItem(LOCAL_CART_KEY) } catch {}
  }
  const ensureLocalCart = (): CartView => {
    const existing = readLocalCart()
    if (existing) return existing
    const cv: CartView = { id: 'local-cart', userId: null, items: [], totalQuantity: 0, subtotal: 0, total: 0 }
    writeLocalCart(cv)
    return cv
  }

  useEffect(() => {
    setMounted(true)
    ;(async () => {
      try {
        if (typeof window !== 'undefined') {
          const existing = window.localStorage.getItem(CART_KEY) || ''
          if (existing && !isValidCartId(existing)) {
            try {
              const created = await apiCreateGuestCart()
              window.localStorage.setItem(CART_KEY, created.cartId)
            } catch {}
          }
        }
      } finally {
        await refresh()
      }
    })()
  }, [])

  const normalizeCartId = (raw: string | null | undefined): string | null => {
    if (!raw) return null
    // Accept plain UUID
    if (/^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(raw)) return raw
    // Strip legacy "cart-<uuid>" prefix
    const m = /^cart-([0-9a-fA-F-]{36})$/.exec(raw)
    if (m && m[1]) return m[1]
    // Extract first UUID-looking token if present
    const m2 = /([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})/.exec(raw)
    if (m2 && m2[1]) return m2[1]
    return null
  }

  const ensureGuestCart = async (): Promise<string | null> => {
    try {
      const stored = window.localStorage.getItem(CART_KEY)
      const normalized = normalizeCartId(stored)
      if (normalized) {
        if (normalized !== stored) {
          try { window.localStorage.setItem(CART_KEY, normalized) } catch {}
        }
        return normalized
      }
      const { cartId } = await apiCreateGuestCart()
      window.localStorage.setItem(CART_KEY, cartId)
      return cartId
    } catch { return null }
  }

  const isValidCartId = (id: string): boolean => {
    // Backend now uses 36-char UUIDs, no "cart-" prefix
    return /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id)
  }

  const getEffectiveCartId = async (): Promise<string | null> => {
    if (user) {
      try {
        const me = await apiMeGetCart()
        setCart(me)
        setCartCount(me?.totalQuantity || 0)
        return me?.id || null
      } catch {}
    }
    const gid = await ensureGuestCart()
    if (gid) {
      try { const cv = await apiGetCart(gid); setCart(cv); setCartCount(cv?.totalQuantity || 0) } catch {}
    }
    return gid
  }

  const getStoredCartId = (): string | null => {
    if (typeof window === 'undefined') return null
    return normalizeCartId(window.localStorage.getItem(CART_KEY))
  }

  const refresh = async () => {
    setLoading(true)
    try {
      if (user) {
        try {
          const me = await apiMeCartSyncSummaryRelative(undefined)
          setCart(me); setCartCount(me?.totalQuantity || 0); return
        } catch { try { const meAbs = await apiMeGetCart(); setCart(meAbs); setCartCount(meAbs?.totalQuantity || 0); return } catch {} }
      }
      let id = typeof window !== 'undefined' ? normalizeCartId(window.localStorage.getItem(CART_KEY)) || undefined : undefined
      if (!id) {
        try { const created = await apiCreateGuestCart(); id = created.cartId; window.localStorage.setItem(CART_KEY, id) } catch {}
      }
      if (!id) {
        if (LOCAL_FALLBACK) { const lc = readLocalCart(); setCart(lc); setCartCount(lc?.totalQuantity || 0); return }
        setCart(null); setCartCount(0); return
      }
      try {
        const cv = await apiCartSyncSummaryRelative(id, undefined)
        setCart(cv)
        setCartCount(cv?.totalQuantity || 0)
      } catch (e: any) {
        try { const cvAbs = await apiGetCart(id); setCart(cvAbs); setCartCount(cvAbs?.totalQuantity || 0); return } catch {}
        if (e?.status === 404) {
          try {
            const created = await apiCreateGuestCart(); const newId = created.cartId
            if (newId) { try { window.localStorage.setItem(CART_KEY, newId) } catch {} }
          } catch {}
        }
        if (LOCAL_FALLBACK) { const lc = readLocalCart(); setCart(lc); setCartCount(lc?.totalQuantity || 0) } else { setCart(null); setCartCount(0) }
      }
    } finally { setLoading(false) }
  }

  // After write endpoints, sync summary (server computes coupon + totals)
  const refetchAuthoritativeCart = async (hintId?: string | null) => {
    try {
      if (user) {
        try { const me = await apiMeCartSyncSummaryRelative(undefined); setCart(me); setCartCount(me?.totalQuantity || 0); return }
        catch { try { const meAbs = await apiMeGetCart(); setCart(meAbs); setCartCount(meAbs?.totalQuantity || 0); return } catch {} }
      }
      const id = hintId || getStoredCartId()
      if (id) {
        try { const cv = await apiCartSyncSummaryRelative(id, undefined); setCart(cv); setCartCount(cv?.totalQuantity || 0) }
        catch { try { const cvAbs = await apiGetCart(id); setCart(cvAbs); setCartCount(cvAbs?.totalQuantity || 0) } catch {} }
      }
    } catch {}
  }

  const fetchCurrentCart = async (): Promise<CartView | null> => {
    try {
      if (user) {
        try { return await apiMeGetCart() } catch {}
      }
      const id = typeof window !== 'undefined' ? window.localStorage.getItem(CART_KEY) || undefined : undefined
      if (!id) return null
      try { return await apiGetCart(id) } catch { return null }
    } catch { return null }
  }

  const addToCart = async (productId: string, quantity: number, meta?: { totals?: CartTotals }): Promise<boolean> => {
    // Unified flow: always resolve the effective cart id (for auth, GET /api/me/cart creates/returns one)
    const id = await getEffectiveCartId()
    if (!id && !LOCAL_FALLBACK) return false
    try {
      if (id) {
        const path = `/api/carts/${encodeURIComponent(id)}/items`
        try {
          const res = await postJsonRelative<CartView>(path, { productId, quantity })
          setCart(res); setCartCount(res?.totalQuantity || 0)
          await refetchAuthoritativeCart(id)
          return true
        } catch (err: any) {
          if (!user && (err?.status === 404 || err?.status === 409)) {
            // Guest cart missing; re-provision once
            const created = await apiCreateGuestCart(); const newId = created.cartId; if (newId) { try { window.localStorage.setItem(CART_KEY, newId) } catch {} }
            const res2 = await postJsonRelative<CartView>(`/api/carts/${encodeURIComponent(newId)}/items`, { productId, quantity })
            setCart(res2); setCartCount(res2?.totalQuantity || 0)
            await refetchAuthoritativeCart(newId)
            return true
          }
          throw err
        }
      }
      throw new Error('NO_BACKEND')
    } catch {
      return false
    }
  }

  const removeFromCart = async (productId: string, meta?: { totals?: CartTotals }): Promise<boolean> => {
    const id = await getEffectiveCartId()
    if (!id && !LOCAL_FALLBACK) return false
    try {
      if (id) {
        const res = await apiCartRemoveItem(id, productId, { userId: user?.id || undefined, totals: meta?.totals })
        setCart(res); setCartCount(res?.totalQuantity || 0)
        await refetchAuthoritativeCart(id)
        return true
      }
      throw new Error('NO_BACKEND')
    } catch {
      if (LOCAL_FALLBACK) {
        const cv = ensureLocalCart()
        cv.items = cv.items.filter((it) => it.productId !== productId)
        const totals = computeTotals(cv.items)
        cv.totalQuantity = totals.totalQuantity; cv.subtotal = totals.subtotal; cv.total = totals.total
        writeLocalCart(cv)
        setCart(cv); setCartCount(cv.totalQuantity || 0)
        return true
      }
      return false
    }
  }

  const updateCartItem = async (productId: string, quantity: number, meta?: { totals?: CartTotals }): Promise<boolean> => {
    const id = await getEffectiveCartId()
    if (!id && !LOCAL_FALLBACK) return false
    try {
      if (id) {
        const res = await apiCartUpdateItem(id, productId, quantity, { userId: user?.id || undefined, totals: meta?.totals })
        setCart(res); setCartCount(res?.totalQuantity || 0); return true
      }
      throw new Error('NO_BACKEND')
    } catch {
      if (LOCAL_FALLBACK) {
        try {
          const mod = await import('./store') as any
          const prod = mod.getProductById?.(productId)
          const cv = ensureLocalCart()
          if (!prod) {
            // If product missing, removing the item locally
            cv.items = cv.items.filter((it) => it.productId !== productId)
          } else {
            const existing = cv.items.find((it) => it.productId === productId)
            const clamp = Math.max(0, Math.min(prod.stock, quantity))
            if (clamp <= 0) {
              cv.items = cv.items.filter((it) => it.productId !== productId)
            } else if (existing) {
              existing.quantity = clamp
              existing.price = prod.price
              existing.discountedPrice = prod.discountedPrice
              existing.stock = prod.stock
              existing.lineTotal = (prod.discountedPrice ?? prod.price) * clamp
            } else {
              cv.items.push({ id: productId, productId, name: prod.name, price: prod.price, discountedPrice: prod.discountedPrice, stock: prod.stock, quantity: clamp, lineTotal: (prod.discountedPrice ?? prod.price) * clamp })
            }
          }
          const totals = computeTotals(cv.items)
          cv.totalQuantity = totals.totalQuantity; cv.subtotal = totals.subtotal; cv.total = totals.total
          writeLocalCart(cv)
          setCart(cv); setCartCount(cv.totalQuantity || 0)
          return true
        } catch {}
      }
      return false
    }
  }

  // Merge guest cart on login, then refresh
  useEffect(() => {
    (async () => {
      if (!mounted) return
      try {
        if (user) {
          const id = typeof window !== 'undefined' ? window.localStorage.getItem(CART_KEY) || '' : ''
          if (id) {
            try {
              const merged = await apiMeCartMerge(id, 'sum')
              try { window.localStorage.removeItem(CART_KEY) } catch {}
              if (merged) { setCart(merged); setCartCount(merged?.totalQuantity || 0) }
            } catch {}
          }
        }
      } finally {
        await refresh()
      }
    })()
  }, [user, mounted])

  return (
    <CartContext.Provider value={{ cart, loading, refresh,
      resetClientCart: () => {
        try {
          if (typeof window !== 'undefined') {
            window.localStorage.removeItem(CART_KEY)
            window.localStorage.removeItem('cartId')
            window.localStorage.removeItem(LOCAL_CART_KEY)
            // Also clear legacy mock cart store if present
            try { window.localStorage.setItem('cart', '[]') } catch {}
          }
        } catch {}
        const empty: CartView = { id: cart?.id || 'cart-cleared', userId: user?.id || null as any, items: [], totalQuantity: 0, subtotal: 0, discountAmount: 0, total: 0 }
        setCart(empty); setCartCount(0)
      },
      addToCart,
      updateCartItem: async (productId, quantity) => {
        const id = (cart?.id || getStoredCartId() || (await ensureGuestCart())); if (!id) return false
        // Optimistic UI: update local cart quantity immediately
        const prev = cart
        if (prev) {
          try {
            const items = [...(prev.items || [])]
            const idx = items.findIndex((it) => String(it.productId) === String(productId) || String((it as any).id) === String(productId))
            if (idx >= 0) {
              if (quantity <= 0) {
                items.splice(idx, 1)
              } else {
                items[idx] = { ...items[idx], quantity }
              }
              const totals = computeTotals(items as any)
              setCart({ ...prev, items: items as any, totalQuantity: totals.totalQuantity, subtotal: totals.subtotal, total: totals.total })
              setCartCount(totals.totalQuantity || 0)
            }
          } catch {}
        }
        try { const res = await apiCartUpdateItemRelative(id, productId, quantity); setCart(res); setCartCount(res?.totalQuantity || 0); await refetchAuthoritativeCart(id); return true } catch (err: any) {
          // If backend says item not in cart, fall back to add with target quantity
          if (err?.status === 404 && quantity > 0) {
            try { const res2 = await postJsonRelative<CartView>(`/api/carts/${encodeURIComponent(id)}/items`, { productId, quantity }); setCart(res2); setCartCount(res2?.totalQuantity || 0); await refetchAuthoritativeCart(id); return true } catch {}
          }
          if (LOCAL_FALLBACK) {
            try {
              const mod = await import('./store') as any
              const prod = mod.getProductById?.(productId)
              const cv = ensureLocalCart()
              if (!prod) { cv.items = cv.items.filter((it) => it.productId !== productId) }
              else {
                const existing = cv.items.find((it) => it.productId === productId)
                const clamp = Math.max(0, Math.min(prod.stock, quantity))
                if (clamp <= 0) { cv.items = cv.items.filter((it) => it.productId !== productId) }
                else if (existing) { existing.quantity = clamp; existing.price = prod.price; existing.discountedPrice = prod.discountedPrice; existing.stock = prod.stock; existing.lineTotal = (prod.discountedPrice ?? prod.price) * clamp }
                else { cv.items.push({ id: productId, productId, name: prod.name, price: prod.price, discountedPrice: prod.discountedPrice, stock: prod.stock, quantity: clamp, lineTotal: (prod.discountedPrice ?? prod.price) * clamp }) }
              }
              const totals = computeTotals(cv.items)
              cv.totalQuantity = totals.totalQuantity; cv.subtotal = totals.subtotal; cv.total = totals.total
              writeLocalCart(cv); setCart(cv); setCartCount(cv.totalQuantity || 0); return true
            } catch {}
          }
          return false
        }
      },
      removeFromCart: async (productId) => {
        const id = (cart?.id || getStoredCartId() || (await ensureGuestCart())); if (!id) return false
        // Optimistic remove
        const prev = cart
        if (prev) {
          try {
            const items = (prev.items || []).filter((it) => String(it.productId) !== String(productId) && String((it as any).id) !== String(productId)) as any
            const totals = computeTotals(items)
            setCart({ ...prev, items, totalQuantity: totals.totalQuantity, subtotal: totals.subtotal, total: totals.total })
            setCartCount(totals.totalQuantity || 0)
          } catch {}
        }
        try { const res = await apiCartRemoveItemRelative(id, productId); setCart(res); setCartCount(res?.totalQuantity || 0); await refetchAuthoritativeCart(id); return true } catch {
          if (LOCAL_FALLBACK) {
            const cv = ensureLocalCart(); cv.items = cv.items.filter((it) => it.productId !== productId)
            const totals = computeTotals(cv.items); cv.totalQuantity = totals.totalQuantity; cv.subtotal = totals.subtotal; cv.total = totals.total
            writeLocalCart(cv); setCart(cv); setCartCount(cv.totalQuantity || 0); return true
          }
          return false
        }
      },
      applyCoupon: async (code) => {
        try {
          const totalsHint = { subtotal: cart?.subtotal ?? 0, discountAmount: cart?.discountAmount ?? 0, total: cart?.total ?? (cart?.subtotal ?? 0) }
          if (user) {
            try { const res = await apiMeCartSyncSummaryRelative(code); setCart(res); setCartCount(res?.totalQuantity || 0); await refetchAuthoritativeCart(); return true }
            catch { try { const resAbs = await apiMeGetCart(); setCart(resAbs); setCartCount(resAbs?.totalQuantity || 0); return true } catch {} }
          }
          const id = (cart?.id || getStoredCartId() || (await ensureGuestCart()));
          if (!id) return false
          try { const res = await apiCartSyncSummaryRelative(id, code); setCart(res); setCartCount(res?.totalQuantity || 0); await refetchAuthoritativeCart(id); return true }
          catch { try { const resAbs = await apiGetCart(id); setCart(resAbs); setCartCount(resAbs?.totalQuantity || 0); return true } catch {} }
        } catch {
          if (LOCAL_FALLBACK) { const cv = ensureLocalCart(); cv.appliedCouponCode = code.toUpperCase(); cv.discountAmount = 0; const totals = computeTotals(cv.items); cv.subtotal = totals.subtotal; cv.totalQuantity = totals.totalQuantity; cv.total = totals.total; writeLocalCart(cv); setCart(cv); setCartCount(cv.totalQuantity || 0); return true }
          return false
        }
      },
      removeCoupon: async () => {
        try {
          if (user) {
            // Use explicit DELETE endpoint per cart-integration-guide
            try { const res = await apiMeCartRemoveCouponRelative(); setCart(res); setCartCount(res?.totalQuantity || 0); await refetchAuthoritativeCart(); return true } catch {}
            // Fallback to summary sync variants
            try { const res = await apiMeCartSyncSummaryRelative(null); setCart(res); setCartCount(res?.totalQuantity || 0); await refetchAuthoritativeCart(); return true } catch {}
            try { const res = await apiMeCartSyncSummaryRelative(''); setCart(res); setCartCount(res?.totalQuantity || 0); await refetchAuthoritativeCart(); return true } catch {}
            try { const res = await apiMeCartSyncSummaryRelative(undefined); setCart(res); setCartCount(res?.totalQuantity || 0); await refetchAuthoritativeCart(); return true } catch {}
            try { const meAbs = await apiMeGetCart(); setCart(meAbs); setCartCount(meAbs?.totalQuantity || 0); return true } catch {}
          }
          const id = (cart?.id || getStoredCartId() || (await ensureGuestCart()));
          if (!id) return false
          try { const res = await apiCartRemoveCouponRelative(id); setCart(res); setCartCount(res?.totalQuantity || 0); await refetchAuthoritativeCart(id); return true } catch {}
          try { const res = await apiCartSyncSummaryRelative(id, null); setCart(res); setCartCount(res?.totalQuantity || 0); await refetchAuthoritativeCart(id); return true } catch {}
          try { const res = await apiCartSyncSummaryRelative(id, ''); setCart(res); setCartCount(res?.totalQuantity || 0); await refetchAuthoritativeCart(id); return true } catch {}
          try { const res = await apiCartSyncSummaryRelative(id, undefined); setCart(res); setCartCount(res?.totalQuantity || 0); await refetchAuthoritativeCart(id); return true } catch {}
          try { const resAbs = await apiGetCart(id); setCart(resAbs); setCartCount(resAbs?.totalQuantity || 0); return true } catch {}
        } catch {
          if (LOCAL_FALLBACK) { const cv = ensureLocalCart(); cv.appliedCouponCode = null as any; cv.discountAmount = 0; const totals = computeTotals(cv.items); cv.subtotal = totals.subtotal; cv.totalQuantity = totals.totalQuantity; cv.total = totals.total; writeLocalCart(cv); setCart(cv); setCartCount(cv.totalQuantity || 0); return true }
          return false
        }
      },
      clearCart: async () => {
        const id = (cart?.id || getStoredCartId() || (await ensureGuestCart())); if (!id) return false
        try { const res = await apiCartClearRelative(id); setCart(res); setCartCount(res?.totalQuantity || 0); await refetchAuthoritativeCart(id); return true } catch {
          if (LOCAL_FALLBACK) { const cv = ensureLocalCart(); cv.items = []; cv.appliedCouponCode = null as any; cv.discountAmount = 0; const totals = computeTotals(cv.items); cv.totalQuantity = totals.totalQuantity; cv.subtotal = totals.subtotal; cv.total = totals.total; writeLocalCart(cv); setCart(cv); setCartCount(cv.totalQuantity || 0); return true }
          return false
        }
      },
      cartCount }}>
      {children}
    </CartContext.Provider>
  )
}

export function useCart() {
  const context = useContext(CartContext)
  if (!context) {
    throw new Error("useCart must be used within CartProvider")
  }
  return context
}








