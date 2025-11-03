"use client"

import { useEffect, useMemo, useState } from "react"
import { apiAdminListProducts, apiAdminDeleteProduct, type ProductSummary } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Edit2, Plus, Search, ChevronLeft, ChevronRight, Filter, X, Trash2 } from "lucide-react"
import { ImageGalleryPopup } from "@/components/image-gallery-popup"
import Link from "next/link"
import { useToast } from "@/hooks/use-toast"
import { useCurrency } from "@/lib/currency-context"

export default function AdminProductsPage() {
  const { toast } = useToast()
  const { formatPrice } = useCurrency()
  const [products, setProducts] = useState<ProductSummary[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [categoryFilter, setCategoryFilter] = useState<string>("all")
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [productImageIndices, setProductImageIndices] = useState<Record<string, number>>({})
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [galleryImages, setGalleryImages] = useState<string[]>([])
  const [galleryStartIndex, setGalleryStartIndex] = useState(0)
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    const load = async () => {
      try {
        const list = await apiAdminListProducts()
        setProducts(list)
      } catch (err: any) {
        toast({ title: 'Failed to load products', description: err?.message || 'Unexpected error', variant: 'destructive' })
      }
    }
    load()
  }, [toast])

  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.categoryName))), [products])

  const filteredProducts = products.filter((p) => {
    const nameMatch = p.name.toLowerCase().includes(searchTerm.toLowerCase())
    const cat = (p.categoryName || '').toLowerCase()
    const catMatch = cat.includes(searchTerm.toLowerCase())
    const filterMatch = categoryFilter === 'all' || p.categoryName === categoryFilter
    return (nameMatch || catMatch) && filterMatch
  })

  const handleDelete = async (id: string) => {
    try {
      setDeletingId(id)
      const env = await apiAdminDeleteProduct(id)
      setProducts((prev) => prev.filter((p) => p.id !== id))
      try { setProducts(await apiAdminListProducts()) } catch {}
      const product = products.find((p) => p.id === id)
      const msg = `DELETED - (${product?.name || 'Product'} [${id}]) Done`
      toast({ title: msg, variant: 'destructive' })
    } catch (err: any) {
      const reason = err?.message || 'Unexpected error'
      const product = products.find((p) => p.id === id)
      const title = `DELETE FAILED - (${product?.name || 'Product'} [${id}]) ${reason}`
      toast({ title, variant: 'destructive' })
    } finally {
      setDeletingId(null)
    }
  }

  const navImage = (productId: string, direction: "prev" | "next", total: number) => {
    setProductImageIndices((prev) => {
      const current = prev[productId] || 0
      const next = direction === "next" ? (current + 1) % total : (current - 1 + total) % total
      return { ...prev, [productId]: next }
    })
  }

  const openGallery = (images: string[], startIndex = 0) => {
    setGalleryImages(images)
    setGalleryStartIndex(startIndex)
    setGalleryOpen(true)
  }

  return (
    <div className="p-4 md:p-8 w-full">
      {/* Header */}
      <div className="flex justify-between items-center mb-8 flex-col md:flex-row gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Manage Products</h1>
          <p className="text-gray-600 mt-1">Total Products: {products.length}</p>
        </div>
        <Link href="/admin/products/create">
          <Button className="bg-blue-600 hover:bg-blue-700 w-full md:w-auto" size="lg">
            <Plus className="w-4 h-4 mr-2" />
            Add Product
          </Button>
        </Link>
      </div>

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
          <Input
            placeholder="Search products by name or category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <div className="flex flex-wrap gap-2 items-center">
          <Button
            variant={showFilters ? "default" : "outline"}
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 ${showFilters ? "bg-blue-600" : ""}`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {showFilters && <X className="w-4 h-4" />}
          </Button>
          {categoryFilter !== "all" && (
            <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
              <span>{categoryFilter}</span>
              <button onClick={() => setCategoryFilter("all")} className="hover:text-blue-600">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>

        {showFilters && (
          <Card className="border-0 shadow-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="space-y-3">
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-3">Filter by Category</label>
                <div className="flex flex-wrap gap-2">
                  <Button
                    variant={categoryFilter === "all" ? "default" : "outline"}
                    size="sm"
                    onClick={() => setCategoryFilter("all")}
                    className={categoryFilter === "all" ? "bg-blue-600 text-white" : ""}
                  >
                    All Categories
                  </Button>
                  {categories.map((cat) => (
                    <Button
                      key={cat}
                      variant={categoryFilter === cat ? "default" : "outline"}
                      size="sm"
                      onClick={() => setCategoryFilter(cat)}
                      className={categoryFilter === cat ? "bg-blue-600 text-white" : ""}
                    >
                      {cat}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Products Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProducts.length === 0 ? (
          <Card className="border-0 shadow-lg col-span-full">
            <CardContent className="pt-6 text-center text-gray-500">No products found</CardContent>
          </Card>
        ) : (
          filteredProducts.map((product) => (
            <Card key={product.id} className="border-0 shadow hover:shadow-lg transition-shadow overflow-hidden">
              <CardContent className="p-0">
                {/* Product Image */}
                <div className="relative w-full h-48 bg-gray-100 overflow-hidden group">
                  {(() => {
                    const imgs = [product.primaryImageUrl as any].filter(Boolean)
                    const idx = productImageIndices[product.id] || 0
                    const current = imgs[idx]
                    return (
                      <img
                        src={current || "/placeholder.svg"}
                        alt={product.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          e.currentTarget.src = "/placeholder.svg"
                        }}
                      />
                    )
                  })()}

                  {(() => {
                    const imgs = [product.primaryImageUrl as any].filter(Boolean)
                    const idx = productImageIndices[product.id] || 0
                    if (imgs.length > 1) {
                      return (
                        <>
                          <div className="absolute bottom-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs font-medium">
                            {idx + 1} / {imgs.length}
                          </div>
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              navImage(product.id, "prev", imgs.length)
                            }}
                            className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition-all opacity-0 group-hover:opacity-100 z-10"
                            aria-label="Previous image"
                          >
                            <ChevronLeft className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              navImage(product.id, "next", imgs.length)
                            }}
                            className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition-all opacity-0 group-hover:opacity-100 z-10"
                            aria-label="Next image"
                          >
                            <ChevronRight className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.preventDefault()
                              openGallery(imgs, idx)
                            }}
                            className="absolute inset-0"
                            aria-label="Open gallery"
                          />
                        </>
                      )
                    }
                    return (
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          openGallery(imgs, 0)
                        }}
                        className="absolute inset-0"
                        aria-label="Open image"
                      />
                    )
                  })()}
                </div>

                {/* Product Info */}
                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
                    <p className="text-xs text-gray-600 mt-1">{product.categoryName}</p>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {product.discountedPrice ? (
                      <>
                        <span className="text-lg font-bold text-blue-600">{formatPrice(product.discountedPrice)}</span>
                        <span className="text-sm text-gray-500 line-through">{formatPrice(product.price)}</span>
                        {product.discount ? (
                          <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-semibold">{product.discount}% OFF</span>
                        ) : null}
                      </>
                    ) : (
                      <span className="text-lg font-bold text-blue-600">{formatPrice(product.price)}</span>
                    )}
                  </div>

                  <div
                    className={`text-xs px-2 py-1 rounded w-fit font-medium ${
                      product.stock > 10
                        ? "bg-green-100 text-green-800"
                        : product.stock > 0
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    Stock: {product.stock}
                  </div>

                  {/* Actions */}
                  <div className="pt-2 space-y-2">
                    <Link href={`/admin/products/${product.id}/edit`} className="block">
                      <Button variant="outline" size="sm" className="w-full bg-transparent">
                        <Edit2 className="w-4 h-4 mr-1" />
                        Edit
                      </Button>
                    </Link>
                    <Button
                      type="button"
                      variant="destructive"
                      size="sm"
                      onClick={() => handleDelete(product.id)}
                      className="w-full"
                      disabled={deletingId === product.id}
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      {deletingId === product.id ? 'Deleting...' : 'Delete'}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
      {/* Inline delete confirmation replaces modal */}

      {/* Image Gallery */}
      <ImageGalleryPopup
        isOpen={galleryOpen}
        images={galleryImages}
        startIndex={galleryStartIndex}
        onClose={() => setGalleryOpen(false)}
      />
    </div>
  )
}
