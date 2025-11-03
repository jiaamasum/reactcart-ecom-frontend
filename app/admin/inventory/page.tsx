"use client"

import { useEffect, useMemo, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Edit2, AlertTriangle, PackageOpen } from "lucide-react"
import { Modal } from "@/components/modal-dialog"
import { Input } from "@/components/ui/input"
import { apiAdminSearchProducts, apiAdminUpdateProductStock, type ProductSummary } from "@/lib/api"

export default function AdminInventoryPage() {
  const [products, setProducts] = useState<ProductSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [filter, setFilter] = useState<"all" | "low" | "out">("all")
  const [error, setError] = useState("")
  const [stockModal, setStockModal] = useState<{ id: string; name: string; stock: number } | null>(null)
  const [newStock, setNewStock] = useState<string>("")
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setIsLoading(true)
    setError("")
    try {
      const list = await apiAdminSearchProducts({ limit: 500 })
      setProducts(list)
    } catch (err: any) {
      setProducts([])
      setError(err?.message || 'Failed to load inventory')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const { lowStock, outOfStock } = useMemo(() => {
    const low = products.filter((p) => (p.stock ?? 0) > 0 && (p.stock ?? 0) < 10)
    const out = products.filter((p) => (p.stock ?? 0) === 0)
    return { lowStock: low, outOfStock: out }
  }, [products])

  const visible = useMemo(() => {
    if (filter === "low") return lowStock
    if (filter === "out") return outOfStock
    return [...lowStock, ...outOfStock]
  }, [filter, lowStock, outOfStock])

  const openStockModal = (p: ProductSummary) => {
    setStockModal({ id: p.id, name: p.name, stock: p.stock })
    setNewStock(String(p.stock ?? 0))
  }

  const saveStock = async () => {
    if (!stockModal) return
    const value = Number(newStock)
    if (!Number.isFinite(value) || value < 0) return
    setSaving(true)
    try {
      await apiAdminUpdateProductStock(stockModal.id, value)
      await load()
      setStockModal(null)
    } catch (err: any) {
      alert(err?.message || 'Failed to update stock')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="p-4 md:p-8 w-full">
      <div className="flex items-start md:items-center justify-between gap-4 flex-col md:flex-row mb-8">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="w-6 h-6 text-amber-500" /> Inventory Alerts
          </h1>
          <p className="text-gray-600 mt-1">
            {outOfStock.length} out of stock • {lowStock.length} low stock
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant={filter === "all" ? "default" : "outline"} onClick={() => setFilter("all")}>
            All Alerts
          </Button>
          <Button variant={filter === "low" ? "default" : "outline"} onClick={() => setFilter("low")}>
            Low Stock
          </Button>
          <Button variant={filter === "out" ? "default" : "outline"} onClick={() => setFilter("out")}>
            Out of Stock
          </Button>
        </div>
      </div>

      {isLoading ? (
        <Card className="border-0 shadow-lg"><CardContent className="pt-8 pb-8 text-center text-gray-600">Loading inventory...</CardContent></Card>
      ) : visible.length === 0 ? (
        <Card className="border-0 shadow-lg">
          <CardContent className="pt-8 pb-8 text-center text-gray-600">
            <PackageOpen className="w-8 h-8 mx-auto mb-3 text-gray-400" />
            No products match this filter.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {visible.map((product) => (
            <Card key={product.id} className="border-0 shadow hover:shadow-lg transition-shadow overflow-hidden">
              <CardContent className="p-0">
                <div className="relative w-full h-44 bg-gray-100 overflow-hidden">
                  <img
                    src={product.primaryImageUrl || "/placeholder.svg"}
                    alt={product.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/placeholder.svg" }}
                  />
                  <div
                    className={`absolute top-2 left-2 text-xs px-2 py-1 rounded font-semibold ${
                      (product.stock ?? 0) === 0 ? "bg-red-600 text-white" : "bg-amber-500 text-white"
                    }`}
                  >
                    {(product.stock ?? 0) === 0 ? "Out of Stock" : `Low: ${product.stock}`}
                  </div>
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-gray-900 line-clamp-2">{product.name}</h3>
                    <p className="text-xs text-gray-600 mt-1">{product.categoryName}</p>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-lg font-bold text-blue-600">${((product.discountedPrice ?? product.price) || 0).toFixed(2)}</span>
                    {product.discountedPrice != null && (
                      <span className="text-xs text-gray-500 line-through">${(product.price || 0).toFixed(2)}</span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" className="flex-1" onClick={() => openStockModal(product)}>
                      <Edit2 className="w-4 h-4 mr-1" /> Update Stock
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Modal
        isOpen={!!stockModal}
        title={stockModal ? `Update Stock • ${stockModal.name}` : 'Update Stock'}
        onClose={() => setStockModal(null)}
        onConfirm={saveStock}
        confirmText="Save"
        confirmLoading={saving}
        confirmDisabled={!newStock || Number(newStock) < 0}
      >
        <div className="space-y-3">
          <label className="text-sm font-medium text-gray-700">New Stock</label>
          <Input type="number" min={0} value={newStock} onChange={(e) => setNewStock(e.target.value)} />
        </div>
      </Modal>
    </div>
  )
}

