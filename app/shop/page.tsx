"use client"

import { useState, useMemo, useEffect } from "react"
import { apiGetProducts, apiGetProduct, apiListCategories, type ProductSummary, type Category } from "@/lib/api"
import { Footer } from "@/components/footer"
import { ShopFilters } from "@/components/shop-filters"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useRouter, useSearchParams, usePathname } from "next/navigation"
import { ShoppingCart, ChevronLeft, ChevronRight } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { useToast } from "@/hooks/use-toast"
import { ImageGalleryPopup } from "@/components/image-gallery-popup"
import { useCurrency } from "@/lib/currency-context"

export default function ShopPage() {
  const [products, setProducts] = useState<ProductSummary[]>([])
  const [allCategories, setAllCategories] = useState<Category[]>([])
  const { addToCart } = useCart()
  const { toast } = useToast()
  const router = useRouter()
  const searchParams = useSearchParams()
  const pathname = usePathname()
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("All")
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 500])
  const [inStockOnly, setInStockOnly] = useState(false)
  const [productImageIndices, setProductImageIndices] = useState<Record<string, number>>({})
  const [cardImages, setCardImages] = useState<Record<string, string[]>>({})
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [galleryImages, setGalleryImages] = useState<string[]>([])
  const [galleryStartIndex, setGalleryStartIndex] = useState(0)
  const { formatPrice } = useCurrency()

  // Load categories once
  useEffect(() => {
    const loadCats = async () => {
      try { setAllCategories(await apiListCategories()) } catch { setAllCategories([]) }
    }
    loadCats()
  }, [])

  // Derive category options and mapping
  const categories = useMemo(() => ["All", ...allCategories.map((c) => c.name)], [allCategories])
  const selectedCategoryId = useMemo(() => {
    if (selectedCategory === "All") return undefined
    const cat = allCategories.find((c) => c.name === selectedCategory)
    return cat?.id
  }, [selectedCategory, allCategories])

  // Sync selectedCategory from ?category=slug in URL when categories load or URL changes
  useEffect(() => {
    const slug = searchParams?.get("category") || undefined
    if (!slug) {
      setSelectedCategory("All")
      return
    }
    const match = allCategories.find((c) => c.slug === slug)
    if (match) setSelectedCategory(match.name)
  }, [searchParams, allCategories])

  // Fetch products when server-side filters change
  useEffect(() => {
    const load = async () => {
      try {
        const list = await apiGetProducts({
          search: searchTerm || undefined,
          categoryId: selectedCategoryId,
          inStockOnly: inStockOnly || undefined,
        })
        setProducts(list)
      } catch {
        setProducts([])
      }
    }
    load()
  }, [searchTerm, selectedCategoryId, inStockOnly])

  const maxPrice = Math.max(...products.map((p) => p.price), 500)

  // Apply client-side price filter only
  const filteredProducts = useMemo(() => {
    return products.filter((p) => p.price >= priceRange[0] && p.price <= priceRange[1])
  }, [priceRange, products])

  const handleAddToCart = async (productId: string, productName: string) => {
    try {
      const ok = await addToCart(productId, 1)
      if (ok) {
        toast({ title: "Added to Cart", description: `${productName} added to your cart` })
      } else {
        toast({ title: "Add to cart failed", description: "Please try again", variant: 'destructive' })
      }
    } catch (err: any) {
      const message = err?.message || 'Unable to add to cart'
      const code = err?.code ? ` (${err.code})` : ''
      toast({ title: `Add to cart failed${code}`, description: message, variant: 'destructive' })
    }
  }

  const handleResetFilters = () => {
    setSearchTerm("")
    setSelectedCategory("All")
    setPriceRange([0, maxPrice])
    setInStockOnly(false)
    const sp = new URLSearchParams(searchParams?.toString())
    sp.delete("category")
    router.push(`${pathname}${sp.toString() ? `?${sp.toString()}` : ""}`)
  }

  const handleImageNav = (productId: string, direction: "prev" | "next", totalImages: number) => {
    setProductImageIndices((prev) => {
      const currentIndex = prev[productId] || 0
      let newIndex = currentIndex
      if (direction === "next") {
        newIndex = (currentIndex + 1) % totalImages
      } else {
        newIndex = (currentIndex - 1 + totalImages) % totalImages
      }
      return { ...prev, [productId]: newIndex }
    })
  }

  const openGallery = (images: string[], startIndex = 0) => {
    setGalleryImages(images)
    setGalleryStartIndex(startIndex)
    setGalleryOpen(true)
  }

  // Lazy-load additional images for cards and gallery
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

  // When user changes category via sidebar, update URL with slug
  const handleChangeCategory = (name: string) => {
    setSelectedCategory(name)
    const slug = allCategories.find((c) => c.name === name)?.slug
    const sp = new URLSearchParams(searchParams?.toString())
    if (slug && name !== "All") sp.set("category", slug)
    else sp.delete("category")
    router.push(`${pathname}${sp.toString() ? `?${sp.toString()}` : ""}`)
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-8">
          {/* Search Bar */}
          <div className="mb-8">
            <Input
              placeholder="Search products..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full"
            />
          </div>

          {/* Main Content with Filters */}
          <div className="flex flex-col md:flex-row gap-6 md:gap-8">
            {/* Sidebar Filters */}
            <ShopFilters
              categories={categories}
              selectedCategory={selectedCategory}
              onCategoryChange={handleChangeCategory}
              priceRange={priceRange}
              onPriceChange={setPriceRange}
              maxPrice={maxPrice}
              inStockOnly={inStockOnly}
              onInStockChange={setInStockOnly}
              onReset={handleResetFilters}
            />

            {/* Products Grid */}
            <div className="flex-1">
              {filteredProducts.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground text-lg">No products found matching your filters</p>
                  <Button variant="outline" onClick={handleResetFilters} className="mt-4 bg-transparent">
                    Reset Filters
                  </Button>
                </div>
              ) : (
                <>
                  <p className="text-sm text-muted-foreground mb-4">
                    Showing {filteredProducts.length} of {products.length} products
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                    {filteredProducts.map((product) => {
                      const imgs = (cardImages[product.id] || [product.primaryImageUrl as any]).filter(Boolean) as string[]
                      const currentImageIndex = productImageIndices[product.id] || 0
                      const currentImage = imgs[currentImageIndex] || (product.primaryImageUrl as any)

                      return (
                        <Card
                          key={product.id}
                          className="overflow-hidden hover:shadow-lg transition-shadow border-0 shadow"
                        >
                          <div
                            className="relative h-40 md:h-48 bg-secondary overflow-hidden group"
                            onMouseEnter={() => ensureCardImages(product)}
                          >
                            <Link href={`/product/${product.id}`}>
                              <img
                                src={(currentImage as string) || "/placeholder.svg"}
                                alt={product.name}
                                className="w-full h-full object-cover group-hover:scale-105 transition-transform cursor-pointer"
                                onError={(e) => {
                                  e.currentTarget.src = "/placeholder.svg"
                                }}
                              />
                            </Link>

                            {product.discount && product.discount > 0 && (
                              <div className="absolute top-2 left-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                                {product.discount}% OFF
                              </div>
                            )}

                            {/* Image counter and navigation */}
                            {imgs.length > 1 && (
                              <>
                                <div className="absolute bottom-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs font-medium">
                                  {currentImageIndex + 1} / {imgs.length}
                                </div>

                                {/* Navigation buttons */}
                                <button
                                  onClick={(e) => {
                                    e.preventDefault()
                                    handleImageNav(product.id, "prev", imgs.length)
                                  }}
                                  className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition-all opacity-0 group-hover:opacity-100 z-10"
                                  aria-label="Previous image"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault()
                                    handleImageNav(product.id, "next", imgs.length)
                                  }}
                                  className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition-all opacity-0 group-hover:opacity-100 z-10"
                                  aria-label="Next image"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </>
                            )}

                            {/* Click overlay to open gallery */}
                            <button
                              onClick={(e) => {
                                e.preventDefault()
                                openProductGallery(product, currentImageIndex)
                              }}
                              onMouseEnter={() => ensureCardImages(product)}
                              onFocus={() => ensureCardImages(product)}
                              className="absolute inset-0"
                              aria-label="Open gallery"
                            />
                          </div>

                          <CardHeader className="pb-3">
                            <Link href={`/product/${product.id}`}>
                              <CardTitle className="line-clamp-2 hover:text-primary transition">
                                {product.name}
                              </CardTitle>
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
                                  <span className="text-xs md:text-sm text-gray-500 line-through">
                                    {formatPrice(product.price)}
                                  </span>
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
                              <Button
                                onClick={() => handleAddToCart(product.id, product.name)}
                                disabled={product.stock === 0}
                              >
                                <ShoppingCart className="w-4 h-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <Footer />
      <ImageGalleryPopup
        isOpen={galleryOpen}
        images={galleryImages}
        startIndex={galleryStartIndex}
        onClose={() => setGalleryOpen(false)}
      />
    </div>
  )
}
