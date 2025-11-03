"use client"

import { useEffect, useState } from "react"
import { X, ChevronLeft, ChevronRight } from "lucide-react"

interface ImageGalleryPopupProps {
  isOpen: boolean
  images: string[]
  startIndex?: number
  onClose: () => void
}

export function ImageGalleryPopup({ isOpen, images, startIndex = 0, onClose }: ImageGalleryPopupProps) {
  const validImages = (images || []).filter(Boolean)
  const [index, setIndex] = useState(Math.min(Math.max(startIndex, 0), Math.max(validImages.length - 1, 0)))

  useEffect(() => {
    setIndex(Math.min(Math.max(startIndex, 0), Math.max(validImages.length - 1, 0)))
  }, [startIndex, images])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!isOpen) return
      if (e.key === "Escape") onClose()
      if (e.key === "ArrowLeft") setIndex((i) => (i - 1 + validImages.length) % validImages.length)
      if (e.key === "ArrowRight") setIndex((i) => (i + 1) % validImages.length)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [isOpen, validImages.length, onClose])

  if (!isOpen || validImages.length === 0) return null

  const prev = () => setIndex((i) => (i - 1 + validImages.length) % validImages.length)
  const next = () => setIndex((i) => (i + 1) % validImages.length)

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50" onClick={onClose}>
      <div className="relative w-full max-w-4xl mx-4" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onClose}
          className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors"
          aria-label="Close"
        >
          <X className="w-8 h-8" />
        </button>
        <div className="relative bg-black rounded-lg overflow-hidden">
          <img
            src={validImages[index] || "/placeholder.svg"}
            alt={`Image ${index + 1}`}
            className="w-full max-h-[80vh] object-contain bg-black"
          />
          {validImages.length > 1 && (
            <>
              <button
                onClick={prev}
                className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/15 hover:bg-white/25 text-white p-2 rounded-full"
                aria-label="Previous image"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button
                onClick={next}
                className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/15 hover:bg-white/25 text-white p-2 rounded-full"
                aria-label="Next image"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
              <div className="absolute bottom-3 right-3 bg-black/70 text-white px-3 py-1 rounded-full text-sm font-medium">
                {index + 1} / {validImages.length}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

