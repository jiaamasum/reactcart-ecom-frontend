"use client"

import { useEffect, useState, useCallback } from "react"
import { apiAdminSearchOrders, apiAdminUpdateOrderStatus, apiAdminDeleteOrder, type OrderView } from "@/lib/api"
import { useToast } from "@/hooks/use-toast"
import { useCurrency } from "@/lib/currency-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Package, Clock, CheckCircle, XCircle, ChevronDown, Trash2, Search } from "lucide-react"
import { Modal } from "@/components/modal-dialog"
import { Input } from "@/components/ui/input"

export default function AdminOrdersPage() {
  const { toast } = useToast()
  const { formatPrice } = useCurrency()
  const [orders, setOrders] = useState<OrderView[]>([])
  const [loading, setLoading] = useState(true)
  const [filterStatus, setFilterStatus] = useState<'ALL'|'PENDING'|'CONFIRMED'|'IN_PROCESS'|'DELIVERED'|'CANCELLED'>('ALL')
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null)
  const [statusChangeModal, setStatusChangeModal] = useState<{ orderId: string; newStatus: OrderView['status'] } | null>(null)
  const [statusDropdown, setStatusDropdown] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [q, setQ] = useState("")
  const [minTotal, setMinTotal] = useState<string>("")
  const [maxTotal, setMaxTotal] = useState<string>("")

  const [page, setPage] = useState(0)
  const [size, setSize] = useState(10)
  const [totalPages, setTotalPages] = useState(0)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await apiAdminSearchOrders({
        status: filterStatus,
        search: q || undefined,
        minTotal: minTotal ? parseFloat(minTotal) : undefined,
        maxTotal: maxTotal ? parseFloat(maxTotal) : undefined,
        page,
        size,
        sort: 'createdAt,DESC',
      })
      setOrders(res.items || [])
      const meta = (res as any).meta || {}
      const computedTotalPages = (typeof meta.totalPages === 'number' && meta.totalPages) ? meta.totalPages : (
        typeof meta.total === 'number' && size ? Math.max(1, Math.ceil(meta.total / size)) : 0
      )
      setTotalPages(computedTotalPages)
    } catch { setOrders([]) }
    finally { setLoading(false) }
  }, [filterStatus, q, minTotal, maxTotal, page, size])

  useEffect(() => { load() }, [load])

  const filteredOrders = orders

  const handleStatusChange = async (orderId: string, newStatus: OrderView['status']) => {
    try {
      await apiAdminUpdateOrderStatus(orderId, newStatus as any)
      try { toast({ title: 'Status updated', description: `Status set to ${String(newStatus || '').replace('_',' ')}` }) } catch {}
    } catch (err: any) {
      try { toast({ title: 'Update failed', description: err?.message || 'Unexpected error', variant: 'destructive' }) } catch {}
    }
    try { const res = await apiAdminSearchOrders({ status: filterStatus, search: q || undefined, minTotal: minTotal ? parseFloat(minTotal) : undefined, maxTotal: maxTotal ? parseFloat(maxTotal) : undefined, page, size, sort: 'createdAt,DESC' }); setOrders(res.items || []) } catch {}
    setStatusChangeModal(null); setStatusDropdown(null)
  }

  const handleDeleteOrder = async (orderId: string) => {
    try {
      await apiAdminDeleteOrder(orderId)
      try { toast({ title: 'Order deleted' }) } catch {}
    } catch (err: any) {
      try { toast({ title: 'Delete failed', description: err?.message || 'Unexpected error', variant: 'destructive' }) } catch {}
    }
    await load()
    setDeleteConfirm(null)
  }

  const getStatusIcon = (status: string) => {
    const s = String(status).toUpperCase()
    switch (s) {
      case "DELIVERED":
        return <CheckCircle className="w-5 h-5 text-green-600" />
      case "PENDING":
      case "CONFIRMED":
      case "IN_PROCESS":
        return <Clock className="w-5 h-5 text-yellow-600" />
      case "CANCELLED":
        return <XCircle className="w-5 h-5 text-red-600" />
      default:
        return <Package className="w-5 h-5" />
    }
  }

  const getStatusColor = (status: string) => {
    const s = String(status).toUpperCase()
    switch (s) {
      case "DELIVERED":
        return "bg-green-100 text-green-800"
      case "PENDING":
      case "CONFIRMED":
      case "IN_PROCESS":
        return "bg-yellow-100 text-yellow-800"
      case "CANCELLED":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Manage Orders</h1>
        <p className="text-gray-600 mt-1">Total Orders: {orders.length}</p>
      </div>
      {/* Pagination */}
      <div className="flex items-center justify-between mt-4">
        <div className="text-sm text-muted-foreground">Page {page + 1} of {Math.max(totalPages, 1)}</div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" disabled={page <= 0} onClick={()=> setPage((p)=> Math.max(p-1,0))}>Prev</Button>
          <Button variant="outline" size="sm" disabled={page >= totalPages-1} onClick={()=> setPage((p)=> Math.min(p+1, Math.max(totalPages-1,0)))}>Next</Button>
        </div>
      </div>

      <div className="flex gap-2 mb-4 flex-wrap items-center">
        <div className="relative">
          <Input placeholder="Search email, name, number, coupon" value={q} onChange={(e) => setQ(e.target.value)} className="pr-8 w-64" />
          <Search className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" />
        </div>
        <Input placeholder="Min total" value={minTotal} onChange={(e)=>setMinTotal(e.target.value)} className="w-28" />
        <Input placeholder="Max total" value={maxTotal} onChange={(e)=>setMaxTotal(e.target.value)} className="w-28" />
      </div>

      <div className="flex gap-2 mb-6 flex-wrap">
        {["ALL","PENDING","CONFIRMED","IN_PROCESS","DELIVERED","CANCELLED"].map((status) => (
          <Button
            key={status}
            variant={filterStatus === status ? "default" : "outline"}
            onClick={() => { setFilterStatus(status as any); setPage(0) }}
            className={filterStatus === status ? "bg-blue-600" : ""}
            size="sm"
          >
            {status.replace('_',' ')}
          </Button>
        ))}
      </div>

      <div className="space-y-4">
        {loading ? (
          <Card className="border-0 shadow-lg"><CardContent className="pt-6">Loading…</CardContent></Card>
        ) : filteredOrders.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6 text-center text-gray-500">No orders found</CardContent>
          </Card>
        ) : (
          filteredOrders.map((order) => (
            <Card key={order.id} className="border-0 shadow hover:shadow-lg transition-shadow">
              <CardContent className="pt-6">
                {/* Order Header */}
                <div className="flex items-center justify-between mb-4 pb-4 border-b flex-col md:flex-row gap-4">
                  <div className="flex-1 w-full">
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Order ID</p>
                        <p className="font-semibold text-gray-900 text-sm md:text-base">{order.id.slice(0, 8)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Customer</p>
                        {(() => {
                          const gName = (order as any).guestName as string | undefined
                          const gEmail = (order as any).guestEmail as string | undefined
                          const gPhone = (order as any).guestPhone as string | undefined
                          const uName = (order as any).userName as string | undefined
                          const uEmail = (order as any).userEmail as string | undefined
                          const uPhone = (order as any).userPhone as string | undefined
                          // Prefer submitted contact details (guest*), which backend now sends for both guest and auth
                          const displayName = gName || uName || gEmail || uEmail || 'Guest'
                          const displayEmail = gEmail || uEmail || ''
                          const displayPhone = gPhone || uPhone || ''
                          return (
                            <>
                              <p className="font-semibold text-gray-900 text-sm md:text-base">{displayName}</p>
                              {(displayEmail || displayPhone) && (
                                <p className="text-xs text-gray-500">{displayEmail}{(displayEmail && displayPhone) ? ' • ' : ''}{displayPhone}</p>
                              )}
                            </>
                          )
                        })()}
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Total</p>
                        <p className="font-semibold text-blue-600">{formatPrice(order.total)}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-600">Payment</p>
                        <p className="font-semibold text-gray-900">{String(order.paymentMethod || '').toUpperCase()}</p>
                        {order.couponCode ? (
                          <span className="inline-block mt-1 text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">Coupon: {order.couponCode}</span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => setExpandedOrder(expandedOrder === order.id ? null : order.id)}
                    className="ml-4"
                  >
                    <ChevronDown
                      className={`w-5 h-5 transition-transform ${expandedOrder === order.id ? "rotate-180" : ""}`}
                    />
                  </button>
                </div>

                {/* Status Section */}
                <div className="mb-4 pb-4 border-b">
                  <p className="text-sm text-gray-600 mb-2 font-medium">Status</p>
                  <div className="flex items-center gap-3 flex-wrap">
                    {getStatusIcon(order.status)}
                    <span className={`text-sm px-3 py-1 rounded font-medium ${getStatusColor(order.status)}`}>
                      {String(order.status || '').replace('_',' ')}
                    </span>
                    <div className="relative">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setStatusDropdown(statusDropdown === order.id ? null : order.id)}
                        className="text-xs"
                      >
                        Change Status
                      </Button>
                      {statusDropdown === order.id && (
                        <div className="absolute top-full mt-2 bg-white border rounded-lg shadow-lg z-10 min-w-max">
                          {["PENDING","CONFIRMED","IN_PROCESS","DELIVERED","CANCELLED"].map((status) => (
                            <button
                              key={status}
                              onClick={() => setStatusChangeModal({ orderId: order.id, newStatus: status as any })}
                              className="block w-full text-left px-4 py-2 hover:bg-gray-100 text-sm"
                            >
                              {status.replace('_',' ')}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setDeleteConfirm(order.id)}
                      className="text-xs"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </div>

                {/* Expanded Details */}
                {expandedOrder === order.id && (
                  <div className="space-y-4">
                    <div>
                      <p className="text-sm text-gray-600 mb-2 font-medium">Items</p>
                      <div className="space-y-2 bg-gray-50 p-3 rounded text-sm">
                        {order.items.map((item, idx) => (
                          <p key={idx} className="text-gray-700">
                            • Product {item.productId}: {item.quantity}x @ ${item.price.toFixed(2)}
                          </p>
                        ))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 mb-2 font-medium">Shipping Address</p>
                      <div className="bg-gray-50 p-3 rounded text-sm text-gray-700">
                        <p>{order.shippingAddress?.name}</p>
                        <p>{order.shippingAddress?.address}</p>
                        <p>
                          {order.shippingAddress?.city}, {order.shippingAddress?.state} {order.shippingAddress?.zipCode}
                        </p>
                      </div>
                      {typeof (order as any).shippingAddress === 'string' && (
                        <div className="bg-gray-50 p-3 rounded text-sm text-gray-700">
                          <p>{(order as any).shippingAddress}</p>
                        </div>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Subtotal</p>
                        <p className="font-semibold">{formatPrice(Number((order as any).subtotal ?? (order.total - ((order as any).discount || (order as any).discountAmount || 0))) || 0)}</p>
                      </div>
                      {Number((order as any).discountAmount || (order as any).discount) > 0 && (
                        <div>
                          <p className="text-sm text-gray-600">Discount</p>
                          <p className="font-semibold text-green-600">-{formatPrice(Number((order as any).discountAmount || (order as any).discount))}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Status Change Confirmation Modal */}
      <Modal
        isOpen={!!statusChangeModal}
        title="Change Order Status"
        onClose={() => setStatusChangeModal(null)}
        onConfirm={() => {
          if (statusChangeModal) {
            handleStatusChange(statusChangeModal.orderId, statusChangeModal.newStatus as any)
          }
        }}
        confirmText="Confirm"
        cancelText="Cancel"
      >
        <p className="text-gray-700">
          Are you sure you want to change the order status to{" "}
          <span className="font-semibold">{statusChangeModal?.newStatus}</span>?
        </p>
      </Modal>

      <Modal
        isOpen={!!deleteConfirm}
        title="Delete Order"
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDeleteOrder(deleteConfirm)}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous
      >
        <p className="text-gray-700">Are you sure you want to delete this order? This action cannot be undone.</p>
      </Modal>
    </div>
  )
}





