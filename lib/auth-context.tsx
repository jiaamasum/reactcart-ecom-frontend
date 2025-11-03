"use client"

import type React from "react"
import { createContext, useContext, useState, useEffect } from "react"
import type { ApiUser } from "./api"
import { apiGetMe, apiLogin, apiLogout, apiRegister } from "./api"

// Keep compatibility with existing User shape in the app
export type AppUser = {
  id: string
  email: string
  name: string
  role: "customer" | "admin"
  createdAt?: string
  isBanned?: boolean
  profileImage?: string
  phone?: string
  address?: string
}

interface AuthContextType {
  user: AppUser | null
  isLoading: boolean
  login: (email: string, password: string) => Promise<AppUser>
  register: (email: string, name: string, password: string) => Promise<AppUser>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

function toAppUser(u: ApiUser): AppUser {
  // api may use profileImageUrl; map to profileImage for the app
  const profileImage = (u as any).profileImageUrl
  const role = (u.role === "ADMIN" || u.role === "admin") ? "admin" : "customer"
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    role,
    createdAt: u.createdAt,
    isBanned: (u as any).isBanned ?? (u as any).banned ?? false,
    profileImage,
    phone: u.phone,
    address: u.address,
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AppUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // On mount, check server session using cookie-authenticated /api/user-details
    const init = async () => {
      try {
        const me = await apiGetMe()
        if (me) {
          const appUser = toAppUser(me)
          setUser(appUser)
        }
      } catch {
        // unauthenticated; keep user null
      } finally {
        setIsLoading(false)
      }
    }
    init()
  }, [])

  const login = async (email: string, password: string) => {
    const u = await apiLogin(email, password)
    // Hydrate full profile (createdAt, phone, address, etc.)
    let full = u
    try { full = await apiGetMe() } catch {}
    const appUser = toAppUser(full)
    setUser(appUser)
    return appUser
  }

  const register = async (email: string, name: string, password: string) => {
    const u = await apiRegister(email, name, password)
    // Hydrate full profile after registration
    let full = u
    try { full = await apiGetMe() } catch {}
    const appUser = toAppUser(full)
    setUser(appUser)
    return appUser
  }

  const logout = async () => {
    await apiLogout()
    setUser(null)
  }

  const refresh = async () => {
    try {
      const me = await apiGetMe()
      const appUser = toAppUser(me)
      setUser(appUser)
    } catch {
      // ignore
    }
  }

  return (
    <AuthContext.Provider value={{ user, isLoading, login, register, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within AuthProvider")
  }
  return context
}
