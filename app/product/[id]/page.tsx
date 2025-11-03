"use client"

import { useEffect, useState } from "react"
import { apiGetProduct, type ProductDetail } from "@/lib/api"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useParams, useRouter } from "next/navigation"
import { ArrowLeft, ShoppingCart, Heart, Share2, Truck, Shield, RotateCcw } from "lucide-react"
import { useCart } from "@/lib/cart-context"
import { ProductImageSlider } from "@/components/product-image-slider"
import { ImageGalleryPopup } from "@/components/image-gallery-popup"
import { useToast } from "@/hooks/use-toast"
import { useCurrency } from "@/lib/currency-context"

export default function ProductDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { addToCart } = useCart()
  const { toast } = useToast()
  const [product, setProduct] = useState<ProductDetail | null>(null)
  const [quantity, setQuantity] = useState(1)
  const [galleryOpen, setGalleryOpen] = useState(false)
  const [galleryStartIndex, setGalleryStartIndex] = useState(0)
  const [isWishlisted, setIsWishlisted] = useState(false)
  const { formatPrice } = useCurrency()

  useEffect(() => {
    const id = params.id as string
    const load = async () => {
      try { setProduct(await apiGetProduct(id)) }
      catch { setProduct(null) }
    }
    load()
  }, [params.id])

  if (!product) {
    return (
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <p className="text-muted-foreground">Product not found</p>
          <Link href="/shop">
            <Button className="mt-4">Back to Shop</Button>
          </Link>
        </div>
      </div>
    )
  }

  const handleAddToCart = async () => {
    try {
      const ok = await addToCart(product.id, quantity)
      if (ok) {
        toast({ title: "Added to Cart", description: `${quantity} x ${product.name} added to your cart` })
      } else {
        toast({ title: "Add to cart failed", description: "Please try again", variant: 'destructive' })
      }
    } catch (err: any) {
      const message = err?.message || 'Unable to add to cart'
      const code = err?.code ? ` (${err.code})` : ''
      toast({ title: `Add to cart failed${code}` , description: message, variant: 'destructive' })
    }
  }

  const allImages = [product.primaryImageUrl, ...(product.images || [])].filter(Boolean)

  const displayPrice = product.discountedPrice || product.price
  const originalPrice = product.price
  const discountPercent = product.discount || 0

  const handleShare = async () => {
    try {
      const url = typeof window !== 'undefined' ? window.location.href : ''
      const shareData = { title: product.name, text: product.description, url }
      if (typeof navigator !== 'undefined' && (navigator as any).share) {
        await (navigator as any).share(shareData)
        return
      }
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(url)
        toast({ title: 'Link copied', description: 'Product URL copied to clipboard' })
        return
      }
      if (typeof window !== 'undefined') {
        const subject = encodeURIComponent(`Check this out: ${product.name}`)
        const body = encodeURIComponent(`${product.description}\n\n${url}`)
        window.location.href = `mailto:?subject=${subject}&body=${body}`
      }
    } catch (e: any) {
      toast({ title: 'Share failed', description: e?.message || 'Unable to share', variant: 'destructive' })
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-6 md:py-8">
          <Button variant="ghost" onClick={() => router.back()} className="mb-6 hover:bg-gray-100">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
            {/* Image Section */}
            <div className="flex flex-col gap-4">
              <ProductImageSlider
                images={allImages}
                productName={product.name}
                onImageClick={(img, idx) => { setGalleryStartIndex(idx); setGalleryOpen(true) }}
              />
            </div>

            {/* Details Section */}
            <div className="space-y-6">
              {/* Header */}
              <div>
                <div className="flex items-start justify-between gap-4 mb-4">
                  <div>
                    <p className="text-sm font-medium text-blue-600 mb-2 uppercase tracking-wide">{product.categoryName}</p>
                    <h1 className="text-3xl md:text-4xl font-bold text-gray-900">{product.name}</h1>
                  </div>
                  <button
                    onClick={() => setIsWishlisted(!isWishlisted)}
                    className={`p-2 rounded-full transition-all ${
                      isWishlisted ? "bg-red-100 text-red-600" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                    }`}
                  >
                    <Heart className={`w-6 h-6 ${isWishlisted ? "fill-current" : ""}`} />
                  </button>
                </div>
                <p className="text-gray-600 text-lg leading-relaxed">{product.description}</p>
              </div>

              {/* Price and Stock */}
              <div className="border-y border-gray-200 py-6">
                <div className="flex items-baseline gap-4 mb-4">
                  <span className="text-5xl font-bold text-gray-900">{formatPrice(displayPrice)}</span>
                  {product.discountedPrice && (
                    <>
                      <span className="text-lg text-gray-500 line-through">{formatPrice(originalPrice)}</span>
                      <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-sm font-semibold">
                        {discountPercent}% OFF
                      </span>
                    </>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex-1 bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-green-500 h-2 rounded-full"
                      style={{ width: `${Math.min((product.stock / 100) * 100, 100)}%` }}
                    />
                  </div>
                  <span className={`text-sm font-medium ${product.stock > 0 ? "text-green-600" : "text-red-600"}`}>
                    {product.stock > 0 ? `${product.stock} in stock` : "Out of stock"}
                  </span>
                </div>
              </div>

              {/* Quantity and Add to Cart */}
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-semibold text-gray-700 block mb-3">Quantity</label>
                  <div className="flex items-center gap-3 bg-gray-100 rounded-lg p-2 w-fit">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      className="hover:bg-gray-200"
                    >
                      −
                    </Button>
                    <Input
                      type="number"
                      min="1"
                      max={product.stock}
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, Number.parseInt(e.target.value) || 1))}
                      className="w-16 text-center border-0 bg-transparent font-semibold"
                    />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                      className="hover:bg-gray-200"
                    >
                      +
                    </Button>
                  </div>
                </div>

                <div className="flex gap-3 flex-col sm:flex-row">
                  <Button
                    onClick={handleAddToCart}
                    disabled={product.stock === 0}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-6 text-lg font-semibold"
                    size="lg"
                  >
                    <ShoppingCart className="w-5 h-5 mr-2" />
                    Add to Cart
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 border-2 border-gray-300 hover:bg-gray-50 py-6 text-lg font-semibold bg-transparent"
                    size="lg"
                    onClick={handleShare}
                  >
                    <Share2 className="w-5 h-5 mr-2" />
                    Share
                  </Button>
                </div>
              </div>

              {/* Trust Badges */}
              <div className="grid grid-cols-3 gap-4 pt-4">
                <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-lg">
                  <Truck className="w-6 h-6 text-blue-600 mb-2" />
                  <p className="text-xs font-medium text-gray-700">Free Shipping</p>
                </div>
                <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-lg">
                  <Shield className="w-6 h-6 text-blue-600 mb-2" />
                  <p className="text-xs font-medium text-gray-700">Secure Payment</p>
                </div>
                <div className="flex flex-col items-center text-center p-3 bg-gray-50 rounded-lg">
                  <RotateCcw className="w-6 h-6 text-blue-600 mb-2" />
                  <p className="text-xs font-medium text-gray-700">Easy Returns</p>
                </div>
              </div>

              {/* Product Details Card */}
              <Card className="border-0 shadow-md">
                <CardContent className="pt-6 space-y-4">
                  <h3 className="font-bold text-lg text-gray-900">Product Details</h3>
                  <div className="space-y-3 text-sm">
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Category</span>
                      <span className="font-medium text-gray-900">{product.categoryName}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-gray-200">
                      <span className="text-gray-600">Product ID</span>
                      <span className="font-medium text-gray-900 font-mono">{product.id}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-gray-600">Availability</span>
                      <span className={`font-medium ${product.stock > 0 ? "text-green-600" : "text-red-600"}`}>
                        {product.stock > 0 ? "In Stock" : "Out of Stock"}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </div>

      <ImageGalleryPopup isOpen={galleryOpen} images={allImages} startIndex={galleryStartIndex} onClose={() => setGalleryOpen(false)} />
      <Footer />
    </div>
  )
}
