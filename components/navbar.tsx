"use client"

import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { useRouter } from "next/navigation"
import { ShoppingCart, LogOut, User, LayoutDashboard, ChevronDown, Menu, X } from "lucide-react"
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar"
import { useState, useEffect } from "react"
import { apiGetPublicSettings, apiListCategories, type Category } from "@/lib/api"
import { useCart } from "@/lib/cart-context"
import { useToast } from "@/hooks/use-toast"

export default function Navbar() {
  const { user, logout } = useAuth()
  const { cartCount } = useCart()
  const router = useRouter()
  const { toast } = useToast()
  const [shopMenuOpen, setShopMenuOpen] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [storeName, setStoreName] = useState<string>("ShopHub")

  useEffect(() => {
    setMounted(true)
    // Load categories from public API
    ;(async () => {
      try { setCategories(await apiListCategories()) } catch { setCategories([]) }
    })()
    // Load public store name
    ;(async () => {
      try {
        const s = await apiGetPublicSettings()
        if (s?.storeName) setStoreName(s.storeName)
      } catch {}
    })()
  }, [])

  const handleLogout = async () => {
    await logout()
    toast({ title: "Logged out", description: "You have been logged out." })
    router.push("/")
  }

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          {/* Left: Logo */}
          <Link href="/" className="text-2xl font-bold text-primary">
            {storeName}
          </Link>

          {/* Middle: Menu Links - Desktop */}
          <div className="hidden md:flex items-center gap-8">
            <Link href="/" className="text-foreground hover:text-primary transition">
              Home
            </Link>

            {/* Shop with Submenu */}
            <div className="relative group">
              <button className="flex items-center gap-2 text-foreground hover:text-primary transition">
                Shop
                <ChevronDown className="w-4 h-4" />
              </button>
              <div className="absolute left-0 mt-0 w-48 bg-card border border-border rounded-lg shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                <Link href="/shop" className="block px-4 py-2 hover:bg-secondary rounded-t-lg">
                  All Products
                </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/shop?category=${encodeURIComponent(category.slug)}`}
                className="block px-4 py-2 hover:bg-secondary"
              >
                {category.name}
              </Link>
            ))}
              </div>
            </div>

            <Link href="/#faq" className="text-foreground hover:text-primary transition">
              FAQ
            </Link>
          </div>

          {/* Right: Auth Buttons */}
          <div className="flex items-center gap-4">
            {user ? (
              <>
                {user.role === "admin" ? (
                  <Link href="/admin/dashboard">
                    <Button variant="ghost" size="sm">
                      <LayoutDashboard className="w-4 h-4 mr-2" />
                      Dashboard
                    </Button>
                  </Link>
                ) : (
                  <>
                    <Link href="/cart">
                      <Button variant="ghost" size="sm" className="relative">
                        <ShoppingCart className="w-4 h-4 mr-2" />
                        Cart
                        {mounted && cartCount > 0 && (
                          <span className="absolute -top-2 -right-2 bg-destructive text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                            {cartCount}
                          </span>
                        )}
                      </Button>
                    </Link>
                    <Link href="/orders">
                      <Button variant="ghost" size="sm">
                        Orders
                      </Button>
                    </Link>
                    <Link href="/profile">
                      <Button variant="ghost" size="sm">
                        <User className="w-4 h-4 mr-2" />
                        Profile
                      </Button>
                    </Link>
                  </>
                )}
                <div className="hidden md:flex items-center gap-3 border-l border-border pl-4">
                  <span className="text-sm text-muted-foreground">{user.name}</span>
                  <Avatar className="size-8">
                    <AvatarImage src={user.profileImage || undefined} alt={user.name} />
                    <AvatarFallback>{user.name?.slice(0, 2).toUpperCase() || 'U'}</AvatarFallback>
                  </Avatar>
                  <Button variant="ghost" size="sm" onClick={handleLogout}>
                    <LogOut className="w-4 h-4" />
                  </Button>
                </div>
              </>
            ) : (
              <>
                <Link href="/cart">
                  <Button variant="ghost" size="sm" className="relative">
                    <ShoppingCart className="w-4 h-4 mr-2" />
                    Cart
                    {mounted && cartCount > 0 && (
                      <span className="absolute -top-2 -right-2 bg-destructive text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {cartCount}
                      </span>
                    )}
                  </Button>
                </Link>
                <Link href="/login">
                  <Button variant="ghost" size="sm">
                    Login
                  </Button>
                </Link>
                <Link href="/register">
                  <Button size="sm">Register</Button>
                </Link>
              </>
            )}

            {/* Mobile Menu Toggle */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 hover:bg-secondary rounded-lg transition"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-2 border-t border-border pt-4">
            <Link href="/" className="block px-4 py-2 hover:bg-secondary rounded">
              Home
            </Link>
            <Link href="/shop" className="block px-4 py-2 hover:bg-secondary rounded">
              Shop
            </Link>
            {categories.map((category) => (
              <Link
                key={category.id}
                href={`/shop?category=${encodeURIComponent(category.slug)}`}
                className="block px-4 py-2 hover:bg-secondary rounded ml-4"
              >
                {category.name}
              </Link>
            ))}
            <Link href="/#faq" className="block px-4 py-2 hover:bg-secondary rounded">
              FAQ
            </Link>
            {user && user.role !== "admin" && (
              <>
                <Link href="/orders" className="block px-4 py-2 hover:bg-secondary rounded">
                  Orders
                </Link>
                <Link href="/profile" className="block px-4 py-2 hover:bg-secondary rounded">
                  Profile
                </Link>
              </>
            )}
            {user && (
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-2 hover:bg-secondary rounded text-destructive"
              >
                Logout
              </button>
            )}
          </div>
        )}
      </div>
    </nav>
  )
}
