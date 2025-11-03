"use client"

import { useEffect, useMemo, useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { apiListMyOrders, apiCancelMyOrder, apiCancelMyOrderRelative, patchNoBodyRelative, apiFetchEnvelope, type OrderView } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { useCurrency } from "@/lib/currency-context"
import { useToast } from "@/hooks/use-toast"

export default function OrdersPage() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const { formatPrice } = useCurrency()
  const { toast } = useToast()
  const [orders, setOrders] = useState<OrderView[]>([])
  const [loading, setLoading] = useState(true)
  const [busyId, setBusyId] = useState<string | null>(null)
  const [disabledIds, setDisabledIds] = useState<Record<string, boolean>>({})

  const sortOrdersDesc = (arr: OrderView[]) => {
    return [...(arr || [])].sort((a, b) => {
      const ta = a?.createdAt ? Date.parse(a.createdAt) : 0
      const tb = b?.createdAt ? Date.parse(b.createdAt) : 0
      return tb - ta
    })
  }

  useEffect(() => {
    if (isLoading) return
    if (!user) { router.push('/login'); return }
    ;(async () => {
      setLoading(true)
      try { const list = await apiListMyOrders(); setOrders(sortOrdersDesc(list)) } catch { setOrders([]) }
      finally { setLoading(false) }
    })()
  }, [user, isLoading])

  const canCancel = (o: OrderView) => {
    if (!o?.status) return false
    const allowed = ['PENDING','CONFIRMED','IN_PROCESS']
    if (!allowed.includes(String(o.status).toUpperCase())) return false
    if (!o.createdAt) return false
    if (disabledIds[o.id]) return false
    try { const created = new Date(o.createdAt).getTime(); return (Date.now() - created) < 12*60*60*1000 } catch { return false }
  }

  const handleCancel = async (id: string) => {
    try {
      setBusyId(id)
      let upd: OrderView | null = null
      // Single-attempt strategy: try PATCH (no body). If the server doesn't allow PATCH (405) or the route isn't found (404),
      // try a single POST with empty JSON body. No further retries to avoid multiple calls.
      try {
        upd = await patchNoBodyRelative<OrderView>(`/api/me/orders/${encodeURIComponent(id)}/cancel`)
      } catch (err: any) {
        if (err?.status === 405 || err?.status === 404) {
          const api = await import("@/lib/api")
          upd = await api.postJsonRelative(`/api/me/orders/${encodeURIComponent(id)}/cancel`, {})
        } else {
          throw err
        }
      }
      toast({ title: 'Order cancelled', description: 'Your order was cancelled.' })
      if (upd) setOrders((prev) => prev.map((x) => x.id === id ? upd! : x))
      // Ensure UI is in sync with backend even if response is minimal
      try { const list = await apiListMyOrders(); setOrders(sortOrdersDesc(list)) } catch {}
    } catch (e: any) {
      const code = (e && (e.code || (e.message && String(e.message).includes('CANCEL_WINDOW_EXPIRED') ? 'CANCEL_WINDOW_EXPIRED' : undefined)))
      if (code === 'CANCEL_WINDOW_EXPIRED') {
        setDisabledIds((prev) => ({ ...prev, [id]: true }))
        toast({ title: 'Cancel window expired', description: e?.message || 'Orders can only be cancelled within 12 hours.' })
      } else if (e?.status === 403 || e?.status === 404) {
        toast({ title: 'Not allowed or not found', description: 'The order cannot be cancelled.' })
      } else {
        toast({ title: 'Unable to cancel', description: e?.message || 'Please try again later.' })
      }
    } finally { setBusyId(null) }
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-6">My Orders</h1>
      {loading ? (
        <p className="text-muted-foreground">Loading orders…</p>
      ) : orders.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-muted-foreground">No orders found.</CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => {
            const numberFormatted = (o as any).orderNumberFormatted ?? ((o as any).orderNumber ?? null)
            const discount = (o as any).discountAmount ?? ((o as any).discount ?? 0)
            const subtotal = (o as any).subtotal ?? ((o.total || 0) + (discount || 0))
            const total = o.total || 0
            return (
              <Card key={o.id}>
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    <span>Order {numberFormatted ? `#${numberFormatted}` : o.id}</span>
                    <span className="text-sm font-normal text-muted-foreground">{o.createdAt ? new Date(o.createdAt).toLocaleString() : ''}</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-center justify-between gap-4">
                  <div className="text-sm text-muted-foreground">
                    <div>Status: <span className="font-medium text-foreground">{o.status || 'PENDING'}</span></div>
                    <div>Subtotal: {formatPrice(subtotal)}</div>
                    {discount > 0 && <div>Discount: -{formatPrice(discount)}</div>}
                    <div className="font-semibold text-foreground">Total: {formatPrice(total)}</div>
                  </div>
                  <div className="flex gap-2">
                    <Link href={numberFormatted ? `/order/${encodeURIComponent(numberFormatted)}?id=${encodeURIComponent(o.id)}` : `/order-confirmation/${encodeURIComponent(o.id)}`}>
                      <Button variant="outline">View</Button>
                    </Link>
                    {canCancel(o) && (
                      <Button variant="destructive" disabled={busyId === o.id} onClick={() => handleCancel(o.id)}>
                        {busyId === o.id ? 'Cancelling…' : 'Cancel'}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
