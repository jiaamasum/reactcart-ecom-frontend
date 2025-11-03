"use client"

import React, { useEffect, useState } from "react"
import { apiAdminCreateProduct, apiAdminListCategories } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { AdminImageManager } from "@/components/admin-image-manager"
import { AdminMultiSelect } from "@/components/admin-multi-select"

export default function CreateProductPage() {
  const router = useRouter()
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [allImages, setAllImages] = useState<string[]>([])
  const [primaryIndex, setPrimaryIndex] = useState(0)
  const [availableCategories, setAvailableCategories] = useState<{ id: string; name: string; slug?: string }[]>([])
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null)
  const [catSearch, setCatSearch] = useState("")
  const [form, setForm] = useState({
    name: "",
    description: "",
    price: "",
    discountedPrice: "",
    discount: "",
    category: "",
    stock: "",
  })

  const onChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
    if (name === "price" || name === "discountedPrice") {
      const price = name === "price" ? Number.parseFloat(value) : Number.parseFloat(p.price)
      const discounted = name === "discountedPrice" ? Number.parseFloat(value) : Number.parseFloat(p.discountedPrice)
      if (price && discounted && discounted < price) {
        const d = Math.round(((price - discounted) / price) * 100)
        setForm((x) => ({ ...x, discount: String(d) }))
      }
    }
  }

  useEffect(() => {
    const load = async () => {
      try {
        const cats = await apiAdminListCategories()
        setAvailableCategories(cats.map((c) => ({ id: c.id, name: c.name })))
      } catch {
        setAvailableCategories([])
      }
    }
    load()
  }, [])

  const validate = () => {
    const e: Record<string, string> = {}
    if (!form.name.trim()) e.name = "Name is required"
    if (!form.description.trim()) e.description = "Description required"
    if (!form.price || Number.parseFloat(form.price) <= 0) e.price = "Valid price required"
    if (!selectedCategoryId) e.category = "Category required"
    if (!form.stock || Number.parseInt(form.stock) < 0) e.stock = "Valid stock required"
    if (allImages.length === 0) e.images = "At least one image required"
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!validate()) return
    const nameToId = new Map(availableCategories.map((c) => [c.name, c.id]))
    const categoryId = selectedCategoryId || nameToId.get(selectedCategories[0] || form.category)
    if (!categoryId) {
      setErrors({ category: "Please select a valid category" })
      return
    }
    const toAbsolute = (u: string) => (u?.startsWith('/') && typeof window !== 'undefined' ? `${window.location.origin}${u}` : u)
    const isHttp = (u: string) => /^https?:\/\//i.test(u)
    const normalized = allImages.map(toAbsolute)
    const primaryCandidate = normalized[primaryIndex]
    const primaryImageUrl = isHttp(primaryCandidate) ? primaryCandidate : (normalized.find(isHttp) || "")
    const images = normalized.filter((u, i) => i !== normalized.indexOf(primaryImageUrl)).filter(isHttp)
    if (!primaryImageUrl) {
      setErrors({ images: 'Please upload or enter a valid image URL' })
      return
    }
    try {
      await apiAdminCreateProduct({
        name: form.name,
        description: form.description,
        price: Number.parseFloat(form.price),
        discountedPrice: form.discountedPrice ? Number.parseFloat(form.discountedPrice) : undefined,
        stock: Number.parseInt(form.stock),
        categoryId,
        primaryImageUrl,
        images,
      })
      router.push("/admin/products")
    } catch (err: any) {
      const fields = err?.fields || {}
      if (fields && typeof fields === 'object') setErrors(fields)
      setErrors((prev) => ({ ...prev, form: err?.message || 'Create failed' }))
    }
  }

  return (
    <div className="p-4 md:p-8">
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle>Create Product</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Name</label>
                <Input name="name" value={form.name} onChange={onChange} required />
                {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
              </div>
              <div>
                <AdminMultiSelect
                  label="Categories"
                  options={availableCategories.map((c) => c.name)}
                  value={selectedCategories}
                  onChange={(vals) => {
                    const v = vals.slice(0,1)
                    setSelectedCategories(v)
                    const name = v[0]
                    const match = availableCategories.find((c) => c.name === name)
                    setSelectedCategoryId(match?.id || null)
                  }}
                  placeholder="Select a category"
                />
                <p className="text-xs text-gray-500 mt-1">Pick one or more categories. The first selected will be primary.</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Price</label>
                <Input name="price" type="number" step="0.01" value={form.price} onChange={onChange} required />
                {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Stock</label>
                <Input name="stock" type="number" value={form.stock} onChange={onChange} required />
                {errors.stock && <p className="text-red-500 text-xs mt-1">{errors.stock}</p>}
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Discounted Price (Optional)</label>
                <Input name="discountedPrice" type="number" step="0.01" value={form.discountedPrice} onChange={onChange} />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700 block mb-2">Discount % (Auto)</label>
                <Input name="discount" type="number" value={form.discount} disabled className="bg-gray-100" />
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700 block mb-2">Description</label>
              <Input name="description" value={form.description} onChange={onChange} />
              {errors.description && <p className="text-red-500 text-xs mt-1">{errors.description}</p>}
            </div>

            <div className="space-y-4 border-t pt-6">
              <h3 className="text-lg font-semibold text-gray-900">Product Images</h3>
              <AdminImageManager initialImages={allImages} initialPrimaryIndex={primaryIndex} onChange={(imgs, p)=>{ setAllImages(imgs); setPrimaryIndex(p) }} />
              {errors.images && <p className="text-red-500 text-xs">{errors.images}</p>}
            </div>

            <div className="flex gap-3 pt-4">
              <Button type="submit" className="flex-1">Create</Button>
              <Link href="/admin/products" className="flex-1">
                <Button type="button" variant="outline" className="w-full bg-transparent">Cancel</Button>
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
