"use client"

import { useMemo, useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { apiGetProductsByCategorySlug, apiListCategories, apiGetProduct, type ProductSummary, type Category } from "@/lib/api"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { useToast } from "@/hooks/use-toast"
import { ImageGalleryPopup } from "@/components/image-gallery-popup"
import { ShopFilters } from "@/components/shop-filters"
import { Input } from "@/components/ui/input"
import { useCurrency } from "@/lib/currency-context"

export default function CategoryPage() {
  const params = useParams()
  const router = useRouter()
  const slug = decodeURIComponent(String(params.category || ""))
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const [selectedCategory, setSelectedCategory] = useState<string>(slug)
  const [products, setProducts] = useState<ProductSummary[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500])
  const [inStockOnly, setInStockOnly] = useState(false)
  const { formatPrice } = useCurrency()

  // Load categories and products for current slug
  useEffect(() => {
    const load = async () => {
      try { setAllCategories(await apiListCategories()) } catch { setAllCategories([]) }
      try {
        const list = await apiGetProductsByCategorySlug(slug, {
          search: searchTerm || undefined,
          inStockOnly: inStockOnly || undefined,
        })
        setProducts(list)
      } catch {
        setProducts([])
      }
    }
    load()
  }, [slug, searchTerm, inStockOnly])
  const { addToCart } = useCart()
  const { toast } = useToast()

  const [imageIndices, setImageIndices] = useState<Record<string, number>>({})
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [galleryImages, setGalleryImages] = useState<string[]>([])
  const [galleryStartIndex, setGalleryStartIndex] = useState(0)
  const [cardImages, setCardImages] = useState<Record<string, string[]>>({})

  // Derive display name for heading and sync selectedCategory to the category name
  useEffect(() => {
    const found = allCategories.find((c) => c.slug === slug)
    if (found) setSelectedCategory(found.name)
  }, [slug, allCategories])

  const navImage = (productId: string, dir: "prev" | "next", total: number) => {
    setImageIndices((prev) => {
      const cur = prev[productId] || 0
      const n = dir === "next" ? (cur + 1) % total : (cur - 1 + total) % total
      return { ...prev, [productId]: n }
    })
  }
  const openGallery = (images: string[], startIndex = 0) => {
    setGalleryImages(images)
    setGalleryStartIndex(startIndex)
    setGalleryOpen(true)
  }
  const ensureCardImages = async (product: ProductSummary) => {
    if (cardImages[product.id]) return
    try {
      const detail = await apiGetProduct(product.id)
      const imgs = [detail.primaryImageUrl as any, ...(detail.images || [])].filter(Boolean) as string[]
      if (imgs.length > 0) setCardImages((prev) => ({ ...prev, [product.id]: imgs }))
    } catch {}
  }
  const openProductGallery = async (product: ProductSummary, startIndex = 0) => {
    const initial = [product.primaryImageUrl as any].filter(Boolean) as string[]
    openGallery(initial, startIndex)
    try {
      const detail = await apiGetProduct(product.id)
      const imgs = [detail.primaryImageUrl as any, ...(detail.images || [])].filter(Boolean) as string[]
      if (imgs.length) setGalleryImages(imgs)
    } catch {}
  }
  const handleAdd = async (id: string, name: string) => {
    const ok = await addToCart(id, 1)
    if (ok) toast({ title: "Added to Cart", description: `${name} added to your cart` })
    else toast({ title: "Add to cart failed", description: "Please try again", variant: 'destructive' })
  }

  const maxPrice = Math.max(...products.map((p) => p.price), 500)

  const handleReset = () => {
    setSearchTerm("")
    setSelectedCategory(slug)
    setPriceRange([0, maxPrice])
    setInStockOnly(false)
  }

  // Sidebar uses category names, route uses slug
  const handleCategoryChange = (catName: string) => {
    setSelectedCategory(catName)
    const slugMatch = allCategories.find((c) => c.name === catName)?.slug || catName
    router.push(`/category/${encodeURIComponent(slugMatch)}`)
  }

  // Sidebar category list (names)
  const sidebarCategories = useMemo(() => allCategories.map((c) => c.name), [allCategories])

  // Client-side price filter only
  const filtered = useMemo(() => {
    return products
      .filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1])
  }, [products, priceRange])

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-3xl md:text-4xl font-bold text-foreground">{selectedCategory}</h1>
          </div>

          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            <ShopFilters
              categories={[...sidebarCategories]}
              selectedCategory={selectedCategory}
              onCategoryChange={handleCategoryChange}
              priceRange={priceRange}
              onPriceChange={(r) => setPriceRange(r)}
              maxPrice={maxPrice}
              inStockOnly={inStockOnly}
              onInStockChange={setInStockOnly}
              onReset={handleReset}
            />

            <div className="flex-1">
              <div className="mb-4">
                <Input
                  placeholder="Search products..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
                  <p className="text-sm text-muted-foreground mt-2">Showing {filtered.length} items</p>
              </div>

              {filtered.length === 0 ? (
                <p className="text-muted-foreground">No products found.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                  {filtered.map((product) => {
                    const imgs = (cardImages[product.id] || [product.primaryImageUrl as any]).filter(Boolean) as string[]
                    const idx = imageIndices[product.id] || 0
                    const current = imgs[idx] || (product.primaryImageUrl as any)
                    return (
                      <Card key={product.id} className="overflow-hidden hover:shadow-lg transition-shadow border-0 shadow">
                    <div className="relative h-40 md:h-48 bg-secondary overflow-hidden group" onMouseEnter={() => ensureCardImages(product)}>
                      <Link href={`/product/${product.id}`}>
                        <img
                          src={(current as string) || "/placeholder.svg"}
                          alt={product.name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform cursor-pointer"
                          onError={(e) => (e.currentTarget.src = "/placeholder.svg")}
                        />
                      </Link>
                      {product.discount && product.discount > 0 && (
                        <div className="absolute top-2 left-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                          {product.discount}% OFF
                        </div>
                      )}
                      {imgs.length > 1 && (
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
                        </>
                      )}
                      <button
                        onClick={(e) => {
                          e.preventDefault()
                          openProductGallery(product, idx)
                        }}
                        onMouseEnter={() => ensureCardImages(product)}
                        onFocus={() => ensureCardImages(product)}
                        className="absolute inset-0"
                        aria-label="Open gallery"
                      />
                    </div>
                    <CardHeader className="pb-3">
                      <Link href={`/product/${product.id}`}>
                        <CardTitle className="line-clamp-2 hover:text-primary transition">{product.name}</CardTitle>
                      </Link>
                      <CardDescription className="line-clamp-2">{product.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-baseline gap-2">
                        <div className="flex items-baseline gap-2 flex-1 min-w-0 flex-wrap">
                          <span className="text-2xl font-bold text-primary whitespace-nowrap">
                            {formatPrice(product.discountedPrice || product.price)}
                          </span>
                          {product.discountedPrice && (
                            <span className="text-xs md:text-sm text-gray-500 line-through">{formatPrice(product.price)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex justify-end">
                        <span
                          className={`text-xs px-2 py-1 rounded font-medium whitespace-nowrap inline-flex items-center w-max ${
                            product.stock > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}
                        >
                          {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <Link href={`/product/${product.id}`} className="flex-1">
                          <Button variant="outline" className="w-full bg-transparent">
                            View Details
                          </Button>
                        </Link>
                        <Button onClick={() => handleAdd(product.id, product.name)} disabled={product.stock === 0}>
                          <ShoppingCart className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                  )
                })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
      <ImageGalleryPopup
        isOpen={galleryOpen}
        images={galleryImages}
        startIndex={galleryStartIndex}
        onClose={() => setGalleryOpen(false)}
      />
    </div>
  )
}
