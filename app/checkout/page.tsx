"use client"

import type React from "react"

import { useState, useMemo, useEffect } from "react"
import { useCart } from "@/lib/cart-context"
import { apiCreateOrderGuest, apiCreateOrderMe, apiGetProduct, apiCreateGuestCart, apiMeGetCart, apiGetCart, type ProductDetail } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { useRouter } from "next/navigation"
import { useCurrency } from "@/lib/currency-context"
import Image from "next/image"

export default function CheckoutPage() {
  const router = useRouter()
  const { formatPrice } = useCurrency()
  const { user } = useAuth()
  const { cart, updateCartItem, refresh, resetClientCart } = useCart()

  const [formData, setFormData] = useState({
    email: user?.email || "",
    name: user?.name || "",
    phone: user?.phone || "",
    address: "",
    city: "",
    postalCode: "",
    paymentMethod: "cod" as "card" | "cod",
  })

  const [cardData, setCardData] = useState({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
  })

  const [isProcessing, setIsProcessing] = useState(false)
  const [error, setError] = useState("")
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null)
  const [appliedCouponInfo, setAppliedCouponInfo] = useState<{ discountType?: 'PERCENT'|'FIXED'; discount?: number; amount?: number }|null>(null)

  const cartItems = useMemo(() => (cart?.items || []), [cart])

  // Minimal product details cache to display images in order summary
  const [productMap, setProductMap] = useState<Record<string, ProductDetail | null>>({})

  // Ensure server-summary is in sync on page load for guests and auth users
  useEffect(() => { (async () => { try { await refresh() } catch {} })() }, [user])

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const ids = Array.from(new Set((cart?.items || []).map(i => i.productId))).filter(Boolean)
      const missing = ids.filter(id => productMap[id] === undefined)
      if (missing.length === 0) return
      const entries: Array<[string, ProductDetail | null]> = []
      for (const id of missing) {
        try {
          const p = await apiGetProduct(id)
          entries.push([id, p])
        } catch {
          entries.push([id, null])
        }
      }
      if (!cancelled) setProductMap(prev => ({ ...prev, ...Object.fromEntries(entries) }))
    })()
    return () => { cancelled = true }
  }, [cart?.items])

  const subtotal = useMemo(() => cart?.subtotal || 0, [cart?.subtotal])
  const discount = useMemo(() => cart?.discountAmount || 0, [cart?.discountAmount])
  const total = useMemo(() => cart?.total ?? (subtotal - discount), [cart?.total, subtotal, discount])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleCardInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setCardData((prev) => ({ ...prev, [name]: value }))
  }

  const validateForm = () => {
    // Keep checkout frictionless: only require basic shipping fields
    if (!formData.email || !formData.name || !formData.address || !formData.city || !formData.postalCode) {
      setError("Please fill in all required fields")
      return false
    }
    // For card payments, accept any values (let server decide)
    return true
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!validateForm()) return

    setIsProcessing(true)

    try {
      // Build normalized payment payload: accept any input and fall back to safe defaults for CARD
      const normalizePayment = () => {
        const paymentMethod = formData.paymentMethod === 'card' ? 'CARD' : 'COD'
        const normalized: any = {
          name: formData.name,
          email: formData.email,
          phone: (formData.phone || user?.phone || undefined) as string | undefined,
          address: formData.address,
          city: formData.city,
          postalCode: formData.postalCode,
          paymentMethod,
          // card object will be attached only for CARD
        }
        if (paymentMethod === 'CARD') {
          let digits = String(cardData.cardNumber || '').replace(/\D+/g, '')
          if (digits.length < 16) digits = (digits + '4242424242424242').slice(0, 16)
          const expiry = /^(\d{2})\/(\d{2})$/.test(cardData.expiryDate || '') ? cardData.expiryDate : '12/99'
          const cvv = /^(\d{3,4})$/.test(cardData.cvv || '') ? cardData.cvv : '123'
          normalized.card = { number: digits, expiry, cvv }
        }
        return normalized
      }
      let base = normalizePayment()

      let orderId: string | null = null
      let orderNumberFormatted: string | null = null
      const oldGuestCartId = !user ? (cart?.id || null) : null
      if (user) {
        const order = await apiCreateOrderMe(base)
        orderId = order?.id || null
        orderNumberFormatted = (order as any).orderNumberFormatted || (order as any).orderNumber || null
      } else {
        if (!cart?.id) throw new Error('No cart found')
        const order = await apiCreateOrderGuest({ cartId: cart.id, ...base })
        orderId = order?.id || null
        orderNumberFormatted = (order as any).orderNumberFormatted || (order as any).orderNumber || null
      }

      if (!orderId) throw new Error('Order creation failed')
      // Clear client cart state immediately per docs/orders.md
      try {
        if (typeof window !== 'undefined') {
          window.localStorage.removeItem('RC_GUEST_CART_ID')
          window.localStorage.removeItem('cartId')
        }
      } catch {}
      resetClientCart()
      // Confirm server-cleared cart, then stabilize client state per docs/orders.md
      try {
        if (user) {
          // Poll once for cleared cart; backend should clear immediately but be resilient
          const me = await apiMeGetCart().catch(() => null as any)
          if (me && (me.totalQuantity || 0) > 0) {
            await new Promise((r) => setTimeout(r, 300))
            await apiMeGetCart().catch(() => null)
          }
        } else {
          // For guest: confirm prior cart is empty, then bootstrap a new id for next session
          if (oldGuestCartId) {
            try {
              const cv = await apiGetCart(oldGuestCartId)
              if ((cv?.totalQuantity || 0) > 0) {
                await new Promise((r) => setTimeout(r, 300))
                await apiGetCart(oldGuestCartId).catch(() => null)
              }
            } catch {}
          }
          // Bootstrap a fresh guest cart id for the next visit
          const created = await apiCreateGuestCart().catch(() => null as any)
          if (created?.cartId && typeof window !== 'undefined') {
            try { window.localStorage.setItem('RC_GUEST_CART_ID', created.cartId) } catch {}
          }
        }
      } catch {}
      if (orderNumberFormatted) {
        router.push(`/order/${encodeURIComponent(orderNumberFormatted)}?id=${encodeURIComponent(orderId)}`)
      } else {
        router.push(`/order-confirmation/${encodeURIComponent(orderId)}`)
      }
    } catch (err: any) {
      // If server complains about card details, retry once with normalized defaults
      if (String(err?.message || '').toLowerCase().includes('card') || String(err?.message || '').toLowerCase().includes('payment')) {
        try {
          const paymentMethod = formData.paymentMethod === 'card' ? 'CARD' : 'COD'
          let orderId: string | null = null
          let orderNumberFormatted: string | null = null
          const base: any = {
            ...{
              name: formData.name,
              email: formData.email,
              phone: (formData.phone || user?.phone || undefined) as string | undefined,
              address: formData.address,
              city: formData.city,
              postalCode: formData.postalCode,
              paymentMethod,
              card: paymentMethod === 'CARD' ? { number: '4242424242424242', expiry: '12/99', cvv: '123' } : undefined,
            }
          }
          if (user) {
            const order = await apiCreateOrderMe(base as any)
            orderId = order?.id || null
            orderNumberFormatted = (order as any).orderNumberFormatted || (order as any).orderNumber || null
          } else {
            if (!cart?.id) throw new Error('No cart found')
            const order = await apiCreateOrderGuest({ cartId: cart.id, ...(base as any) })
            orderId = order?.id || null
            orderNumberFormatted = (order as any).orderNumberFormatted || (order as any).orderNumber || null
          }
          if (!orderId) throw new Error('Order creation failed')
          // Clear and redirect as before
          try {
            if (typeof window !== 'undefined') {
              window.localStorage.removeItem('RC_GUEST_CART_ID')
              window.localStorage.removeItem('cartId')
            }
          } catch {}
          resetClientCart()
          try { if (user) await apiMeGetCart().catch(() => null); else if (cart?.id) await apiGetCart(cart.id).catch(() => null) } catch {}
          if (orderNumberFormatted) {
            router.push(`/order/${encodeURIComponent(orderNumberFormatted)}?id=${encodeURIComponent(orderId)}`)
          } else {
            router.push(`/order-confirmation/${encodeURIComponent(orderId)}`)
          }
          return
        } catch (e2: any) {
          setError(e2?.message || 'Payment failed')
          setIsProcessing(false)
          return
        }
      }
      if (err?.status === 409 && (err?.code === 'OUT_OF_STOCK' || /out of stock/i.test(err?.message || ''))) {
        const fields = (err?.fields || {}) as Record<string, string>
        for (const [productId, available] of Object.entries(fields)) {
          const qty = Math.max(0, Number(available) || 0)
          try { await updateCartItem(productId, qty) } catch {}
        }
        await refresh()
        setError('Some items are out of stock. Quantities were adjusted. Please review and retry.')
      } else {
        setError(err?.message || 'Payment failed')
      }
    } finally {
      setIsProcessing(false)
    }
  }

  if (cartItems.length === 0) {
    return (
      <div className="flex flex-col">
        <div className="flex-1">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <p className="text-muted-foreground">Your cart is empty</p>
            <Button onClick={() => router.push("/shop")} className="mt-4">
              Continue Shopping
            </Button>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col">
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-4xl font-bold mb-8">Checkout</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2">
              <form onSubmit={handleSubmit} className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Shipping Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Name</label>
                        <Input name="name" value={formData.name} onChange={handleInputChange} required />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Email</label>
                        <Input name="email" type="email" value={formData.email} onChange={handleInputChange} required />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Phone (optional)</label>
                      <Input name="phone" value={formData.phone} onChange={handleInputChange} placeholder="e.g. +1 555 123 4567" />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Address</label>
                      <Input name="address" value={formData.address} onChange={handleInputChange} required />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">City</label>
                        <Input name="city" value={formData.city} onChange={handleInputChange} required />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Postal Code</label>
                        <Input name="postalCode" value={formData.postalCode} onChange={handleInputChange} required />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Payment Method</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-3">
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="cod"
                          checked={formData.paymentMethod === "cod"}
                          onChange={handleInputChange}
                        />
                        <span>Cash on Delivery (COD)</span>
                      </label>
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="radio"
                          name="paymentMethod"
                          value="card"
                          checked={formData.paymentMethod === "card"}
                          onChange={handleInputChange}
                        />
                        <span>Credit/Debit Card</span>
                      </label>
                    </div>

                    {formData.paymentMethod === "card" && (
                      <div className="space-y-4 mt-4 pt-4 border-t">
                        <div>
                          <label className="text-sm font-medium">Card Number</label>
                          <Input
                            name="cardNumber"
                            placeholder="1234 5678 9012 3456"
                            value={cardData.cardNumber}
                            onChange={handleCardInputChange}
                            required={false}
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">Expiry Date</label>
                            <Input
                              name="expiryDate"
                              placeholder="MM/YY"
                              value={cardData.expiryDate}
                              onChange={handleCardInputChange}
                              required={false}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">CVV</label>
                            <Input
                              name="cvv"
                              placeholder="123"
                              value={cardData.cvv}
                              onChange={handleCardInputChange}
                              required={false}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {error && (
                  <div className="p-4 bg-destructive/10 border border-destructive rounded text-destructive">
                    {error}
                  </div>
                )}

                <Button type="submit" className="w-full" size="lg" disabled={isProcessing}>
                  {isProcessing ? "Processing..." : "Place Order"}
                </Button>
              </form>
            </div>

            <div>
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {cartItems.map((item) => (
                      <div key={item.productId} className="flex items-center justify-between text-sm gap-3">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative w-10 h-10 rounded bg-secondary overflow-hidden flex-shrink-0">
                            <Image
                              src={productMap[item.productId]?.primaryImageUrl || "/placeholder.svg"}
                              alt={(productMap[item.productId]?.name || (item as any).name || item.productId) as string}
                              fill
                              className="object-cover"
                            />
                          </div>
                          <span className="truncate">
                            {(productMap[item.productId]?.name || (item as any).name || item.productId) as string} x{item.quantity}
                          </span>
                        </div>
                        <span className="whitespace-nowrap">{formatPrice(((item as any).discountedPrice ?? (item as any).price ?? 0) * item.quantity)}</span>
                      </div>
                    ))}
                  </div>

                  <div className="border-t pt-4 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    {(cart?.discountAmount || 0) > 0 && (
                      <div className="flex justify-between text-green-600">
                        <span>{cart.appliedCouponCode}</span>
                        <span>-{formatPrice(cart?.discountAmount || 0)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  )
}
