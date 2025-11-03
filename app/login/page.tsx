"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Footer } from "@/components/footer"
import { useToast } from "@/hooks/use-toast"

export default function LoginPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const { login } = useAuth()
  const { toast } = useToast()
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      const u = await login(email, password)
      toast({ title: "Welcome back", description: "Login successful" })
      if (u.role === 'admin') router.push('/admin/dashboard')
      else router.push('/')
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Intro panel */}
            <div className="hidden md:block">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Welcome back</h1>
              <p className="text-muted-foreground mb-6">
                Sign in to manage your account, track orders, and continue shopping.
              </p>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                <li>Secure login with demo accounts</li>
                <li>Access your cart and wishlist</li>
                <li>Manage profile and orders</li>
              </ul>
            </div>

            {/* Login card */}
            <Card className="w-full max-w-md md:ml-auto border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Login</CardTitle>
                <CardDescription>Sign in to your account</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      placeholder="you@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Password</label>
                    <Input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                    />
                    <div className="flex items-center justify-between mt-2">
                      <Link href="/forgot-password" className="text-sm text-primary hover:underline">Forgot password?</Link>
                    </div>
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Logging in..." : "Login"}
                  </Button>
                </form>
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Don't have an account?{" "}
                  <Link href="/register" className="text-primary hover:underline">
                    Register
                  </Link>
                </p>

              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
