"use client"

import { useEffect, useMemo, useState } from "react"
import { apiAdminCreateCategory, apiAdminDeleteCategory, apiAdminListCategories, apiAdminUpdateCategory } from "@/lib/api"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Edit2, Trash2, Plus } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function AdminCategoriesPage() {
  const { toast } = useToast()
  const [categories, setCategories] = useState<{id:string; name:string; slug?: string; productsCount?:number}[]>([])
  const [newCat, setNewCat] = useState("")
  const [newSlug, setNewSlug] = useState("")
  const [editing, setEditing] = useState<string | null>(null)
  const [editValue, setEditValue] = useState("")
  const [editSlug, setEditSlug] = useState("")
  const counts = useMemo(() => {
    const m = new Map<string, number>()
    for (const c of categories) m.set(c.name, c.productsCount || 0)
    return m
  }, [categories])

  useEffect(() => {
    const load = async () => {
      try {
        const list = await apiAdminListCategories()
        setCategories(list.map((c) => ({ id: c.id, name: c.name, slug: c.slug, productsCount: c.productsCount })))
      } catch (err: any) {
        toast({ title: 'Failed to load categories', description: err?.message || 'Unexpected error', variant: 'destructive' })
      }
    }
    load()
  }, [toast])

  const handleAdd = async () => {
    try {
      const created = await apiAdminCreateCategory(newCat)
      setCategories((prev) => [...prev, { id: created.id, name: created.name, slug: created.slug, productsCount: 0 }])
      setNewCat("")
      setNewSlug("")
      toast({ title: 'Category created' })
    } catch (err: any) {
      toast({ title: 'Create failed', description: err?.message || 'Unexpected error', variant: 'destructive' })
    }
  }

  const handleDelete = async (name: string) => {
    const item = categories.find((c) => c.name === name)
    if (!item) return
    try {
      await apiAdminDeleteCategory(item.id)
      setCategories((prev) => prev.filter((c) => c.id !== item.id))
      toast({ title: 'Category deleted' })
    } catch (err: any) {
      toast({ title: 'Delete failed', description: err?.message || 'Unexpected error', variant: 'destructive' })
    }
  }

  const handleStartEdit = (name: string) => {
    setEditing(name)
    setEditValue(name)
    const item = categories.find((c) => c.name === name)
    setEditSlug(item?.slug || "")
  }

  const handleSaveEdit = async () => {
    if (!editing) return
    const item = categories.find((c) => c.name === editing)
    if (!item) return
    try {
      const updated = await apiAdminUpdateCategory(item.id, { name: editValue, slug: editSlug || undefined })
      setCategories((prev) => prev.map((c) => (c.id === item.id ? { ...c, name: updated.name, slug: updated.slug } : c)))
      setEditing(null)
      setEditValue("")
      setEditSlug("")
      toast({ title: 'Category updated' })
    } catch (err: any) {
      toast({ title: 'Update failed', description: err?.message || 'Unexpected error', variant: 'destructive' })
    }
  }

  return (
    <div className="p-4 md:p-8 w-full">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Manage Categories</h1>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-2">
          <Input placeholder="Category name" value={newCat} onChange={(e) => setNewCat(e.target.value)} />
          <Input placeholder="Slug (optional)" value={newSlug} onChange={(e) => setNewSlug(e.target.value)} />
          <Button onClick={handleAdd} disabled={!newCat.trim()} className="flex gap-2"><Plus className="w-4 h-4"/>Create</Button>
        </div>
      </div>

      <Card className="border-0 shadow-lg">
        <CardContent className="pt-6">
          {categories.length === 0 ? (
            <p className="text-gray-600">No categories yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((c) => (
                <div key={c.id} className="border rounded-lg p-4 bg-white space-y-2">
                  {editing === c.name ? (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <Input value={editValue} onChange={(e) => setEditValue(e.target.value)} placeholder="Name" />
                      <Input value={editSlug} onChange={(e) => setEditSlug(e.target.value)} placeholder="Slug" />
                      <div className="flex gap-2">
                        <Button size="sm" onClick={handleSaveEdit} className="flex-1">Save</Button>
                        <Button size="sm" variant="outline" className="flex-1 bg-transparent" onClick={()=>{setEditing(null);setEditValue("");setEditSlug("")}}>Cancel</Button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{c.name}</p>
                        <p className="text-xs text-gray-500">Slug: {c.slug}</p>
                        <p className="text-xs text-gray-500">{counts.get(c.name) || 0} products</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="bg-transparent" onClick={() => handleStartEdit(c.name)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => handleDelete(c.name)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
