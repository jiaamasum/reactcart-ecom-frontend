"use client"

import { useEffect, useMemo, useState } from "react"
import { apiGetProduct, apiValidateCoupon, type ProductDetail } from "@/lib/api"
import { useCart } from "@/lib/cart-context"
import { useAuth } from "@/lib/auth-context"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { Trash2 } from "lucide-react"
import Image from "next/image"
import { useRouter } from "next/navigation"
import { useCurrency } from "@/lib/currency-context"

export default function CartPage() {
  const router = useRouter()
  const { formatPrice } = useCurrency()
  const { user } = useAuth()
  const { cart, loading, refresh, updateCartItem: ctxUpdateCartItem, removeFromCart: ctxRemoveFromCart, applyCoupon: ctxApplyCoupon, removeCoupon: ctxRemoveCoupon } = useCart()
  const [productMap, setProductMap] = useState<Record<string, ProductDetail | null>>({})
  const [couponCode, setCouponCode] = useState("")
  const [couponError, setCouponError] = useState("")
  const [couponPreview, setCouponPreview] = useState<{ valid?: boolean; message?: string; amount?: number } | null>(null)
  const [validatingCoupon, setValidatingCoupon] = useState(false)

  useEffect(() => { (async () => { await refresh() })() }, [user])

  // Helper to refresh cart view from server after a change so totals stay in sync
  const refreshCartView = async () => { await refresh() }

  const cartItems = useMemo(() => cart?.items || [], [cart])
  const subtotal = cart?.subtotal || 0
  const discount = cart?.discountAmount || 0
  const hasDiscount = (discount || 0) > 0
  const total = cart?.total || subtotal

  // Live coupon validation using public endpoint (docs/public-coupons.md)
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const code = couponCode.trim().toUpperCase()
      if (!code) { setCouponPreview(null); setCouponError(""); return }
      try {
        setValidatingCoupon(true); setCouponError("")
        const productIds = (cartItems || []).map((it) => it.productId).filter(Boolean)
        const preview: any = await apiValidateCoupon(code, { customerId: user?.id || undefined, productIds, subtotal })
        if (cancelled) return
        if (preview && preview.valid === false) {
          setCouponPreview({ valid: false, message: preview.message || "Coupon not applicable" })
        } else {
          const amount = typeof preview?.discountAmount === 'number' ? preview.discountAmount : undefined
          setCouponPreview({ valid: true, message: preview?.message || "Coupon valid", amount })
        }
      } catch { if (!cancelled) setCouponPreview(null) }
      finally { if (!cancelled) setValidatingCoupon(false) }
    })()
    return () => { cancelled = true }
  }, [couponCode, subtotal, cartItems, user?.id])

  // Enrich cart items with product details to show images/names if not provided by backend
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

  const handleApplyCoupon = async () => {
    setCouponError("")
    if (!couponCode.trim()) {
      setCouponError("Please enter a coupon code")
      return
    }
    try {
      const code = couponCode.toUpperCase()
      // Validate coupon first via public endpoint per docs/public-coupons.md
      try {
        const productIds = (cartItems || []).map((it) => it.productId).filter(Boolean)
        const preview = await apiValidateCoupon(code, { customerId: user?.id || undefined, productIds, subtotal })
        if ((preview as any)?.valid === false) {
          setCouponError((preview as any)?.message || "Coupon not applicable")
          return
        }
      } catch { /* ignore preview errors; server will respond on apply */ }

      const ok = await ctxApplyCoupon(code, { totals: { subtotal, discountAmount: discount, total } })
      if (!ok) setCouponError('Invalid coupon')
      else setCouponCode("")
    } catch (err: any) {
      setCouponError(err?.message || 'Invalid coupon')
    }
  }

  const handleRemoveCoupon = async () => { await ctxRemoveCoupon({ totals: { subtotal, discountAmount: discount, total } }); }

  const handleCheckout = () => {
    router.push("/checkout")
  }

  if (loading) {
    return (
      <div className="flex flex-col">
        <div className="flex-1">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <p className="text-muted-foreground">Loading cart...</p>
          </div>
        </div>
        <Footer />
      </div>
    )
  }

  if (!cart || cartItems.length === 0) {
    return (
      <div className="flex flex-col">
        <div className="flex-1">
          <div className="max-w-7xl mx-auto px-4 py-8">
            <h1 className="text-4xl font-bold mb-8">Shopping Cart</h1>
            <Card>
              <CardContent className="pt-12 pb-12 text-center">
                <p className="text-muted-foreground text-lg mb-6">Your cart is empty</p>
                <Link href="/shop">
                  <Button>Continue Shopping</Button>
                </Link>
              </CardContent>
            </Card>
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
          <h1 className="text-4xl font-bold mb-8">Shopping Cart</h1>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => (
                <Card key={item.productId}>
                  <CardContent className="pt-6 flex gap-4">
                    <div className="relative w-24 h-24 bg-secondary rounded overflow-hidden flex-shrink-0">
                      <Image
                        src={productMap[item.productId]?.primaryImageUrl || "/placeholder.svg"}
                        alt={productMap[item.productId]?.name || item.name || item.productId}
                        fill
                        className="object-cover"
                      />
                    </div>
                    <div className="flex-1">
                      <h3 className="font-semibold">{productMap[item.productId]?.name || item.name || item.productId}</h3>
                      <p className="text-sm text-muted-foreground mb-2">{formatPrice(productMap[item.productId]?.discountedPrice ?? productMap[item.productId]?.price ?? item.discountedPrice ?? item.price ?? 0)}</p>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async (e) => {
                            e.preventDefault(); e.stopPropagation()
                            const pid = (item as any).productId || (item as any).id
                            const nextQty = Math.max(0, (item.quantity || 0) - 1)
                            const ok = nextQty > 0
                              ? await ctxUpdateCartItem(String(pid), nextQty)
                              : await ctxRemoveFromCart(String(pid))
                            if (ok) { /* server response updates context */ }
                          }}
                        >
                          -
                        </Button>
                        <span className="w-8 text-center">{item.quantity}</span>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={async (e) => {
                            e.preventDefault(); e.stopPropagation()
                            const pid = (item as any).productId || (item as any).id
                            const nextQty = (item.quantity || 0) + 1
                            const ok = await ctxUpdateCartItem(String(pid), nextQty)
                            if (ok) { /* server response updates context */ }
                          }}
                        >
                          +
                        </Button>
                        <span className="ml-auto font-semibold">
                          {formatPrice((item.discountedPrice ?? item.price ?? 0) * item.quantity)}
                        </span>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" onClick={async (e) => {
                      e.preventDefault(); e.stopPropagation()
                      const pid = (item as any).productId || (item as any).id
                      await ctxRemoveFromCart(String(pid))
                    }}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Order Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span>{formatPrice(subtotal)}</span>
                    </div>
                    {hasDiscount && (
                      <div className="flex justify-between text-green-600">
                        <span>{cart.appliedCouponCode}</span>
                        <span>-{formatPrice(discount)}</span>
                      </div>
                    )}
                    <div className="border-t pt-2 flex justify-between font-bold text-lg">
                      <span>Total</span>
                      <span>{formatPrice(total)}</span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Coupon Code</label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter coupon code"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value)}
                        disabled={!!cart?.appliedCouponCode}
                      />
                      {cart?.appliedCouponCode ? (
                        <Button variant="outline" onClick={handleRemoveCoupon}>
                          Remove
                        </Button>
                      ) : (
                        <Button onClick={handleApplyCoupon} disabled={validatingCoupon || (couponPreview && couponPreview.valid === false)}>Apply</Button>
                      )}
                    </div>
                    {validatingCoupon && <p className="text-xs text-muted-foreground">Validating coupon…</p>}
                    {couponPreview && !couponError && (
                      <p className={`text-xs ${couponPreview.valid ? 'text-green-600' : 'text-destructive'}`}>
                        {couponPreview.message || (couponPreview.valid ? 'Coupon valid' : 'Coupon not applicable')}
                        {couponPreview.amount ? ` (est. discount ${formatPrice(couponPreview.amount)})` : ''}
                      </p>
                    )}
                    {couponError && <p className="text-sm text-destructive">{couponError}</p>}
                  </div>

                  <Button onClick={handleCheckout} className="w-full" size="lg">
                    Proceed to Checkout
                  </Button>
                  <Link href="/shop">
                    <Button variant="outline" className="w-full bg-transparent">
                      Continue Shopping
                    </Button>
                  </Link>
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
