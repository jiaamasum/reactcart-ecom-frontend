"use client"

import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { useParams, useSearchParams } from "next/navigation"
import { CheckCircle } from "lucide-react"
import { apiGetOrderByNumber, apiGetOrder, type OrderView } from "@/lib/api"
import { useCurrency } from "@/lib/currency-context"

export default function OrderByNumberPage() {
  const params = useParams() as { number?: string }
  const q = useSearchParams()
  const { formatPrice } = useCurrency()
  const [order, setOrder] = useState<OrderView | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      setLoading(true)
      try {
        const num = params?.number
        const id = q?.get('id') || undefined
        if (num) {
          try { const o = await apiGetOrderByNumber(String(num)); setOrder(o) } catch {
            if (id) {
              try { const o2 = await apiGetOrder(id); setOrder(o2) } catch { setOrder(null) }
            } else { setOrder(null) }
          }
        } else if (id) {
          const o = await apiGetOrder(id); setOrder(o)
        }
      } catch { setOrder(null) }
      finally { setLoading(false) }
    })()
  }, [params?.number, q])

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-muted-foreground">Loading order…</p>
      </div>
    )
  }

  if (!order) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <p className="text-muted-foreground">Order not found</p>
        <Link href="/shop"><Button className="mt-4">Back to shop</Button></Link>
      </div>
    )
  }

  const couponCode = (order as any).coupon?.code ?? order.couponCode ?? null
  const discount = (order as any).coupon?.discountAmount ?? order.discountAmount ?? (order as any).discount ?? 0
  const subtotal = order.subtotal ?? ((order.total || 0) + (discount || 0))
  const paymentLabel = (order.paymentMethod || '').toUpperCase() === 'CARD' ? 'Card' : 'Cash on Delivery'
  const numberFormatted = order.orderNumberFormatted || order.orderNumber || params?.number

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
        <h1 className="text-4xl font-bold mb-2">Order #{numberFormatted}</h1>
        <p className="text-muted-foreground">Thank you for your purchase</p>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Order Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-muted-foreground">Order ID</p>
              <p className="font-semibold">{order.id}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Order Date</p>
              <p className="font-semibold">{order.createdAt ? new Date(order.createdAt).toLocaleDateString() : '-'}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Payment Method</p>
              <p className="font-semibold">{paymentLabel}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Status</p>
              <p className="font-semibold capitalize">{order.status || 'pending'}</p>
            </div>
          </div>

          {order.shippingAddress && (
            <div className="border-t pt-4">
              <p className="text-sm text-muted-foreground mb-2">Shipping Address</p>
              <p className="font-semibold">{order.shippingAddress}</p>
            </div>
          )}

          <div className="border-t pt-4">
            <p className="text-sm text-muted-foreground mb-3">Items</p>
            <div className="space-y-2">
              {(order.items || []).map((item, idx) => (
                <div key={idx} className="flex justify-between">
                  <span>{item.name || item.productId}</span>
                  <span>
                    x{item.quantity} · {formatPrice((item.discountedPrice ?? item.price ?? 0) * (item.quantity || 0))}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t pt-4 space-y-2">
            <div className="flex justify-between">
              <span>Subtotal</span>
              <span>{formatPrice(subtotal)}</span>
            </div>
            {discount > 0 && (
              <div className="flex justify-between text-green-600">
                <span>Discount {couponCode ? `(${couponCode})` : ''}</span>
                <span>-{formatPrice(discount)}</span>
              </div>
            )}
            <div className="flex justify-between font-bold text-lg">
              <span>Total</span>
              <span>{formatPrice(order.total || 0)}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-4">
        <Link href="/shop" className="flex-1">
          <Button variant="outline" className="w-full bg-transparent">
            Continue Shopping
          </Button>
        </Link>
        <Link href="/orders" className="flex-1">
          <Button className="w-full">View My Orders</Button>
        </Link>
      </div>
    </div>
  )
}
