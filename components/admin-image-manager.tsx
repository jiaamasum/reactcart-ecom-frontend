"use client"

import { useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Upload, X, Star } from "lucide-react"

interface AdminImageManagerProps {
  initialImages?: string[]
  initialPrimaryIndex?: number
  onChange?: (images: string[], primaryIndex: number) => void
}

export function AdminImageManager({ initialImages = [], initialPrimaryIndex = 0, onChange }: AdminImageManagerProps) {
  const [images, setImages] = useState<string[]>(initialImages)
  const [primaryIndex, setPrimaryIndex] = useState<number>(Math.min(initialPrimaryIndex, Math.max(0, initialImages.length - 1)))
  const [url, setUrl] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  // Keep internal state in sync when parent updates initialImages or initialPrimaryIndex
  useEffect(() => {
    setImages(initialImages)
    const nextPrimary = Math.min(initialPrimaryIndex, Math.max(0, initialImages.length - 1))
    setPrimaryIndex(nextPrimary)
    if (initialImages.length > 0) onChange?.(initialImages, nextPrimary)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialImages, initialPrimaryIndex])

  const emit = (imgs: string[], pIndex: number) => {
    onChange?.(imgs, Math.max(0, Math.min(pIndex, imgs.length - 1)))
  }

  const uploadFile = async (file: File): Promise<string> => {
    const fd = new FormData()
    fd.append('file', file)
    const res = await fetch('/api/upload', { method: 'POST', body: fd })
    const json = await res.json()
    if (!res.ok || json?.error) throw new Error(json?.error?.message || `Upload failed (${res.status})`)
    return json?.data?.url as string
  }

  const readFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return
    try {
      const urls = await Promise.all(Array.from(files).map((f) => uploadFile(f).catch(() => "")))
      const next = [...images, ...urls.filter(Boolean)]
      setImages(next)
      emit(next, next.length === 0 ? 0 : primaryIndex)
    } catch {
      // ignore; individual failures handled above
    }
  }

  const onDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    readFiles(e.dataTransfer.files)
  }

  const addUrl = () => {
    const trimmed = url.trim()
    if (!trimmed) return
    const next = [...images, trimmed]
    setImages(next)
    setUrl("")
    emit(next, primaryIndex)
  }

  const removeAt = (index: number) => {
    const next = images.filter((_, i) => i !== index)
    let nextPrimary = primaryIndex
    if (index === primaryIndex) nextPrimary = 0
    else if (index < primaryIndex) nextPrimary = Math.max(0, primaryIndex - 1)
    setImages(next)
    setPrimaryIndex(nextPrimary)
    emit(next, nextPrimary)
  }

  const setPrimary = (index: number) => {
    setPrimaryIndex(index)
    emit(images, index)
  }

  return (
    <div className="space-y-4">
      {/* Drop area + button */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDrop}
        className="border-2 border-dashed rounded-lg p-6 text-center bg-gray-50 hover:bg-gray-100 transition"
      >
        <input ref={inputRef} type="file" multiple accept="image/*" className="hidden" onChange={(e) => readFiles(e.target.files)} />
        <Upload className="w-6 h-6 mx-auto mb-2 text-gray-500" />
        <p className="text-sm text-gray-600 mb-3">Drag and drop images here, or</p>
        <Button type="button" variant="outline" className="bg-transparent" onClick={() => inputRef.current?.click()}>
          Choose Images
        </Button>
      </div>

      {/* URL add */}
      <div className="flex gap-2">
        <Input placeholder="Paste image URL" value={url} onChange={(e) => setUrl(e.target.value)} className="flex-1" />
        <Button type="button" variant="outline" className="bg-transparent" onClick={addUrl}>
          Add URL
        </Button>
      </div>

      {/* Thumbnails */}
      {images.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {images.map((img, idx) => (
            <div key={idx} className={`relative rounded-lg overflow-hidden border ${idx === primaryIndex ? "border-blue-500" : "border-gray-200"}`}>
              <img src={img || "/placeholder.svg"} alt={`Image ${idx + 1}`} className="w-full h-28 object-cover" />
              <div className="absolute top-1 left-1 flex gap-1">
                <button
                  type="button"
                  onClick={() => setPrimary(idx)}
                  className={`text-xs px-2 py-1 rounded flex items-center gap-1 ${idx === primaryIndex ? "bg-blue-600 text-white" : "bg-white/80 text-gray-800"}`}
                >
                  <Star className={`w-3 h-3 ${idx === primaryIndex ? "fill-current" : ""}`} />
                  {idx === primaryIndex ? "Primary" : "Make Primary"}
                </button>
              </div>
              <button
                type="button"
                onClick={() => removeAt(idx)}
                className="absolute top-1 right-1 bg-white/80 text-gray-800 p-1 rounded"
                aria-label="Remove image"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
