"use client"

import type React from "react"

import { useEffect, useMemo, useState } from "react"
import { apiAdminListUsers, apiAdminCreateCustomer, apiAdminPatchUser, apiAdminBanUser, apiAdminUnbanUser, apiAdminPromoteUser, apiAdminGetUser, type AdminUser } from "@/lib/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Users, Mail, Calendar, Plus, Edit2, Ban, CheckCircle, Shield, UserCheck, UserCog, Search, Upload } from "lucide-react"
import { Modal } from "@/components/modal-dialog"
import { useToast } from "@/hooks/use-toast"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

export default function AdminCustomersPage() {
  const { toast } = useToast()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [loadError, setLoadError] = useState("")
  const [editingId, setEditingId] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const [banConfirm, setBanConfirm] = useState<{ id: string; action: "ban" | "unban" } | null>(null)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    password: "",
    phone: "",
    address: "",
    profileImageUrl: "",
    banned: false,
  })
  const [search, setSearch] = useState("")
  const [roleFilter, setRoleFilter] = useState<"all" | "customer" | "admin" | "banned">("all")
  const [roleConfirm, setRoleConfirm] = useState<{ id: string; target: 'ADMIN' | 'CUSTOMER' } | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")

  useEffect(() => {
    const normRole = (r: any) => (r === 'ADMIN' || r === 'admin') ? 'ADMIN' : 'CUSTOMER'
    const normalize = (u: any) => ({
      ...u,
      role: normRole(u.role),
      createdAt: u.createdAt || u.created_at || undefined,
      banned: (u.banned ?? u.isBanned ?? false) as boolean,
    })
    const load = async () => {
      try {
        const base = await apiAdminListUsers()
        const details = await Promise.all(base.map((u) => apiAdminGetUser(u.id).catch(() => null)))
        const merged = base.map((u, i) => normalize({ ...u, ...(details[i] as any) }))
        setUsers(merged)
      } catch (err: any) {
        setUsers([])
        const msg = err?.message || 'Unexpected error'
        setLoadError(msg)
        try { toast({ title: 'Failed to load users', description: msg, variant: 'destructive' }) } catch {}
      } finally {
        setIsLoading(false)
      }
    }
    load()
  }, [])

  const displayUsers = useMemo(() => {
    const roleMatch = (u: any) => {
      if (roleFilter === 'all') return true
      if (roleFilter === 'admin') return (u.role === 'ADMIN' || u.role === 'admin')
      if (roleFilter === 'customer') return (u.role === 'CUSTOMER' || u.role === 'customer')
      if (roleFilter === 'banned') return !!(u.banned)
      return true
    }
    const s = search.trim().toLowerCase()
    return users.filter((u: any) => roleMatch(u) && (
      !s || u.name?.toLowerCase().includes(s) || u.email?.toLowerCase().includes(s) ||
      u.phone?.toLowerCase?.().includes(s) || u.address?.toLowerCase?.().includes(s)
    ))
  }, [users, roleFilter, search])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const saveUser = async () => {
    if (isSaving) return
    setIsSaving(true)
    try {
      if (editingId) {
        await apiAdminPatchUser(editingId, {
          name: formData.name,
          phone: formData.phone,
          address: formData.address,
          profileImageUrl: formData.profileImageUrl,
          banned: formData.banned,
        })
      } else {
        await apiAdminCreateCustomer({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          phone: formData.phone || undefined,
          address: formData.address || undefined,
          profileImageUrl: formData.profileImageUrl || undefined,
          banned: formData.banned || false,
        })
      }
      try {
        const refreshed = await apiAdminListUsers()
        setUsers(refreshed.map((u: any) => ({ ...u, createdAt: u.createdAt || u.created_at, banned: u.banned ?? u.isBanned ?? false })))
      } catch (err: any) {
        try { toast({ title: 'Reload failed', description: err?.message || 'Unexpected error', variant: 'destructive' }) } catch {}
      }
      setFormData({ name: "", email: "", password: "", phone: "", address: "", profileImageUrl: "", banned: false })
      setShowForm(false)
      setEditingId(null)
    } catch (err: any) {
      try { toast({ title: editingId ? 'Update failed' : 'Create failed', description: err?.message || 'Unexpected error', variant: 'destructive' }) } catch {}
    } finally {
      setIsSaving(false)
    }
  }

  const handleEdit = (id: string) => {
    const user = users.find((u) => u.id === id)
    if (user) {
      setFormData({
        name: user.name,
        email: user.email,
        password: "",
        phone: (user as any).phone || "",
        address: (user as any).address || "",
        profileImageUrl: (user as any).profileImageUrl || "",
        banned: (user as any).banned ?? (user as any).isBanned ?? false,
      })
      setEditingId(id)
      setShowForm(true)
    }
  }

  const handleBanCustomer = async (id: string, action: "ban" | "unban") => {
    try {
      if (action === "ban") await apiAdminBanUser(id)
      else await apiAdminUnbanUser(id)
      const refreshed = await apiAdminListUsers()
      const details = await Promise.all(refreshed.map((u) => apiAdminGetUser(u.id).catch(() => null)))
      setUsers(refreshed.map((u, i) => ({
        ...u,
        role: ((details[i] as any)?.role === 'ADMIN' || (details[i] as any)?.role === 'admin') ? 'ADMIN' : 'CUSTOMER',
        createdAt: (details[i] as any)?.createdAt || (details[i] as any)?.created_at,
        banned: (details[i] as any)?.banned ?? (details[i] as any)?.isBanned ?? (u as any).banned ?? (u as any).isBanned ?? false,
      }) as any))
      try { toast({ title: action === 'ban' ? 'User banned' : 'User unbanned' }) } catch {}
    } catch (err: any) {
      try { toast({ title: action === 'ban' ? 'Ban failed' : 'Unban failed', description: err?.message || 'Unexpected error', variant: 'destructive' }) } catch {}
    }
    setBanConfirm(null)
  }

  const handleToggleRole = (id: string, current: AdminUser['role']) => {
    const target = current === 'ADMIN' ? 'CUSTOMER' : 'ADMIN'
    setRoleConfirm({ id, target })
  }

  const confirmRoleChange = async () => {
    if (!roleConfirm) return
    try {
      if (roleConfirm.target === 'ADMIN') await apiAdminPromoteUser(roleConfirm.id)
      else await apiAdminPatchUser(roleConfirm.id, { role: 'CUSTOMER' })
      const refreshed = await apiAdminListUsers()
      const details = await Promise.all(refreshed.map((u) => apiAdminGetUser(u.id).catch(() => null)))
      setUsers(refreshed.map((u, i) => ({
        ...u,
        role: ((details[i] as any)?.role === 'ADMIN' || (details[i] as any)?.role === 'admin') ? 'ADMIN' : 'CUSTOMER',
        createdAt: (details[i] as any)?.createdAt || (details[i] as any)?.created_at,
        banned: (details[i] as any)?.banned ?? (details[i] as any)?.isBanned ?? (u as any).banned ?? (u as any).isBanned ?? false,
      }) as any))
      try { toast({ title: roleConfirm.target === 'ADMIN' ? 'Promoted to Admin' : 'Demoted to Customer' }) } catch {}
    } catch (err: any) {
      try { toast({ title: 'Role change failed', description: err?.message || 'Unexpected error', variant: 'destructive' }) } catch {}
    }
    setRoleConfirm(null)
  }

  return (
    <div className="p-4 md:p-8">
      <div className="flex justify-between items-center mb-8 flex-col md:flex-row gap-4">
        <div className="w-full md:w-auto">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">User Management</h1>
          <div className="mt-3 flex gap-2 items-center">
            <div className="relative w-full md:w-80">
              <Input placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            </div>
            <div className="flex gap-2">
              <Button variant={roleFilter === 'all' ? 'default' : 'outline'} onClick={() => setRoleFilter('all')}>All</Button>
              <Button variant={roleFilter === 'customer' ? 'default' : 'outline'} onClick={() => setRoleFilter('customer')}>Customers</Button>
              <Button variant={roleFilter === 'admin' ? 'default' : 'outline'} onClick={() => setRoleFilter('admin')}>Admins</Button>
              <Button variant={roleFilter === 'banned' ? 'default' : 'outline'} onClick={() => setRoleFilter('banned')}>Banned</Button>
            </div>
          </div>
        </div>
        <Button
          onClick={() => {
            setShowForm(true)
            setEditingId(null)
            setUploadError("")
            setUploading(false)
            setFormData({ name: "", email: "", password: "", phone: "", address: "", profileImageUrl: "", banned: false })
          }}
          className="bg-blue-600 hover:bg-blue-700"
          size="lg"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add User
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <Card className="border-0 shadow-lg cursor-pointer" onClick={() => setRoleFilter('all')} title="Show all users">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{users.length}</p>
              </div>
              <Users className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg cursor-pointer" onClick={() => setRoleFilter('admin')} title="Show admins">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Admins</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{users.filter(u => u.role === 'ADMIN' || (u as any).role === 'admin').length}</p>
              </div>
              <Shield className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        <Card className="border-0 shadow-lg cursor-pointer" onClick={() => setRoleFilter('customer')} title="Show customers">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Customers</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{users.filter(u => u.role === 'CUSTOMER' || (u as any).role === 'customer').length}</p>
              </div>
              <UserCheck className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-0 shadow-lg cursor-pointer" onClick={() => setRoleFilter('banned')} title="Show banned">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Banned</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{users.filter((u: any) => (u.banned ?? u.isBanned ?? false)).length}</p>
              </div>
              <Ban className="w-8 h-8 text-red-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit/Create User Modal */}
      <Modal
        isOpen={showForm}
        title={editingId ? 'Edit User' : 'Add New User'}
        onClose={() => { setShowForm(false); setEditingId(null) }}
        onConfirm={saveUser}
        confirmText={editingId ? 'Update User' : 'Create User'}
        confirmLoading={isSaving}
        confirmDisabled={!formData.name || (!editingId && (!formData.email || !formData.password))}
      >
        <div className="pt-1">
          <form onSubmit={(e) => { e.preventDefault(); saveUser() }} className="space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Name</label>
                <Input name="name" value={formData.name} onChange={handleInputChange} required />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Email</label>
                <Input name="email" type="email" value={formData.email} onChange={handleInputChange} required disabled={!!editingId} />
              </div>
              {!editingId && (
                <div>
                  <label className="text-sm font-medium text-gray-700">Password</label>
                  <Input
                    name="password"
                    type="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                  />
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Phone</label>
                  <Input name="phone" value={formData.phone} onChange={handleInputChange} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Profile Image</label>
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-100">
                        {formData.profileImageUrl ? (
                          <img src={formData.profileImageUrl || "/placeholder.svg"} alt="Profile" className="w-full h-full object-cover" />
                        ) : null}
                      </div>
                      <label className="cursor-pointer">
                        <div className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition disabled:opacity-60">
                          <Upload className="w-4 h-4" />
                          {uploading ? 'Uploading...' : 'Upload Photo'}
                        </div>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={async (e) => {
                            const file = e.target.files?.[0]
                            if (!file) return
                            setUploadError("")
                            setUploading(true)
                            try {
                              const fd = new FormData()
                              fd.append('file', file)
                              const res = await fetch('/api/upload', { method: 'POST', body: fd })
                              const json = await res.json()
                              if (!res.ok || json?.error) throw new Error(json?.error?.message || `Upload failed (${res.status})`)
                              const url = json?.data?.url as string
                              setFormData((prev) => ({ ...prev, profileImageUrl: url }))
                            } catch (err: any) {
                              setUploadError(err?.message || 'Upload failed')
                            } finally {
                              setUploading(false)
                              ;(e.target as HTMLInputElement).value = ''
                            }
                          }}
                        />
                      </label>
                    </div>
                    {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
                    <Input placeholder="Or paste image URL" name="profileImageUrl" value={formData.profileImageUrl} onChange={handleInputChange} />
                  </div>
                </div>
                <div className="md:col-span-2">
                  <label className="text-sm font-medium text-gray-700">Address</label>
                  <Input name="address" value={formData.address} onChange={handleInputChange} />
                </div>
              </div>
              {editingId && (
                <div className="flex items-center gap-3">
                  <label className="text-sm font-medium text-gray-700">Banned</label>
                  <input
                    type="checkbox"
                    checked={formData.banned}
                    onChange={(e) => setFormData((prev) => ({ ...prev, banned: e.target.checked }))}
                  />
                </div>
              )}
            </form>
        </div>
      </Modal>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} className="border-0 shadow">
              <CardContent className="pt-6">
                <div className="animate-pulse h-5 bg-gray-200 rounded w-1/3 mb-4" />
                <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                  {Array.from({ length: 5 }).map((__, j) => (
                    <div key={j} className="h-10 bg-gray-100 rounded" />
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
      <div className="space-y-3">
        {displayUsers.map((customer) => {
          const isBanned = (customer as any).banned ?? (customer as any).isBanned ?? false
          return (
            <Card
              key={customer.id}
              className={`border-0 shadow hover:shadow-lg transition-shadow ${isBanned ? "opacity-60" : ""}`}
            >
              <CardContent className="pt-6">
                <div className="flex justify-between items-start flex-col md:flex-row gap-4">
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4 w-full">
                    <div>
                      <p className="text-sm text-gray-600">Name</p>
                      <div className="flex items-center gap-2">
                        <Avatar className="size-8">
                          <AvatarImage src={(customer as any).profileImageUrl || undefined} alt={customer.name} />
                          <AvatarFallback>{(customer.name || 'U').slice(0,2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <p className="font-semibold text-gray-900">{customer.name}</p>
                      </div>
                      {isBanned && <span className="text-xs text-red-600 font-semibold">BANNED</span>}
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Mail className="w-4 h-4" /> Email
                      </p>
                      <p className="font-semibold text-gray-900 text-sm">{customer.email}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600 flex items-center gap-1">
                        <Calendar className="w-4 h-4" /> Member Since
                      </p>
                      <p className="font-semibold text-gray-900 text-sm">
                        {(() => { const c:any=customer as any; const d=c.createdAt || c.created_at; return d ? new Date(d).toLocaleDateString() : '-' })()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Role</p>
                      <p className="font-semibold text-gray-900">{(customer.role === 'ADMIN' || (customer as any).role === 'admin') ? 'Admin' : 'Customer'}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 flex-wrap md:flex-col">
                    <Button variant="outline" size="sm" onClick={() => handleEdit(customer.id)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant={isBanned ? "default" : "outline"}
                      size="sm"
                      onClick={() => setBanConfirm({ id: customer.id, action: isBanned ? "unban" : "ban" })}
                      className={isBanned ? "bg-green-600 hover:bg-green-700" : ""}
                    >
                      {isBanned ? <CheckCircle className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleToggleRole(customer.id, customer.role)}
                      title={(customer.role === 'ADMIN') ? 'Demote to Customer' : 'Promote to Admin'}
                    >
                      <UserCog className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
      )}

      <Modal
        isOpen={!!banConfirm}
        title={banConfirm?.action === "ban" ? "Ban Customer" : "Unban Customer"}
        onClose={() => setBanConfirm(null)}
        onConfirm={() => banConfirm && handleBanCustomer(banConfirm.id, banConfirm.action)}
        confirmText={banConfirm?.action === "ban" ? "Ban" : "Unban"}
        cancelText="Cancel"
        isDangerous={banConfirm?.action === "ban"}
      >
        <p className="text-gray-700">
          Are you sure you want to {banConfirm?.action === "ban" ? "ban" : "unban"} this customer?
        </p>
      </Modal>

      <Modal
        isOpen={!!roleConfirm}
        title={roleConfirm?.target === 'ADMIN' ? 'Promote to Admin' : 'Demote to Customer'}
        onClose={() => setRoleConfirm(null)}
        onConfirm={confirmRoleChange}
        confirmText={roleConfirm?.target === 'ADMIN' ? 'Promote' : 'Demote'}
        cancelText="Cancel"
        isDangerous={roleConfirm?.target === 'ADMIN' ? false : true}
      >
        <p className="text-gray-700">
          Are you sure you want to {roleConfirm?.target === 'ADMIN' ? 'promote this user to Admin' : 'demote this admin to Customer'}?
        </p>
      </Modal>
    </div>
  )
}
