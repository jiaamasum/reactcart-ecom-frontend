"use client"

import React, { useEffect, useState } from "react"
import { apiAdminListCategories, apiAdminUpdateProduct, apiGetProduct, apiAdminDeleteProduct } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { ArrowLeft, Trash2 } from "lucide-react"
import { AdminImageManager } from "@/components/admin-image-manager"
import { AdminMultiSelect } from "@/components/admin-multi-select"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { useParams, useRouter } from "next/navigation"

export default function EditProductPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const productId = params.id as string
  const [deleting, setDeleting] = useState(false)

  const [errors, setErrors] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [allImages, setAllImages] = useState<string[]>([])
  const [primaryIndex, setPrimaryIndex] = useState(0)
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    discountedPrice: "",
    discount: "",
    category: "",
    stock: "",
    images: [] as string[],
    active: true,
  })
  const [availableCategories, setAvailableCategories] = useState<{ id: string; name: string; slug?: string }[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      try {
        const [prod, cats] = await Promise.all([
          apiGetProduct(productId),
          apiAdminListCategories(),
        ])
        setAllImages([prod.primaryImageUrl || "", ...(prod.images || [])].filter(Boolean))
        setFormData({
          name: prod.name || "",
          description: prod.description || "",
          price: String(prod.price ?? ""),
          discountedPrice: prod.discountedPrice != null ? String(prod.discountedPrice) : "",
          discount: prod.discount != null ? String(prod.discount) : "",
          category: prod.categoryName || "",
          stock: String(prod.stock ?? ""),
          images: prod.images || [],
          active: (prod as any).active !== false,
        })
        setAvailableCategories(cats.map((c) => ({ id: c.id, name: c.name })))
        const match = cats.find((c) => c.id === prod.categoryId || c.name === prod.categoryName)
        setSelectedCategories(match ? [match.name] : [])
        setSelectedCategoryId(match?.id || prod.categoryId || null)
      } catch (err) {
        setErrors({ submit: 'Failed to load product' })
      } finally { setLoading(false) }
    }
    load()
  }, [productId])

  if (loading) {
    return (<div className="p-8"><p className="text-muted-foreground">Loading...</p></div>)
  }

  const handleDelete = async () => {
    try {
      setDeleting(true)
      const env = await apiAdminDeleteProduct(productId)
      const msg = `DELETED - (${formData.name || 'Product'} [${productId}]) Done`
      toast({ title: msg, variant: 'destructive' })
      router.push('/admin/products')
    } catch (err: any) {
      const reason = err?.message || 'Unexpected error'
      const title = `DELETE FAILED - (${formData.name || 'Product'} [${productId}]) ${reason}`
      toast({ title, variant: 'destructive' })
    } finally {
      setDeleting(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => {
      const next = { ...prev, [name]: value } as any
      if (name === 'price' || name === 'discountedPrice') {
        const price = parseFloat(name === 'price' ? value : next.price || '0')
        const discounted = parseFloat(name === 'discountedPrice' ? value : next.discountedPrice || '0')
        if (price && discounted && discounted < price) {
          next.discount = String(Math.round(((price - discounted) / price) * 100))
        } else if (!discounted || value === '') {
          next.discount = '0'
        }
      }
      return next
    })
  }

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {}
    if (!formData.name.trim()) newErrors.name = "Product name is required"
    if (!formData.description.trim()) newErrors.description = "Description is required"
    if (!formData.price || Number.parseFloat(formData.price) <= 0) newErrors.price = "Valid price is required"
    if (!formData.stock || Number.parseInt(formData.stock) < 0) newErrors.stock = "Valid stock quantity is required"
    if (!selectedCategoryId && !formData.category) newErrors.category = "Category is required"
    if (allImages.length === 0) newErrors.image = "At least one image is required"
    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validateForm()) return
    const nameToId = new Map(availableCategories.map((c) => [c.name, c.id]))
    const categoryId = selectedCategoryId || nameToId.get(selectedCategories[0] || formData.category)
    try {
      const toAbsolute = (u: string) => (u?.startsWith('/') && typeof window !== 'undefined' ? `${window.location.origin}${u}` : u)
      const normalized = allImages.map(toAbsolute)
      const isHttp = (u: string) => /^https?:\/\//i.test(u)
      const primaryCandidate = normalized[primaryIndex]
      const primaryImageUrl = isHttp(primaryCandidate) ? primaryCandidate : (normalized.find(isHttp) || "")
      const images = normalized
        .filter((_, i) => i !== normalized.indexOf(primaryImageUrl))
        .filter(isHttp)
      // Determine discounted price semantics
      // - Empty/whitespace: send null to explicitly clear on server
      // - Valid number > 0: send numeric value
      // - Any other case: send null
      const dpStr = (formData.discountedPrice || '').trim()
      const dpNum = Number.parseFloat(dpStr)
      const dp = dpStr === '' ? null : (Number.isFinite(dpNum) && dpNum > 0 ? dpNum : null)
      if (!primaryImageUrl) {
        setErrors({ image: 'Please upload or enter a valid image URL' })
        return
      }

      const payload: any = {
        name: formData.name,
        description: formData.description,
        price: Number.parseFloat(formData.price),
        stock: Number.parseInt(formData.stock),
        categoryId,
        primaryImageUrl,
        images,
      }
      if (typeof formData.active === 'boolean') payload.active = !!formData.active
      if (dp === null) {
        // Be explicit: tell the backend to clear discount
        payload.discountedPrice = null
        payload.removeDiscount = true
      } else {
        payload.discountedPrice = dp
      }
      await apiAdminUpdateProduct(productId, payload)
      toast({ title: 'Product updated' })
      router.push("/admin/products")
    } catch (err: any) {
      const fields = err?.fields || {}
      if (fields && typeof fields === 'object') setErrors(fields)
      // Some backends may return 200 with empty body; treat that as success
      if (err?.status === 200 || err?.message === 'Unexpected error') {
        toast({ title: 'Product updated' })
        router.push('/admin/products')
        return
      }
      setErrors((prev) => ({ ...prev, submit: err?.message || 'Update failed' }))
    }
  }

  return (
    <div className="p-4 md:p-8 w-full max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6 gap-3">
        <Link href="/admin/products">
          <Button variant="ghost" className="hover:bg-gray-100">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Products
          </Button>
        </Link>
        <Button
          type="button"
          variant="destructive"
          onClick={handleDelete}
          disabled={deleting}
          className="min-w-[140px]"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {deleting ? 'Deleting...' : 'Delete Product'}
        </Button>
      </div>

      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 border-b">
          <CardTitle className="text-2xl">Edit Product</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {errors.submit && <div className="p-3 bg-red-100 text-red-800 rounded text-sm">{errors.submit}</div>}

            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-gray-900">Basic Information</h3>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Product Name *</label>
                <Input name="name" value={formData.name} onChange={handleInputChange as any} required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Description *</label>
                <textarea name="description" value={formData.description} onChange={handleInputChange as any} className="w-full border rounded p-3 text-sm" rows={4} required />
              </div>
              <div className="flex items-center gap-2">
                <input id="active" type="checkbox" checked={formData.active} onChange={(e)=>setFormData((p)=>({ ...p, active: e.target.checked }))} />
                <label htmlFor="active" className="text-sm font-medium text-gray-700">Active</label>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Category *</label>
                  <AdminMultiSelect options={availableCategories.map((c) => c.name)} value={selectedCategories} onChange={(vals)=>{
                    const v = vals.slice(0,1)
                    setSelectedCategories(v)
                    const name = v[0]
                    const match = availableCategories.find((c)=>c.name===name)
                    setSelectedCategoryId(match?.id || null)
                  }} placeholder="Select category" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Stock Quantity *</label>
                  <Input name="stock" type="number" value={formData.stock} onChange={handleInputChange as any} required />
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900">Pricing</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Price *</label>
                  <Input name="price" type="number" step="0.01" value={formData.price} onChange={handleInputChange as any} required />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Discounted Price (Optional)</label>
                  <Input name="discountedPrice" type="number" step="0.01" value={formData.discountedPrice} onChange={handleInputChange as any} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700 block mb-2">Discount % (Auto)</label>
                  <Input name="discount" type="number" value={formData.discount} disabled className="bg-gray-100" />
                </div>
              </div>
            </div>

            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900">Product Images</h3>
              <div className="rounded-lg border p-4 bg-gray-50">
                <p className="text-sm text-gray-700 mb-3">Add image URLs. Mark one as Primary.</p>
                <AdminImageManager initialImages={allImages} initialPrimaryIndex={primaryIndex} onChange={(imgs,p)=>{ setAllImages(imgs); setPrimaryIndex(p) }} />
                {errors.image && <p className="text-red-500 text-xs mt-2">{errors.image}</p>}
              </div>
            </div>

            <div className="flex gap-3 pt-6 border-t">
              <Button type="submit" className="flex-1 bg-green-600 hover:bg-green-700 text-white py-6 text-base">Save Changes</Button>
              <Link href="/admin/products" className="flex-1">
                <Button type="button" variant="outline" className="w-full py-6 text-base bg-transparent">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}





