"use client"

import type React from "react"

import AdminSidebar from "@/components/admin-sidebar"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import { useEffect } from "react"

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const { user, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && (!user || user.role !== "admin")) {
      router.push("/")
    }
  }, [user, isLoading, router])

  if (isLoading || !user || user.role !== "admin") {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="flex flex-col md:flex-row">
      <AdminSidebar />
      <main className="flex-1 md:ml-64 bg-gray-50 min-h-screen w-full">
        <div className="p-4 md:p-8">{children}</div>
      </main>
    </div>
  )
}
