"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Settings, Store, DollarSign } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import {
  apiGetAdminStoreSettings,
  apiUpdateAdminStoreSettings,
  apiGetAdminSeoSettings,
  apiUpdateAdminSeoSettings,
  apiGetAdminCurrencySettings,
  apiUpdateAdminCurrencySettings,
} from "@/lib/api"

export default function AdminSettingsPage() {
  const { toast } = useToast()
  const [storeSettings, setStoreSettings] = useState({
    storeName: "",
    storeDescription: "",
    storeEmail: "",
    storePhone: "",
    storeAddress: "",
  })

  const [seoSettings, setSeoSettings] = useState({
    metaTitle: "",
    metaDescription: "",
    metaKeywords: "",
    ogImage: "",
  })

  const [currencySettings, setCurrencySettings] = useState({ code: "USD", symbol: "$", rate: 1 })
  const [successMessage, setSuccessMessage] = useState("")
  const [loading, setLoading] = useState(true)

  const currencyOptions = [
    { code: "USD", symbol: "$", rate: 1 },
    { code: "EUR", symbol: "€", rate: 0.92 },
    { code: "GBP", symbol: "£", rate: 0.79 },
    { code: "JPY", symbol: "¥", rate: 149.5 },
    { code: "AUD", symbol: "A$", rate: 1.53 },
    { code: "CAD", symbol: "C$", rate: 1.36 },
    { code: "INR", symbol: "₹", rate: 83.12 },
    { code: "BDT", symbol: "৳", rate: 109.5 },
  ]

  const handleStoreChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setStoreSettings((prev) => ({ ...prev, [name]: value }))
  }

  const handleSeoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setSeoSettings((prev) => ({ ...prev, [name]: value }))
  }

  // Load existing settings from API on mount
  useEffect(() => {
    const load = async () => {
      try {
        const [store, seo, currency] = await Promise.all([
          apiGetAdminStoreSettings(),
          apiGetAdminSeoSettings(),
          apiGetAdminCurrencySettings(),
        ])
        setStoreSettings({
          storeName: store.storeName || "",
          storeDescription: store.storeDescription || "",
          storeEmail: store.storeEmail || "",
          storePhone: store.storePhone || "",
          storeAddress: store.storeAddress || "",
        })
        setSeoSettings({
          metaTitle: seo.metaTitle || "",
          metaDescription: seo.metaDescription || "",
          metaKeywords: seo.metaKeywords || "",
          ogImage: seo.ogImageUrl || "",
        })
        const found = currencyOptions.find((c) => c.code === currency.defaultCurrency)
        if (found) setCurrencySettings(found)
      } catch (err: any) {
        toast({ title: 'Failed to load settings', description: err?.message || 'Unexpected error', variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleSaveStore = async () => {
    try {
      await apiUpdateAdminStoreSettings({
        storeName: storeSettings.storeName,
        storeDescription: storeSettings.storeDescription,
        storeEmail: storeSettings.storeEmail,
        storePhone: storeSettings.storePhone,
        storeAddress: storeSettings.storeAddress,
      })
      setSuccessMessage("Store settings updated")
      toast({ title: 'Success', description: 'Store settings updated' })
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (err: any) {
      toast({ title: 'Update failed', description: err?.message || 'Unexpected error', variant: 'destructive' })
    }
  }

  const handleSaveSeo = async () => {
    try {
      await apiUpdateAdminSeoSettings({
        metaTitle: seoSettings.metaTitle,
        metaDescription: seoSettings.metaDescription,
        metaKeywords: seoSettings.metaKeywords,
        ogImageUrl: seoSettings.ogImage || undefined,
      })
      setSuccessMessage("SEO settings updated")
      toast({ title: 'Success', description: 'SEO settings updated' })
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (err: any) {
      toast({ title: 'Update failed', description: err?.message || 'Unexpected error', variant: 'destructive' })
    }
  }

  const handleSaveCurrency = async () => {
    try {
      await apiUpdateAdminCurrencySettings({ defaultCurrency: currencySettings.code })
      setSuccessMessage("Currency settings updated")
      toast({ title: 'Success', description: `Default currency set to ${currencySettings.code}` })
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (err: any) {
      toast({ title: 'Update failed', description: err?.message || 'Unexpected error', variant: 'destructive' })
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
          <Settings className="w-8 h-8" />
          Store Settings
        </h1>
        <p className="text-gray-600 mt-1">Configure your store information and SEO settings</p>
      </div>

      {!loading && successMessage && <div className="p-4 bg-green-100 text-green-800 rounded-lg mb-6">{successMessage}</div>}

      {/* Store Information Section */}
      <Card className="border-0 shadow-lg mb-6">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="text-lg flex items-center gap-2">
            <Store className="w-5 h-5" />
            Store Information
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Store Name</label>
              <Input
                name="storeName"
                value={storeSettings.storeName}
                onChange={handleStoreChange}
                placeholder="Enter store name"
              />
              <p className="text-xs text-gray-500 mt-1">This will appear in your website header and emails</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Store Description</label>
              <textarea
                name="storeDescription"
                value={storeSettings.storeDescription}
                onChange={handleStoreChange}
                placeholder="Enter store description"
                className="w-full border rounded p-2 text-sm"
                rows={3}
              />
              <p className="text-xs text-gray-500 mt-1">Brief description of your store</p>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Store Email</label>
              <Input
                name="storeEmail"
                type="email"
                value={storeSettings.storeEmail}
                onChange={handleStoreChange}
                placeholder="support@shophub.com"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Store Phone</label>
              <Input
                name="storePhone"
                value={storeSettings.storePhone}
                onChange={handleStoreChange}
                placeholder="+1 (555) 123-4567"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Store Address</label>
              <Input
                name="storeAddress"
                value={storeSettings.storeAddress}
                onChange={handleStoreChange}
                placeholder="123 Main Street, City, State 12345"
              />
            </div>

            <Button onClick={handleSaveStore} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700">
              Save Store Information
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* SEO Settings */}
      <Card className="border-0 shadow-lg mb-6">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="text-lg">SEO Settings</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Meta Title</label>
              <Input
                name="metaTitle"
                value={seoSettings.metaTitle}
                onChange={handleSeoChange}
                placeholder="ShopHub - Premium E-commerce Platform"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Meta Description</label>
              <textarea
                name="metaDescription"
                value={seoSettings.metaDescription}
                onChange={handleSeoChange}
                placeholder="Shop premium products with secure checkout and fast shipping"
                className="w-full border rounded p-2 text-sm"
                rows={3}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Meta Keywords</label>
              <textarea
                name="metaKeywords"
                value={seoSettings.metaKeywords}
                onChange={handleSeoChange}
                placeholder="Comma-separated keywords (e.g., ecommerce, shopping, products)"
                className="w-full border rounded p-2 text-sm"
                rows={2}
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Open Graph Image URL</label>
              <Input
                name="ogImage"
                value={seoSettings.ogImage}
                onChange={handleSeoChange}
                placeholder="https://example.com/og-image.jpg"
              />
            </div>

            <Button onClick={handleSaveSeo} className="w-full md:w-auto bg-blue-600 hover:bg-blue-700">
              Save SEO Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Currency Settings */}
      <Card className="border-0 shadow-lg mb-6">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5" />
            Currency Settings
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700 block mb-3">Select Currency</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
                {currencyOptions.map((option) => (
                  <button
                    key={option.code}
                    onClick={() => setCurrencySettings(option)}
                    className={`p-3 rounded-lg border-2 transition-all text-center ${
                      currencySettings.code === option.code
                        ? "border-blue-600 bg-blue-50"
                        : "border-gray-200 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-semibold text-lg">{option.symbol}</div>
                    <div className="text-xs text-gray-600">{option.code}</div>
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <p className="text-sm text-gray-700">
                <span className="font-semibold">Selected Currency:</span> {currencySettings.code} (
                {currencySettings.symbol})
              </p>
              <p className="text-xs text-gray-600 mt-1">
                Exchange Rate: 1 USD = {currencySettings.rate} {currencySettings.code}
              </p>
            </div>

            <Button onClick={handleSaveCurrency} className="w-full md:w-auto bg-green-600 hover:bg-green-700">
              Save Currency Settings
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Additional Settings placeholder */}
      <Card className="border-0 shadow-lg">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="text-lg">Additional Settings</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <p className="text-sm text-gray-600">More settings can be configured here.</p>
        </CardContent>
      </Card>
    </div>
  )
}

