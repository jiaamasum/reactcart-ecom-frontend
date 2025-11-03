"use client"

import type React from "react"

import { useState } from "react"
import { useAuth } from "@/lib/auth-context"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Footer } from "@/components/footer"
import { useToast } from "@/hooks/use-toast"
import { PartyPopper } from "lucide-react"

export default function RegisterPage() {
  const [email, setEmail] = useState("")
  const [name, setName] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [registered, setRegistered] = useState(false)
  const { register } = useAuth()
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      await register(email, name, password)
      toast({ title: "Welcome!", description: "Registration successful" })
      setRegistered(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Registration failed")
    } finally {
      setIsLoading(false)
    }
  }

  if (registered) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <main className="flex-1">
          <div className="max-w-7xl mx-auto px-4 py-16">
            <Card className="w-full max-w-md mx-auto border-0 shadow-lg">
              <CardContent className="pt-12 pb-12 text-center space-y-6">
                <div className="flex justify-center">
                  <PartyPopper className="w-16 h-16 text-green-600" aria-label="Registration successful" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold text-foreground mb-2">Registration Successful!</h1>
                  <p className="text-muted-foreground">Welcome to ShopHub, {name}!</p>
                </div>
                <p className="text-muted-foreground text-sm">
                  Your account has been created successfully. You can now login and start shopping.
                </p>
                <div className="flex gap-3 flex-col sm:flex-row pt-4">
                  <Link href="/login" className="flex-1">
                    <Button className="w-full">Login Now</Button>
                  </Link>
                  <Link href="/shop" className="flex-1">
                    <Button variant="outline" className="w-full bg-transparent">
                      Shop Now
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Intro panel */}
            <div className="hidden md:block">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Create your account</h1>
              <p className="text-muted-foreground mb-6">Join ShopHub to get personalized recommendations and faster checkout.</p>
              <ul className="space-y-2 text-sm text-muted-foreground list-disc pl-5">
                <li>Access exclusive deals</li>
                <li>Track orders and manage returns</li>
                <li>Save multiple shipping addresses</li>
              </ul>
            </div>

            {/* Register card */}
            <Card className="w-full max-w-md md:ml-auto border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Register</CardTitle>
                <CardDescription>Create a new account</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      type="text"
                      placeholder="Your name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Email</label>
                    <Input
                      type="email"
                      placeholder="your@email.com"
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
                  </div>
                  {error && <p className="text-sm text-destructive">{error}</p>}
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? "Registering..." : "Register"}
                  </Button>
                </form>
                <p className="text-sm text-muted-foreground mt-4 text-center">
                  Already have an account?{" "}
                  <Link href="/login" className="text-primary hover:underline">
                    Login
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
