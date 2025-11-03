"use client"

import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useCurrency } from "@/lib/currency-context"
import { useEffect, useState } from "react"
import { apiPatchMe, apiGetMyOrderStats, type MyOrderStats } from "@/lib/api"
import { Footer } from "@/components/footer"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { Modal } from "@/components/modal-dialog"
import { useToast } from "@/hooks/use-toast"
import { Edit2 } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"

export default function ProfilePage() {
  const { user, isLoading, refresh } = useAuth()
  const router = useRouter()
  const { toast } = useToast()
  const { formatPrice } = useCurrency()
  const [orderStats, setOrderStats] = useState<MyOrderStats>({ totalOrders: 0, completedOrders: 0, totalSpent: 0 })
  // Order history UI removed; keep simple stats if needed
  const [isEditingProfile, setIsEditingProfile] = useState(false)
  const [editFormData, setEditFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || "",
    profileImageUrl: user?.profileImage || "",
  })
  const [editErrors, setEditErrors] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")

  useEffect(() => {
    if (!isLoading && !user) {
      router.push("/login")
    }
  }, [user, isLoading, router])

  useEffect(() => {
    if (user) {
      setEditFormData({
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        address: user.address || "",
        profileImageUrl: user.profileImage || "",
      })
    }
  }, [user])

  useEffect(() => {
    ;(async () => {
      if (!user) return
      try { const s = await apiGetMyOrderStats(); setOrderStats(s) } catch { setOrderStats({ totalOrders: 0, completedOrders: 0, totalSpent: 0 }) }
    })()
  }, [user])

  const formatDate = (iso?: string) => {
    if (!iso) return "—"
    const d = new Date(iso)
    return isNaN(d.getTime()) ? "—" : d.toLocaleDateString()
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) return null

  // Order cancel flow removed from profile page

  const handleUpdateProfile = async () => {
    if (!editFormData.name.trim()) {
      toast({
        title: "Error",
        description: "Name cannot be empty",
        variant: "destructive",
      })
      return
    }

    setEditErrors({})
    try {
      await apiPatchMe({
        name: editFormData.name,
        phone: editFormData.phone,
        address: editFormData.address,
        // Backend expects profileImageUrl
        profileImageUrl: editFormData.profileImageUrl || undefined,
      })
      await refresh()

      toast({
        title: "Profile Updated",
        description: "Your profile has been successfully updated",
      })
      setIsEditingProfile(false)
    } catch (err: any) {
      const fields = (err && err.fields) || {}
      if (fields && typeof fields === 'object') setEditErrors(fields)
      const message = (err && err.message) || 'Update failed'
      toast({ title: 'Update failed', description: message, variant: 'destructive' })
    }
  }

  // No order history or cancel functions here

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <h1 className="text-3xl md:text-4xl font-bold mb-8">My Profile</h1>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-8 mb-8">
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <p className="text-sm text-muted-foreground">Name</p>
                  <p className="font-semibold">{user.name}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Email</p>
                  <p className="font-semibold">{user.email}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Member Since</p>
                  <p className="font-semibold">{formatDate(user.createdAt)}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Phone</p>
                  <p className="font-semibold">{user.phone?.trim() || "—"}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Address</p>
                  <p className="font-semibold text-sm">{user.address?.trim() || "—"}</p>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingProfile(true)}
                  className="w-full mt-4 bg-transparent"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Profile
                </Button>
              </CardContent>
            </Card>

            {/* My Order Stats */}
            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>My Order Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
                  <div className="p-5 rounded-xl bg-secondary flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Orders</p>
                      <p className="text-3xl font-bold">{orderStats.totalOrders}</p>
                    </div>
                  </div>
                  <div className="p-5 rounded-xl bg-secondary flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Delivered</p>
                      <p className="text-3xl font-bold">{orderStats.completedOrders}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Total Spent</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{formatPrice(orderStats.totalSpent || 0)}</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 md:gap-8">
            {/* Order history removed */}

            {/* Order details removed */}
          </div>

          <div className="mt-8">
            <Link href="/shop">
              <Button>Continue Shopping</Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Edit Profile Modal */}
      <Modal
        isOpen={isEditingProfile}
        title="Edit Profile"
        onClose={() => setIsEditingProfile(false)}
        onConfirm={handleUpdateProfile}
        confirmText="Save Changes"
        cancelText="Cancel"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-4">
            <Avatar className="w-16 h-16">
              <AvatarImage src={editFormData.profileImageUrl || undefined} alt={user.name} />
              <AvatarFallback>{user.name?.slice(0, 2).toUpperCase() || "U"}</AvatarFallback>
            </Avatar>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="bg-transparent"
                  disabled={uploading}
                  onClick={() => document.getElementById('profile-image-input')?.click()}
                >
                  {uploading ? "Uploading..." : "Upload Photo"}
                </Button>
                {editFormData.profileImageUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setEditFormData({ ...editFormData, profileImageUrl: "" })}
                  >
                    Remove
                  </Button>
                )}
              </div>
              {uploadError && <p className="text-xs text-destructive">{uploadError}</p>}
              <input
                id="profile-image-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={async (e) => {
                  setUploadError("")
                  const file = e.target.files?.[0]
                  if (!file) return
                  try {
                    setUploading(true)
                    const fd = new FormData()
                    fd.append('file', file)
                    const res = await fetch('/api/upload', { method: 'POST', body: fd })
                    const json = await res.json()
                    if (!res.ok || json?.error) {
                      throw new Error(json?.error?.message || `Upload failed (${res.status})`)
                    }
                    const url = json?.data?.url as string
                    setEditFormData({ ...editFormData, profileImageUrl: url })
                  } catch (err: any) {
                    setUploadError(err?.message || 'Upload failed')
                  } finally {
                    setUploading(false)
                    // reset input value so the same file can be re-selected
                    ;(e.target as HTMLInputElement).value = ''
                  }
                }}
              />
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Name</label>
            <Input
              value={editFormData.name}
              onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              className="mt-1"
            />
            {editErrors.name && <p className="text-xs text-destructive mt-1">{editErrors.name}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Email</label>
            <Input value={editFormData.email} disabled className="mt-1 bg-gray-100" />
            <p className="text-xs text-muted-foreground mt-1">Email cannot be changed</p>
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Phone</label>
            <Input
              value={editFormData.phone}
              onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
              placeholder="Enter your phone number"
              className="mt-1"
            />
            {editErrors.phone && <p className="text-xs text-destructive mt-1">{editErrors.phone}</p>}
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Address</label>
            <Input
              value={editFormData.address}
              onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
              placeholder="Enter your address"
              className="mt-1"
            />
            {editErrors.address && <p className="text-xs text-destructive mt-1">{editErrors.address}</p>}
          </div>
        </div>
      </Modal>

      {/* Order history modal removed */}

      <Footer />
    </div>
  )
}
