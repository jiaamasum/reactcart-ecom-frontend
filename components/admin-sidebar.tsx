"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  LayoutDashboard,
  Package,
  ShoppingCart,
  Users,
  Ticket,
  LogOut,
  ChevronLeft,
  Settings,
  User,
  AlertTriangle,
} from "lucide-react"
import { useAuth } from "@/lib/auth-context"
import { Button } from "@/components/ui/button"
import { useState } from "react"

export default function AdminSidebar() {
  const pathname = usePathname()
  const { logout } = useAuth()
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [isMobileOpen, setIsMobileOpen] = useState(false)

  const menuItems = [
    { href: "/admin/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { href: "/admin/products", label: "Products", icon: Package },
    { href: "/admin/categories", label: "Categories", icon: Package },
    { href: "/admin/inventory", label: "Inventory", icon: AlertTriangle },
    { href: "/admin/orders", label: "Orders", icon: ShoppingCart },
    { href: "/admin/customers", label: "Customers", icon: Users },
    { href: "/admin/coupons", label: "Coupons", icon: Ticket },
    { href: "/admin/profile", label: "Profile", icon: User },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ]

  return (
    <>
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="md:hidden fixed top-20 left-4 z-50 p-2 bg-slate-900 text-white rounded-lg"
      >
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>

      <aside
        className={`bg-slate-900 text-white min-h-screen flex flex-col fixed left-0 top-0 pt-20 transition-all duration-300 z-40 ${
          isCollapsed ? "w-20" : "w-64"
        } ${isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}`}
      >
        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="absolute -right-3 top-24 bg-slate-900 border border-slate-700 rounded-full p-1 hover:bg-slate-800 hidden md:flex"
        >
          <ChevronLeft className={`w-4 h-4 transition-transform ${isCollapsed ? "rotate-180" : ""}`} />
        </button>

        <nav className="flex-1 px-4 py-8 space-y-2">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link key={item.href} href={item.href} onClick={() => setIsMobileOpen(false)}>
                <div
                  className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                    isActive ? "bg-blue-600 text-white" : "text-gray-300 hover:bg-slate-800"
                  }`}
                  title={isCollapsed ? item.label : ""}
                >
                  <Icon className="w-5 h-5 flex-shrink-0" />
                  {!isCollapsed && <span className="font-medium">{item.label}</span>}
                </div>
              </Link>
            )
          })}
        </nav>

        <div className="px-4 py-4 border-t border-slate-700">
          <Button
            onClick={logout}
            variant="outline"
            className={`w-full justify-start text-red-400 border-red-400 hover:bg-red-950 bg-transparent ${
              isCollapsed ? "px-2" : ""
            }`}
            title={isCollapsed ? "Logout" : ""}
          >
            <LogOut className="w-4 h-4 flex-shrink-0" />
            {!isCollapsed && <span className="ml-2">Logout</span>}
          </Button>
        </div>
      </aside>

      {isMobileOpen && (
        <div className="fixed inset-0 bg-black/50 z-30 md:hidden" onClick={() => setIsMobileOpen(false)} />
      )}
    </>
  )
}
