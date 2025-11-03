import type React from "react"
import type { Metadata } from "next"
import { Geist, Geist_Mono } from "next/font/google"
import { Analytics } from "@vercel/analytics/next"
import "./globals.css"
import { AuthProvider } from "@/lib/auth-context"
import { CartProvider } from "@/lib/cart-context"
import { CurrencyProvider } from "@/lib/currency-context"
import Navbar from "@/components/navbar"
import { Toaster } from "@/components/ui/toaster"
import { SeoLoader } from "@/components/seo-loader"
import { apiGetPublicSettings } from "@/lib/api"

const _geist = Geist({ subsets: ["latin"] })
const _geistMono = Geist_Mono({ subsets: ["latin"] })

export async function generateMetadata(): Promise<Metadata> {
  const s = await apiGetPublicSettings()
  const title = s?.metaTitle || s?.storeName || "ShopHub - Premium E-commerce Platform"
  const description = s?.metaDescription || s?.storeDescription || "Shop premium products with secure checkout and fast shipping"
  const keywords = s?.metaKeywords || undefined
  return {
    title,
    description,
    keywords,
    generator: "v0.app",
    openGraph: {
      title,
      description,
      images: s?.ogImageUrl ? [{ url: s.ogImageUrl }] : undefined,
    },
  }
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning className={`font-sans antialiased`}>
        <AuthProvider>
          <CartProvider>
            <CurrencyProvider>
              <Navbar />
              <SeoLoader />
              {children}
              <Toaster />
            </CurrencyProvider>
          </CartProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  )
}
