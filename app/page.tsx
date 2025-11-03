"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { apiGetProducts, apiGetProduct, apiListCategories, type ProductSummary, type Category } from "@/lib/api"
import { ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { useToast } from "@/hooks/use-toast"
import { ImageGalleryPopup } from "@/components/image-gallery-popup"
import { useCurrency } from "@/lib/currency-context"

export default function Home() {
  const { user, isLoading } = useAuth()
  const router = useRouter()
  const { addToCart } = useCart()
  const { toast } = useToast()
  const [products, setProducts] = useState<ProductSummary[]>([])
  const [categorySliderIndex, setCategorySliderIndex] = useState(0)
  const [hotProducts, setHotProducts] = useState<ProductSummary[]>([])
  const [heroImageIndex, setHeroImageIndex] = useState(0)
  const [cardImageIndices, setCardImageIndices] = useState<Record<string, number>>({})
  const [cardImages, setCardImages] = useState<Record<string, string[]>>({})
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [galleryImages, setGalleryImages] = useState<string[]>([])
  const [galleryStartIndex, setGalleryStartIndex] = useState(0)
  const { formatPrice } = useCurrency()
  const [allCategories, setAllCategories] = useState<Category[]>([])

  useEffect(() => {
    const load = async () => {
      try {
        const allProducts = await apiGetProducts()
        setProducts(allProducts)
        setHotProducts(allProducts)
      } catch {
        setProducts([])
        setHotProducts([])
      }
    }
    load()
  }, [])

  useEffect(() => {
    const loadCats = async () => {
      try { setAllCategories(await apiListCategories()) } catch { setAllCategories([]) }
    }
    loadCats()
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setHeroImageIndex((prev) => (prev + 1) % 3)
    }, 5000)
    return () => clearInterval(interval)
  }, [])

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // Derive categories; if backend doesn’t return categoryName, fall back to "All"
  const categoriesRaw = Array.from(new Set(products.map((p) => p.categoryName).filter(Boolean))) as string[]
  const categories = categoriesRaw.length ? categoriesRaw : ["All"]
  const accessoriesCat = allCategories.find((c) => c.name?.toLowerCase() === 'accessories')
  const featuredCategoryName = accessoriesCat?.name || categories[0]
  const featuredCategorySlug = accessoriesCat?.slug || (featuredCategoryName !== "All" ? allCategories.find((c) => c.name === featuredCategoryName)?.slug : undefined)
  const categoryProducts = featuredCategoryName && featuredCategoryName !== "All" ? products.filter((p) => p.categoryName === featuredCategoryName) : products
  const visibleCategoryProducts = categoryProducts.slice(categorySliderIndex, categorySliderIndex + 4)

  const handlePrevSlide = () => {
    setCategorySliderIndex(Math.max(0, categorySliderIndex - 1))
  }

  const handleNextSlide = () => {
    if (categorySliderIndex < categoryProducts.length - 4) {
      setCategorySliderIndex(categorySliderIndex + 1)
    }
  }

  const handleAddToCart = async (product: ProductSummary) => {
    try {
      const ok = await addToCart(product.id, 1)
      if (ok) {
        toast({ title: "Added to Cart", description: `${product.name} added to your cart` })
      } else {
        toast({ title: "Add to cart failed", description: "Please try again", variant: 'destructive' })
      }
    } catch (err: any) {
      const message = err?.message || 'Unable to add to cart'
      const code = err?.code ? ` (${err.code})` : ''
      toast({ title: `Add to cart failed${code}`, description: message, variant: 'destructive' })
    }
  }

  const heroImages = ["/electronics-hero-1.jpg", "/electronics-hero-2.jpg", "/electronics-hero-3.jpg"]
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
  const navCardImage = (productId: string, direction: "prev" | "next", total: number) => {
    setCardImageIndices((prev) => {
      const cur = prev[productId] || 0
      const next = direction === "next" ? (cur + 1) % total : (cur - 1 + total) % total
      return { ...prev, [productId]: next }
    })
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-primary to-primary/80 text-white py-12 md:py-32 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12 items-center">
            <div className="space-y-6">
              <h1 className="text-4xl md:text-6xl font-bold leading-tight">Discover Premium Products</h1>
              <p className="text-base md:text-xl text-white/90">
                Shop the latest electronics, accessories, and more. Fast shipping, secure checkout, and 24/7 customer
                support.
              </p>
              <div className="flex gap-4 pt-4 flex-col sm:flex-row">
                <Link href="/shop">
                  <Button size="lg" className="bg-white text-primary hover:bg-white/90 w-full sm:w-auto">
                    Shop Now
                  </Button>
                </Link>
                <Link href="#hot-products">
                  <Button
                    size="lg"
                    variant="outline"
                    className="border-white text-white hover:bg-white/10 bg-transparent w-full sm:w-auto"
                  >
                    View Hot Deals
                  </Button>
                </Link>
              </div>
            </div>
            <div className="hidden md:block relative">
              <div className="bg-white/10 rounded-lg p-8 backdrop-blur-sm overflow-hidden">
                <div className="relative w-full aspect-video bg-gray-200 rounded-lg overflow-hidden">
                  <img
                    src={heroImages[heroImageIndex] || "/placeholder.svg"}
                    alt={`Hero ${heroImageIndex + 1}`}
                    className="w-full h-full object-cover transition-opacity duration-500"
                  />
                  {/* Hero slider controls */}
                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-2">
                    {heroImages.map((_, index) => (
                      <button
                        key={index}
                        onClick={() => setHeroImageIndex(index)}
                        className={`w-2 h-2 rounded-full transition-all ${
                          index === heroImageIndex ? "bg-white w-6" : "bg-white/50"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Hot Products Section */}
      <section id="hot-products" className="py-12 md:py-24 bg-background px-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-8 md:mb-12 flex-col md:flex-row gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-2">Hot Products</h2>
              <p className="text-muted-foreground">Check out our best-selling items</p>
            </div>
            <Link href="/shop">
              <Button variant="outline" size="lg">
                View All Products
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {hotProducts.map((product) => {
              const productImages = [product.primaryImageUrl as any, ...(product as any).images || []].filter(Boolean)
              return (
                <div
                  key={product.id}
                  className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition"
                >
                  <Link href={`/product/${product.id}`}>
                    <div className="relative aspect-square bg-secondary overflow-hidden cursor-pointer group" onMouseEnter={() => ensureCardImages(product)}>
                      {(() => {
                        const imgs = (cardImages[product.id] || [product.primaryImageUrl as any]).filter(Boolean)
                        const idx = cardImageIndices[product.id] || 0
                        const current = imgs[idx] || product.primaryImageUrl
                        return (
                          <img
                            src={current || "/placeholder.svg"}
                            alt={product.name}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            onError={(e) => {
                              e.currentTarget.src = "/placeholder.svg"
                            }}
                          />
                        )
                      })()}

                      {product.discount && product.discount > 0 && (
                        <div className="absolute top-2 left-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                          {product.discount}% OFF
                        </div>
                      )}
                      {(() => {
                        const imgs = (cardImages[product.id] || [product.primaryImageUrl as any]).filter(Boolean)
                        const idx = cardImageIndices[product.id] || 0
                        if (imgs.length > 1) {
                          return (
                            <>
                              <div className="absolute bottom-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs font-medium">
                                {idx + 1} / {imgs.length}
                              </div>
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  navCardImage(product.id, "prev", imgs.length)
                                }}
                                className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition-all opacity-0 group-hover:opacity-100 z-10"
                                aria-label="Previous image"
                              >
                                <ChevronLeft className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  navCardImage(product.id, "next", imgs.length)
                                }}
                                className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition-all opacity-0 group-hover:opacity-100 z-10"
                                aria-label="Next image"
                              >
                                <ChevronRight className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.preventDefault()
                                  openProductGallery(product, idx)
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
                                  openProductGallery(product, 0)
                                }}
                                className="absolute inset-0"
                                aria-label="Open image"
                              />
                        )
                      })()}
                    </div>
                  </Link>
                  <div className="p-4 space-y-3">
                    <Link href={`/product/${product.id}`}>
                      <h3 className="font-semibold text-foreground line-clamp-2 hover:text-primary transition">
                        {product.name}
                      </h3>
                    </Link>
                    <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-3 pt-2">
                      <div className="order-1 flex items-baseline gap-2 flex-1 min-w-0 flex-wrap">
                        <span className="text-2xl font-bold text-primary whitespace-nowrap">
                          {formatPrice(product.discountedPrice || product.price)}
                        </span>
                        {product.discountedPrice && (
                          <span className="text-xs md:text-sm text-gray-500 line-through">{formatPrice(product.price)}</span>
                        )}
                      </div>
                      <span
                        className={`order-2 text-xs px-2 py-1 rounded font-medium inline-flex items-center w-max ml-0.5 self-start md:self-auto shrink-0 ${
                          product.stock > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                        }`}
                      >
                        {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                      </span>
                    </div>
                    <div className="flex gap-2 pt-2">
                      <Link href={`/product/${product.id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full bg-transparent">
                          View Details
                        </Button>
                      </Link>
                      <Button size="sm" onClick={() => handleAddToCart(product)} disabled={product.stock === 0}>
                        <ShoppingCart className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      {/* Category Slider Section */}
      {categories.length > 0 && (
        <section className="py-12 md:py-24 bg-secondary/30 px-4">
          <div className="max-w-7xl mx-auto">
            <div className="flex justify-between items-center mb-8 md:mb-12 flex-col md:flex-row gap-4">
              <h2 className="text-3xl md:text-4xl font-bold text-foreground">Featured: {featuredCategoryName}</h2>
              <Link href={featuredCategorySlug ? `/shop?category=${encodeURIComponent(featuredCategorySlug)}` : "/shop"}>
                <Button variant="outline">View All {featuredCategoryName}</Button>
              </Link>
            </div>

            <div className="relative">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
                {visibleCategoryProducts.map((product) => (
                  <div
                    key={product.id}
                    className="bg-card border border-border rounded-lg overflow-hidden hover:shadow-lg transition"
                  >
                    <Link href={`/product/${product.id}`}>
                      <div className="relative aspect-square bg-secondary overflow-hidden cursor-pointer group" onMouseEnter={() => ensureCardImages(product)}>
                        {(() => {
                          const imgs = (cardImages[product.id] || [product.primaryImageUrl as any]).filter(Boolean)
                          const idx = cardImageIndices[product.id] || 0
                          const current = imgs[idx] || product.primaryImageUrl
                          return (
                            <img
                              src={(current as string) || "/placeholder.svg"}
                              alt={product.name}
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                              onError={(e) => {
                                e.currentTarget.src = "/placeholder.svg"
                              }}
                            />
                          )
                        })()}
                        {product.discount && product.discount > 0 && (
                          <div className="absolute top-2 left-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-bold">
                            {product.discount}% OFF
                          </div>
                        )}
                        {(() => {
                          const imgs = (cardImages[product.id] || [product.primaryImageUrl as any]).filter(Boolean)
                          const idx = cardImageIndices[product.id] || 0
                          if (imgs.length > 1) {
                            return (
                              <>
                                <div className="absolute bottom-2 right-2 bg-black/60 text-white px-2 py-1 rounded text-xs font-medium">
                                  {idx + 1} / {imgs.length}
                                </div>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault()
                                    navCardImage(product.id, "prev", imgs.length)
                                  }}
                                  className="absolute left-1 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition-all opacity-0 group-hover:opacity-100 z-10"
                                  aria-label="Previous image"
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault()
                                    navCardImage(product.id, "next", imgs.length)
                                  }}
                                  className="absolute right-1 top-1/2 -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full transition-all opacity-0 group-hover:opacity-100 z-10"
                                  aria-label="Next image"
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.preventDefault()
                                    openProductGallery(product, idx)
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
                                openProductGallery(product, 0)
                              }}
                              className="absolute inset-0"
                              aria-label="Open image"
                            />
                          )
                        })()}
                      </div>
                    </Link>
                    <div className="p-4 space-y-3">
                      <Link href={`/product/${product.id}`}>
                        <h3 className="font-semibold text-foreground line-clamp-2 hover:text-primary transition">
                          {product.name}
                        </h3>
                      </Link>
                      <p className="text-sm text-muted-foreground line-clamp-2">{product.description}</p>
                      <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between md:gap-3 pt-2">
                        <span
                          className={`order-1 md:order-2 text-xs px-2 py-1 rounded font-medium inline-flex items-center w-max ml-0.5 self-start md:self-auto shrink-0 ${
                            product.stock > 0 ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                          }`}
                        >
                          {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                        </span>
                        <div className="order-2 md:order-1 flex items-baseline gap-2 flex-1 min-w-0">
                        <span className="text-2xl font-bold text-primary whitespace-nowrap">
                            {formatPrice(product.discountedPrice || product.price)}
                          </span>
                          {product.discountedPrice && (
                            <span className="text-xs md:text-sm text-gray-500 line-through whitespace-nowrap">{formatPrice(product.price)}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex gap-2 pt-2">
                        <Link href={`/product/${product.id}`} className="flex-1">
                          <Button variant="outline" size="sm" className="w-full bg-transparent">
                            View Details
                          </Button>
                        </Link>
                        <Button size="sm" onClick={() => handleAddToCart(product)} disabled={product.stock === 0}>
                          <ShoppingCart className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Slider Controls */}
              {categoryProducts.length > 4 && (
                <div className="flex gap-2 justify-center mt-8">
                  <Button variant="outline" size="icon" onClick={handlePrevSlide} disabled={categorySliderIndex === 0}>
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextSlide}
                    disabled={categorySliderIndex >= categoryProducts.length - 4}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* FAQ Section */}
      <section id="faq" className="py-12 md:py-24 bg-background px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-3xl md:text-4xl font-bold text-foreground mb-8 md:mb-12 text-center">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4 md:space-y-6">
            {[
              {
                q: "What payment methods do you accept?",
                a: "We accept credit/debit cards and cash on delivery (COD) for your convenience.",
              },
              {
                q: "How long does shipping take?",
                a: "Standard shipping takes 5-7 business days. Express shipping options are available at checkout.",
              },
              {
                q: "Can I return products?",
                a: "Yes, we offer a 30-day return policy for most items. Please contact our support team for details.",
              },
              {
                q: "Do you offer discounts?",
                a: "Yes! We regularly offer coupons and discounts. Check our promotions page for current deals.",
              },
              {
                q: "Is my payment information secure?",
                a: "Absolutely. We use industry-standard encryption to protect all payment information.",
              },
              {
                q: "How do I track my order?",
                a: "Once your order is placed, you can track it from your customer dashboard or order confirmation email.",
              },
            ].map((faq, index) => (
              <div key={index} className="bg-card border border-border rounded-lg p-4 md:p-6">
                <h3 className="font-semibold text-foreground mb-2">{faq.q}</h3>
                <p className="text-muted-foreground text-sm md:text-base">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-card border-t border-border py-8 md:py-12 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 mb-8">
            <div>
              <h3 className="font-bold text-lg text-foreground mb-4">ShopHub</h3>
              <p className="text-muted-foreground text-sm">
                Your trusted online marketplace for premium products and exceptional service.
              </p>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Quick Links</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link href="/shop" className="text-muted-foreground hover:text-primary transition">
                    Shop
                  </Link>
                </li>
                <li>
                  <Link href="/#faq" className="text-muted-foreground hover:text-primary transition">
                    FAQ
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Support</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition">
                    Help Center
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition">
                    Shipping Info
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold text-foreground mb-4">Legal</h4>
              <ul className="space-y-2 text-sm">
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition">
                    Privacy Policy
                  </a>
                </li>
                <li>
                  <a href="#" className="text-muted-foreground hover:text-primary transition">
                    Terms of Service
                  </a>
                </li>
              </ul>
            </div>
          </div>

          <div className="border-t border-border pt-8">
            <p className="text-center text-muted-foreground text-sm">© 2025 ShopHub. All rights reserved.</p>
          </div>
        </div>
      </footer>
      <ImageGalleryPopup
        isOpen={galleryOpen}
        images={galleryImages}
        startIndex={galleryStartIndex}
        onClose={() => setGalleryOpen(false)}
      />
    </div>
  )
}

