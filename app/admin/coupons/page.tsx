"use client"

import type React from "react"
import { useEffect, useMemo, useState } from "react"
import {
  apiAdminListCoupons,
  apiAdminCreateCoupon,
  apiAdminPatchCoupon,
  apiAdminDeleteCoupon,
  apiAdminGetCouponSummary,
  apiAdminSearchProducts,
  apiAdminSearchUsers,
  apiAdminListCategories,
  type AdminCoupon,
  type ProductSummary,
  type Category,
} from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Trash2, Plus, Ticket, Edit2 } from "lucide-react"
import { Modal } from "@/components/modal-dialog"
import { useCurrency } from "@/lib/currency-context"
import { useToast } from "@/hooks/use-toast"

export default function AdminCouponsPage() {
  const { toast } = useToast()
  const { formatPrice } = useCurrency()
  const [coupons, setCoupons] = useState<AdminCoupon[]>([])
  const [summary, setSummary] = useState<{ total: number; active: number; expired: number }>({ total: 0, active: 0, expired: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState("")
  const [search, setSearch] = useState("")

  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [formData, setFormData] = useState({
    code: "",
    discountType: "PERCENT" as "PERCENT" | "FIXED",
    discount: "",
    maxUses: "",
    expiryDate: "",
    active: true,
  })
  // Applies-to selection (single type)
  const [assignType, setAssignType] = useState<'ALL_PRODUCTS' | 'CUSTOMER' | 'CATEGORY' | 'PRODUCT'>('ALL_PRODUCTS')
  const [selectedCustomerId, setSelectedCustomerId] = useState("")
  const [selectedProductId, setSelectedProductId] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] = useState("")
  // Selectors state
  const [productQuery, setProductQuery] = useState("")
  const [productOptions, setProductOptions] = useState<ProductSummary[]>([])
  const [selectedProductLabel, setSelectedProductLabel] = useState("")

  const [customerQuery, setCustomerQuery] = useState("")
  const [customerOptions, setCustomerOptions] = useState<{ id: string; name: string; email: string }[]>([])
  const [selectedCustomerLabel, setSelectedCustomerLabel] = useState("")

  const [categories, setCategories] = useState<Category[]>([])
  const [categoryQuery, setCategoryQuery] = useState("")

  const load = async () => {
    setIsLoading(true)
    setError("")
    try {
      const [list, sum] = await Promise.all([
        apiAdminListCoupons(search ? { search } : undefined),
        apiAdminGetCouponSummary().catch(() => ({ total: 0, active: 0, expired: 0 })),
      ])
      setCoupons(list)
      setSummary(sum)
    } catch (err: any) {
      setError(err?.message || 'Failed to load coupons')
      setCoupons([])
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  // Lazy fetch categories for selector
  useEffect(() => {
    (async () => {
      try { setCategories(await apiAdminListCategories()) } catch {}
    })()
  }, [])

  // Product search
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await apiAdminSearchProducts(productQuery ? { search: productQuery, limit: 20 } : { limit: 20 })
        if (!cancelled) setProductOptions(res)
      } catch { if (!cancelled) setProductOptions([]) }
    }
    run()
    return () => { cancelled = true }
  }, [productQuery])

  // Customer search
  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const res = await apiAdminSearchUsers({ role: 'CUSTOMER', search: customerQuery || undefined, limit: 20 })
        const mapped = (res || []).map((u) => ({ id: u.id, name: u.name, email: u.email }))
        if (!cancelled) setCustomerOptions(mapped)
      } catch { if (!cancelled) setCustomerOptions([]) }
    }
    run()
    return () => { cancelled = true }
  }, [customerQuery])

  const inactiveCount = useMemo(() => coupons.filter((c: any) => c && (c as any).active === false).length, [coupons])

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase()
    if (!s) return coupons
    return coupons.filter((c) => c.code.toLowerCase().includes(s))
  }, [coupons, search])

  const openCreate = () => {
    setEditingId(null)
    setFormData({ code: "", discountType: "PERCENT", discount: "", maxUses: "", expiryDate: "", active: true })
    setAssignType('ALL_PRODUCTS')
    setSelectedProductId(""); setSelectedProductLabel("")
    setSelectedCustomerId(""); setSelectedCustomerLabel("")
    setSelectedCategoryId("")
    setShowForm(true)
  }

  const openEdit = (c: AdminCoupon) => {
    setEditingId(c.id)
    setFormData({
      code: c.code,
      discountType: (c.discountType as any) || "PERCENT",
      discount: String(c.discount ?? ""),
      maxUses: c.maxUses != null ? String(c.maxUses) : "",
      expiryDate: c.expiryDate ? c.expiryDate : "",
      active: (c as any).active !== false,
    })
    if (c.customerIds && c.customerIds.length > 0) {
      setAssignType('CUSTOMER')
      setSelectedCustomerId(c.customerIds[0] || "")
      setSelectedProductId(""); setSelectedCategoryId("")
    } else if (c.productIds && c.productIds.length > 0) {
      setAssignType('PRODUCT')
      setSelectedProductId(c.productIds[0] || "")
      setSelectedCustomerId(""); setSelectedCategoryId("")
    } else if (c.categoryIds && c.categoryIds.length > 0) {
      setAssignType('CATEGORY')
      setSelectedCategoryId(c.categoryIds[0] || "")
      setSelectedCustomerId(""); setSelectedProductId("")
    } else {
      setAssignType('ALL_PRODUCTS')
      setSelectedCustomerId(""); setSelectedProductId(""); setSelectedCategoryId("")
    }
    setShowForm(true)
  }

  const saveCoupon = async () => {
    if (isSaving) return
    setIsSaving(true)
    try {
      const toIsoNoTzSeconds = (val: string) => {
        // Accept 'YYYY-MM-DDTHH:mm' and add ':00'
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(val)) return `${val}:00`
        // If already ISO-like, pass through; otherwise try Date parse to ISO
        if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(val)) return val
        const d = new Date(val)
        if (!isNaN(d.getTime())) return d.toISOString()
        return undefined
      }
      // Basic validation
      const code = formData.code.trim().toUpperCase()
      const discount = Number(formData.discount)
      if (!code) throw new Error('Code is required')
      if (!Number.isFinite(discount) || discount <= 0) throw new Error('Discount must be > 0')
      if (formData.discountType === 'PERCENT' && (discount <= 0 || discount > 100)) {
        throw new Error('Percent discount must be between 1 and 100')
      }
      if (!formData.expiryDate) throw new Error('Expiry date is required')
      if (formData.maxUses && Number(formData.maxUses) <= 0) throw new Error('Max uses must be a positive number')
      if (assignType === 'CUSTOMER' && !selectedCustomerId) throw new Error('Please select a customer')
      if (assignType === 'CATEGORY' && !selectedCategoryId) throw new Error('Please select a category')
      if (assignType === 'PRODUCT' && !selectedProductId) throw new Error('Please select a product')

      const payload: any = {
        code: formData.code.trim().toUpperCase(),
        discountType: formData.discountType,
        discount: Number(formData.discount),
      }
      if (formData.expiryDate) {
        const norm = toIsoNoTzSeconds(formData.expiryDate)
        if (!norm) throw new Error('Invalid expiry date')
        payload.expiryDate = norm
      }
      if (formData.maxUses) payload.maxUses = Number(formData.maxUses)
      // Do not send `active` from modal; activation is handled via list action
      if (assignType === 'ALL_PRODUCTS') { (payload as any).global = true }
      if (assignType === 'CUSTOMER' && selectedCustomerId) payload.customerIds = [selectedCustomerId]
      if (assignType === 'PRODUCT' && selectedProductId) payload.productIds = [selectedProductId]
      if (assignType === 'CATEGORY' && selectedCategoryId) payload.categoryIds = [selectedCategoryId]

      if (editingId) await apiAdminPatchCoupon(editingId, payload)
      else await apiAdminCreateCoupon(payload)

      await load()
      try { toast({ title: editingId ? 'Coupon updated' : 'Coupon created' }) } catch {}
      setShowForm(false)
      setEditingId(null)
    } catch (err: any) {
      // eslint-disable-next-line no-console
      console.warn('Save coupon failed', err)
      const message = err?.message || (typeof err === 'string' ? err : 'Failed to save coupon')
      try { toast({ title: 'Save failed', description: message, variant: 'destructive' }) } catch {}
    } finally {
      setIsSaving(false)
    }
  }

  const handleDeleteCoupon = async (id: string) => {
    try {
      await apiAdminDeleteCoupon(id)
      await load()
      try { toast({ title: 'Coupon deleted' }) } catch {}
    } catch (err: any) {
      try { toast({ title: 'Delete failed', description: err?.message || 'Unexpected error', variant: 'destructive' }) } catch {}
    } finally {
      setDeleteConfirm(null)
    }
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex justify-between items-center mb-8 flex-col md:flex-row gap-4">
        <div className="w-full md:w-auto flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Manage Coupons</h1>
          <p className="text-gray-600 mt-1">Total: {summary.total} • Active: {summary.active} • Expired: {summary.expired} • Inactive: {inactiveCount}</p>
        </div>
        <div className="flex items-center gap-2 w-full md:w-auto">
          <Input placeholder="Search code..." value={search} onChange={(e) => setSearch(e.target.value)} className="md:w-60" />
          <Button onClick={load} variant="outline">Search</Button>
          <Button onClick={openCreate} className="bg-blue-600 hover:bg-blue-700" size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Add Coupon
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Total Coupons</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{summary.total}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Active</p>
              <p className="text-3xl font-bold text-green-600 mt-2">{summary.active}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Expired</p>
              <p className="text-3xl font-bold text-red-600 mt-2">{summary.expired}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-600">Inactive</p>
              <p className="text-3xl font-bold text-gray-600 mt-2">{inactiveCount}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Modal */}
      <Modal
        isOpen={showForm}
        title={editingId ? 'Edit Coupon' : 'Add New Coupon'}
        onClose={() => { setShowForm(false); setEditingId(null) }}
        onConfirm={saveCoupon}
        confirmText={editingId ? 'Update Coupon' : 'Create Coupon'}
        confirmLoading={isSaving}
        confirmDisabled={!formData.code || !formData.discount}
      >
        <form onSubmit={(e) => { e.preventDefault(); saveCoupon() }} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Code</label>
              <Input name="code" value={formData.code} onChange={(e) => setFormData((p) => ({ ...p, code: e.target.value }))} required />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-sm font-medium text-gray-700">Type</label>
                <select name="discountType" value={formData.discountType} onChange={(e) => setFormData((p) => ({ ...p, discountType: e.target.value as any }))} className="w-full border rounded p-2 text-sm">
                  <option value="PERCENT">Percent</option>
                  <option value="FIXED">Fixed</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Discount</label>
                <Input name="discount" type="number" min={1} value={formData.discount} onChange={(e) => setFormData((p) => ({ ...p, discount: e.target.value }))} required />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Max Uses</label>
              <Input name="maxUses" type="number" min={1} value={formData.maxUses} onChange={(e) => setFormData((p) => ({ ...p, maxUses: e.target.value }))} />
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Expiry Date</label>
              <Input name="expiryDate" type="datetime-local" value={formData.expiryDate} onChange={(e) => setFormData((p) => ({ ...p, expiryDate: e.target.value }))} />
            </div>
            {/* Active toggle removed from coupon modal per requirement */}
          </div>
          {/* Applies To */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700">Applies To</label>
            <select value={assignType} onChange={(e) => { const v = e.target.value as any; setAssignType(v) }} className="w-full border rounded p-2 text-sm">
              <option value="ALL_PRODUCTS">All Products (Global)</option>
              <option value="PRODUCT">Specific Product</option>
              <option value="CATEGORY">Specific Category</option>
              <option value="CUSTOMER">Specific Customer</option>
            </select>
          </div>

          {assignType === 'CUSTOMER' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Select Customer</label>
              <Input placeholder="Search customers by name or email" value={customerQuery} onChange={(e) => setCustomerQuery(e.target.value)} />
              <div className="max-h-40 overflow-auto border rounded p-2 bg-white">
                {customerOptions.length === 0 ? (
                  <div className="text-sm text-gray-500">No results</div>
                ) : (
                  customerOptions.map((u) => (
                    <button
                      key={u.id}
                      type="button"
                      className={`w-full text-left text-sm px-2 py-1 rounded ${selectedCustomerId === u.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}`}
                      onClick={() => { setSelectedCustomerId(u.id); setSelectedCustomerLabel(`${u.name} (${u.email})`) }}
                    >
                      {u.name} ({u.email})
                    </button>
                  ))
                )}
              </div>
              {selectedCustomerId && <div className="text-xs text-gray-600">Selected: <span className="font-medium">{selectedCustomerLabel || selectedCustomerId}</span></div>}
            </div>
          )}

          {assignType === 'CATEGORY' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Select Category</label>
              <Input placeholder="Search categories by name" value={categoryQuery} onChange={(e) => setCategoryQuery(e.target.value)} />
              <div className="max-h-40 overflow-auto border rounded p-2 bg-white">
                {categories.length === 0 ? (
                  <div className="text-sm text-gray-500">No categories</div>
                ) : (
                  categories
                    .filter((c) => !categoryQuery || c.name.toLowerCase().includes(categoryQuery.toLowerCase()))
                    .map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className={`w-full text-left text-sm px-2 py-1 rounded ${selectedCategoryId === c.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}`}
                      onClick={() => setSelectedCategoryId(c.id)}
                    >
                      {c.name}
                    </button>
                  ))
                )}
              </div>
              {selectedCategoryId && <div className="text-xs text-gray-600">Selected: <span className="font-medium">{(categories.find((c)=>c.id===selectedCategoryId)?.name) || selectedCategoryId}</span></div>}
            </div>
          )}

          {assignType === 'PRODUCT' && (
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Select Product</label>
              <Input placeholder="Search products by name" value={productQuery} onChange={(e) => setProductQuery(e.target.value)} />
              <div className="max-h-40 overflow-auto border rounded p-2 bg-white">
                {productOptions.length === 0 ? (
                  <div className="text-sm text-gray-500">No results</div>
                ) : (
                  productOptions.map((p) => (
                    <button
                      key={p.id}
                      type="button"
                      className={`w-full text-left text-sm px-2 py-1 rounded ${selectedProductId === p.id ? 'bg-blue-50 text-blue-700' : 'hover:bg-gray-100'}`}
                      onClick={() => { setSelectedProductId(p.id); setSelectedProductLabel(p.name) }}
                    >
                      {p.name}
                    </button>
                  ))
                )}
              </div>
              {selectedProductId && <div className="text-xs text-gray-600">Selected: <span className="font-medium">{selectedProductLabel || selectedProductId}</span></div>}
            </div>
          )}
        </form>
      </Modal>

      <div className="space-y-3">
        {isLoading ? (
          <Card className="border-0 shadow-lg"><CardContent className="pt-6 text-center text-gray-500">Loading...</CardContent></Card>
        ) : coupons.length === 0 ? (
          <Card className="border-0 shadow-lg">
            <CardContent className="pt-6 text-center text-gray-500">No coupons found</CardContent>
          </Card>
        ) : (
          filtered.map((coupon) => {
            const isExpired = coupon.expiryDate ? new Date(coupon.expiryDate) <= new Date() : false
            const isInactive = (coupon as any).active === false
            const assignmentText = (() => {
              if ((!coupon.customerIds || coupon.customerIds.length === 0) && (!coupon.productIds || coupon.productIds.length === 0) && (!coupon.categoryIds || coupon.categoryIds.length === 0)) {
                return 'All Products'
              }
              if (coupon.customerIds?.includes('*')) return 'All Customers'
              if (coupon.productIds?.includes('*')) return 'All Products'
              if (coupon.categoryIds?.includes('*')) return 'All Categories'
              const parts: string[] = []
              if (coupon.customerIds?.length) parts.push(`${coupon.customerIds.length} customers`)
              if (coupon.productIds?.length) parts.push(`${coupon.productIds.length} products`)
              if (coupon.categoryIds?.length) parts.push(`${coupon.categoryIds.length} categories`)
              return parts.length ? parts.join(', ') : 'All Products'
            })()
            return (
              <Card key={coupon.id} className="border-0 shadow hover:shadow-lg transition-shadow">
                <CardContent className="pt-6">
                  <div className="flex justify-between items-start flex-col md:flex-row gap-4">
                    <div className="flex-1 w-full">
                      <div className="flex items-center gap-3 mb-2">
                        <Ticket className="w-5 h-5 text-blue-500" />
                        <div>
                          <h3 className="font-semibold text-lg text-gray-900">{coupon.code}</h3>
                          <p className="text-sm text-gray-600">
                            {(coupon.discountType === 'PERCENT') ? `${coupon.discount}% off` : `${formatPrice(coupon.discount || 0)} off`} 
                            {coupon.expiryDate ? ` • Expires: ${new Date(coupon.expiryDate).toLocaleDateString()}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="mt-3 space-y-2">
                        <p className="text-sm text-gray-700">
                          Used: <span className="font-semibold">{coupon.usedCount ?? 0}</span>
                          {coupon.maxUses != null && <>
                            {" / "}
                            <span className="font-semibold">{coupon.maxUses}</span>
                          </>}
                        </p>
                        <p className="text-sm text-gray-700">
                          Assigned: <span className="font-semibold">{assignmentText}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <Button
                        variant={((coupon as any).active === false) ? 'outline' : 'destructive'}
                        size="sm"
                        onClick={async () => {
                          try {
                            await apiAdminPatchCoupon(coupon.id, { active: ((coupon as any).active === false) ? true : false })
                            await load()
                            try { toast({ title: ((coupon as any).active === false) ? 'Coupon activated' : 'Coupon deactivated' }) } catch {}
                          } catch (err: any) {
                            try { toast({ title: 'Update failed', description: err?.message || 'Unexpected error', variant: 'destructive' }) } catch {}
                          }
                        }}
                        title={((coupon as any).active === false) ? 'Activate' : 'Deactivate'}
                      >
                        {((coupon as any).active === false) ? 'Activate' : 'Deactivate'}
                      </Button>
                      <span
                        className={`text-xs px-3 py-1 rounded-full font-medium ${
                          isInactive ? 'bg-gray-200 text-gray-800' : (isExpired ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800')
                        }`}
                      >
                        {isInactive ? 'Inactive' : (isExpired ? 'Expired' : 'Active')}
                      </span>
                      <Button variant="outline" size="sm" onClick={() => openEdit(coupon)}>
                        <Edit2 className="w-4 h-4" />
                      </Button>
                      <Button variant="destructive" size="sm" onClick={() => setDeleteConfirm(coupon.id)}>
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>

      <Modal
        isOpen={!!deleteConfirm}
        title="Delete Coupon"
        onClose={() => setDeleteConfirm(null)}
        onConfirm={() => deleteConfirm && handleDeleteCoupon(deleteConfirm)}
        confirmText="Delete"
        cancelText="Cancel"
        isDangerous
      >
        <p className="text-gray-700">Are you sure you want to delete this coupon? This action cannot be undone.</p>
      </Modal>
    </div>
  )
}


