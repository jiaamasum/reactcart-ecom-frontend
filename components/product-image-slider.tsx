"use client"

import { useState } from "react"
import { ChevronLeft, ChevronRight, Eye } from "lucide-react"

interface ProductImageSliderProps {
  images: string[]
  productName: string
  onImageClick?: (imageUrl: string, index: number) => void
}

export function ProductImageSlider({ images, productName, onImageClick }: ProductImageSliderProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set())

  const validImages = images.filter((img) => img && img.trim() && img.length > 0)

  if (!validImages || validImages.length === 0) {
    return (
      <div className="w-full aspect-square bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg flex items-center justify-center border border-gray-300">
        <div className="text-center">
          <div className="text-5xl mb-3">📷</div>
          <p className="text-gray-600 text-sm font-medium">No images available</p>
        </div>
      </div>
    )
  }

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? validImages.length - 1 : prev - 1))
  }

  const handleNext = () => {
    setCurrentIndex((prev) => (prev === validImages.length - 1 ? 0 : prev + 1))
  }

  const handleImageError = (index: number) => {
    setImageErrors((prev) => new Set(prev).add(index))
  }

  const currentImage = validImages[currentIndex]
  const hasError = imageErrors.has(currentIndex)

  return (
    <div className="space-y-4">
      {/* Main Image Display */}
      <div className="relative w-full aspect-square bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg overflow-hidden group border border-gray-200">
        {hasError ? (
          <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
            <div className="text-center">
              <div className="text-5xl mb-2">🖼️</div>
              <p className="text-gray-600 text-sm">Image not available</p>
            </div>
          </div>
        ) : (
          <>
            <img
              key={`${currentImage}-${currentIndex}`}
              src={currentImage || "/placeholder.svg"}
              alt={`${productName} - Image ${currentIndex + 1}`}
              className="w-full h-full object-contain bg-white"
              onError={() => handleImageError(currentIndex)}
              loading="lazy"
              style={{ maxHeight: "100%", maxWidth: "100%" }}
            />

            {/* Popup button overlay */}
            <button
              onClick={() => onImageClick?.(currentImage, currentIndex)}
              className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-all duration-200"
            >
              <Eye className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
            </button>
          </>
        )}

        {/* Navigation arrows */}
        {validImages.length > 1 && (
          <>
            <button
              onClick={handlePrev}
              className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-all z-10"
              aria-label="Previous image"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              onClick={handleNext}
              className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-all z-10"
              aria-label="Next image"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </>
        )}

        {/* Image counter */}
        {validImages.length > 1 && (
          <div className="absolute bottom-3 right-3 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
            {currentIndex + 1} / {validImages.length}
          </div>
        )}
      </div>

      {/* Thumbnail strip */}
      {validImages.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {validImages.map((image, index) => (
            <button
              key={index}
              onClick={() => setCurrentIndex(index)}
              className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all ${
                index === currentIndex
                  ? "border-blue-600 ring-2 ring-blue-300"
                  : "border-gray-200 hover:border-gray-300"
              }`}
              aria-label={`View image ${index + 1}`}
            >
              <img
                src={image || "/placeholder.svg"}
                alt={`Thumbnail ${index + 1}`}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.src = "/placeholder.svg"
                }}
                loading="lazy"
              />
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
