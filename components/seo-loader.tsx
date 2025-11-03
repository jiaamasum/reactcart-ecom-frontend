"use client"

import { useEffect } from "react"
import { apiGetPublicSettings } from "@/lib/api"

export function SeoLoader() {
  useEffect(() => {
    const load = async () => {
      const seo = await apiGetPublicSettings()
      if (!seo) return
      if (seo.metaTitle) document.title = seo.metaTitle
      const ensure = (name: string) => {
        let el = document.querySelector(`meta[name="${name}"]`) as HTMLMetaElement | null
        if (!el) { el = document.createElement('meta'); el.setAttribute('name', name); document.head.appendChild(el) }
        return el
      }
      if (seo.metaDescription) ensure('description')!.setAttribute('content', seo.metaDescription)
      if (seo.metaKeywords) ensure('keywords')!.setAttribute('content', seo.metaKeywords)
    }
    load()
  }, [])
  return null
}
