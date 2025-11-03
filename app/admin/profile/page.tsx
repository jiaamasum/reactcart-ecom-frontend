"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useAuth } from "@/lib/auth-context"
import { apiPatchMe, apiResetPassword } from "@/lib/api"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { User, Mail, Lock, Phone, MapPin, Upload } from "lucide-react"

export default function AdminProfilePage() {
  const { user, refresh } = useAuth()
  const [formData, setFormData] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    address: user?.address || "",
    newPassword: "",
    confirmPassword: "",
  })
  const [profileImage, setProfileImage] = useState<string>(user?.profileImage || "")
  const [successMessage, setSuccessMessage] = useState("")
  const [errorMessage, setErrorMessage] = useState("")
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [pwdSuccess, setPwdSuccess] = useState("")
  const [pwdError, setPwdError] = useState("")
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState("")

  // Keep local form state in sync with latest user data
  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.name || "",
        email: user.email || "",
        phone: user.phone || "",
        address: user.address || "",
      }))
      setProfileImage(user.profileImage || "")
    }
  }, [user])

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
  }

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setUploadError("")
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
      setProfileImage(url)
    } catch (err: any) {
      setUploadError(err?.message || 'Upload failed')
    } finally {
      setUploading(false)
      ;(e.target as HTMLInputElement).value = ''
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage("")
    setSuccessMessage("")
    setFieldErrors({})

    try {
      const payload: any = {
        name: formData.name,
        phone: formData.phone,
        address: formData.address,
      }
      if (profileImage) payload.profileImageUrl = profileImage
      await apiPatchMe(payload)
      await refresh()
      setSuccessMessage("Profile updated successfully!")
      setTimeout(() => setSuccessMessage(""), 3000)
    } catch (err: any) {
      const fields = err?.fields || {}
      if (fields && typeof fields === 'object') setFieldErrors(fields)
      setErrorMessage(err?.message || 'Update failed')
    }
  }

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900">Admin Profile</h1>
        <p className="text-gray-600 mt-1">Manage your profile information and settings</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Profile Picture Section */}
        <Card className="border-0 shadow-lg md:col-span-1">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-lg">Profile Picture</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="flex flex-col items-center">
              <div className="w-32 h-32 rounded-full bg-gray-200 flex items-center justify-center overflow-hidden mb-4">
                {profileImage ? (
                  <img src={profileImage || "/placeholder.svg"} alt="Profile" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-16 h-16 text-gray-400" />
                )}
              </div>
              <label className="cursor-pointer">
                <div className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-60">
                  <Upload className="w-4 h-4" />
                  {uploading ? 'Uploading...' : 'Upload Photo'}
                </div>
                <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
              </label>
              {uploadError && <p className="text-xs text-red-600 mt-2">{uploadError}</p>}
              <p className="text-xs text-gray-500 mt-2">JPG, PNG up to 5MB</p>
            </div>
          </CardContent>
        </Card>

        {/* Profile Information Section */}
        <Card className="border-0 shadow-lg md:col-span-2">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
            <CardTitle className="text-lg">Personal Information</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              {successMessage && (
                <div className="p-3 bg-green-100 text-green-800 rounded-lg text-sm">{successMessage}</div>
              )}
              {errorMessage && <div className="p-3 bg-red-100 text-red-800 rounded-lg text-sm">{errorMessage}</div>}

              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Full Name
                </label>
              <Input
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="Enter your full name"
                required
              />
              {fieldErrors.name && <div className="text-xs text-red-600 mt-1">{fieldErrors.name}</div>}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email Address
                </label>
                <Input
                  name="email"
                  type="email"
                  value={formData.email}
                  disabled
                  placeholder="Email cannot be changed"
                  className="bg-gray-100"
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Phone className="w-4 h-4" />
                  Phone Number
                </label>
                <Input
                  name="phone"
                  value={formData.phone}
                  onChange={handleInputChange}
                  placeholder="Enter your phone number"
                />
                {fieldErrors.phone && <div className="text-xs text-red-600 mt-1">{fieldErrors.phone}</div>}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <MapPin className="w-4 h-4" />
                  Address
                </label>
                <Input
                  name="address"
                  value={formData.address}
                  onChange={handleInputChange}
                  placeholder="Enter your address"
                />
                {fieldErrors.address && <div className="text-xs text-red-600 mt-1">{fieldErrors.address}</div>}
              </div>

              <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
                Save Changes
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Password Change Section */}
      <Card className="border-0 shadow-lg mt-6">
        <CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50">
          <CardTitle className="text-lg flex items-center gap-2">
            <Lock className="w-5 h-5" />
            Change Password
          </CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <form className="space-y-4 max-w-md" onSubmit={async (e) => {
            e.preventDefault()
            setPwdError("")
            setPwdSuccess("")
            if (!formData.newPassword || !formData.confirmPassword) {
              setPwdError('Please enter and confirm the new password')
              return
            }
            if (formData.newPassword !== formData.confirmPassword) {
              setPwdError('Passwords do not match')
              return
            }
            try {
              const email = user?.email || formData.email
              await apiResetPassword(email, formData.newPassword, formData.confirmPassword)
              setPwdSuccess('Password reset successful')
              setFormData((prev) => ({ ...prev, newPassword: '', confirmPassword: '' }))
            } catch (err: any) {
              setPwdError(err?.message || 'Password reset failed')
            }
          }}>
            {pwdSuccess && <div className="p-3 bg-green-100 text-green-800 rounded-lg text-sm">{pwdSuccess}</div>}
            {pwdError && <div className="p-3 bg-red-100 text-red-800 rounded-lg text-sm">{pwdError}</div>}
            <div>
              <label className="text-sm font-medium text-gray-700">New Password</label>
              <Input
                name="newPassword"
                type="password"
                value={formData.newPassword}
                onChange={handleInputChange}
                placeholder="Enter new password"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Confirm Password</label>
              <Input
                name="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={handleInputChange}
                placeholder="Confirm new password"
              />
            </div>

            <Button type="submit" className="w-full md:w-auto bg-green-600 hover:bg-green-700">
              Update Password
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
