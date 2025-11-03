"use client"

import { X } from "lucide-react"

interface ImagePopupProps {
  isOpen: boolean
  imageUrl: string
  onClose: () => void
}

export function ImagePopup({ isOpen, imageUrl, onClose }: ImagePopupProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50" onClick={onClose}>
      <div className="relative max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors">
          <X className="w-8 h-8" />
        </button>
        <img src={imageUrl || "/placeholder.svg"} alt="Product" className="w-full h-auto rounded-lg" />
      </div>
    </div>
  )
}
