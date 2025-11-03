"use client"

import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Footer } from "@/components/footer"
import { apiResetPassword } from "@/lib/api"
import { CheckCircle, XCircle } from "lucide-react"

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("")
  const [newPassword, setNewPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [done, setDone] = useState(false)
  const [success, setSuccess] = useState<boolean | null>(null)
  const [error, setError] = useState("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")

    if (!email || !email.includes("@")) {
      setError("Please enter a valid email address")
      return
    }
    if (!newPassword || newPassword.length < 6) {
      setError("New password must be at least 6 characters")
      return
    }
    if (newPassword !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    try {
      await apiResetPassword(email, newPassword, confirmPassword)
      setSuccess(true)
      setDone(true)
    } catch (err: any) {
      setSuccess(false)
      setDone(true)
      const msg = (err && typeof err.message === 'string' && err.message) || 'Password reset failed'
      setError(msg)
    }
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 py-12 md:py-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div className="hidden md:block">
              <h1 className="text-3xl md:text-4xl font-bold text-foreground mb-3">Reset your password</h1>
              <p className="text-muted-foreground">Enter your account email and new password to reset.</p>
            </div>

            <Card className="w-full max-w-md md:ml-auto border-0 shadow-lg">
              <CardHeader>
                <CardTitle>Reset Password</CardTitle>
                <CardDescription>Provide your email and new password</CardDescription>
              </CardHeader>
              <CardContent>
                {done ? (
                  <div className="space-y-4 text-center py-6">
                    <div className="flex justify-center">
                      {success ? (
                        <CheckCircle className="w-14 h-14 text-green-600" aria-label="Password reset successful" />
                      ) : (
                        <XCircle className="w-14 h-14 text-red-600" aria-label="Password reset failed" />
                      )}
                    </div>
                    <p className="text-foreground font-medium">
                      {success ? "Password reset successful" : "Password reset failed"}
                    </p>
                    <Link href="/login">
                      <Button className="mt-2">Back to Login</Button>
                    </Link>
                  </div>
                ) : (
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
                      <label className="text-sm font-medium">New Password</label>
                      <Input
                        type="password"
                        placeholder="Enter new password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Confirm Password</label>
                      <Input
                        type="password"
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                      />
                    </div>
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    <Button type="submit" className="w-full">Reset Password</Button>
                    <p className="text-xs text-muted-foreground text-center">
                      Changed your mind? <Link href="/login" className="text-primary hover:underline">Go to Login</Link>
                    </p>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
