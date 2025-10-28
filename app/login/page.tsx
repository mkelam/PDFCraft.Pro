"use client"

import type React from "react"

import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, ArrowLeft, AlertCircle, Loader2 } from "lucide-react"
import { useAuth, useGuestOnly } from "@/contexts/AuthContext"
import AuthAPI from "@/lib/auth-api"
import { socialProviders } from "@/lib/social-auth"

export default function LoginPage() {
  // Redirect if already authenticated
  useGuestOnly()

  const router = useRouter()
  const { login } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [socialLoading, setSocialLoading] = useState<string | null>(null)

  const handleSocialLogin = async (provider: string) => {
    setSocialLoading(provider)
    setError("")

    try {
      const socialProvider = socialProviders.find(p => p.id === provider)
      if (socialProvider) {
        const result = await socialProvider.action()

        if (!result.success) {
          throw new Error(result.error || `${provider} authentication failed`)
        }

        // Redirect will happen automatically via NextAuth
        router.push("/dashboard")
      }
    } catch (error) {
      console.error(`${provider} login failed:`, error)
      setError(error instanceof Error ? error.message : `${provider} login failed. Please try again.`)
    } finally {
      setSocialLoading(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError("")
    setIsLoading(true)

    try {
      // Validate inputs
      if (!email || !password) {
        throw new Error("Please enter both email and password")
      }

      if (!AuthAPI.validateEmail(email)) {
        throw new Error("Please enter a valid email address")
      }

      // Attempt login
      await login({ email, password })

      // Redirect to dashboard on success
      router.push("/dashboard")
    } catch (error) {
      console.error("Login failed:", error)
      setError(error instanceof Error ? error.message : "Login failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back to home link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Back to PDF Lab Pro
        </Link>

        {/* Login form card */}
        <Card className="glass-strong border-border/50">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold text-foreground">Welcome back</CardTitle>
            <CardDescription className="text-muted-foreground">Sign in to your PDF Lab Pro account</CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="space-y-3">
              {socialProviders.map((provider) => (
                <Button
                  key={provider.id}
                  type="button"
                  variant="outline"
                  onClick={() => handleSocialLogin(provider.id)}
                  disabled={socialLoading !== null}
                  data-testid={`social-login-${provider.id}`}
                  className="w-full glass-subtle border-border/40 hover:border-primary/50 text-foreground hover:text-primary transition-all duration-200 hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {socialLoading === provider.id ? (
                    <Loader2 className="w-5 h-5 mr-3 animate-spin" />
                  ) : (
                    <span className="mr-3">{provider.icon}</span>
                  )}
                  {socialLoading === provider.id ? (
                    `Connecting to ${provider.name}...`
                  ) : (
                    `Continue with ${provider.name}`
                  )}
                </Button>
              ))}
            </div>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/40" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-card px-4 text-muted-foreground">Or continue with email</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error message */}
              {error && (
                <div data-testid="login-error-message" className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              {/* Email field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-medium">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  data-testid="login-email-input"
                  className="glass-subtle bg-input/50 border-border/40 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20"
                  required
                />
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <Label htmlFor="password" className="text-foreground font-medium">
                  Password
                </Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    data-testid="login-password-input"
                    className="glass-subtle bg-input/50 border-border/40 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="toggle-login-password-visibility"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Forgot password link */}
              <div className="flex justify-end">
                <Link href="/forgot-password" className="text-sm text-primary hover:text-primary/80 transition-colors">
                  Forgot your password?
                </Link>
              </div>

              {/* Login button */}
              <Button
                type="submit"
                disabled={isLoading}
                data-testid="sign-in-button"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 transition-all duration-200 hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign in"
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/40" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-card px-4 text-muted-foreground">Don't have an account?</span>
              </div>
            </div>

            {/* Sign up link */}
            <div className="text-center">
              <Link href="/signup" className="text-primary hover:text-primary/80 font-medium transition-colors">
                Create a new account
              </Link>
            </div>
          </CardContent>
        </Card>

        {/* Footer text */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          By signing in, you agree to our{" "}
          <Link href="/terms" className="text-primary hover:text-primary/80 transition-colors">
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="text-primary hover:text-primary/80 transition-colors">
            Privacy Policy
          </Link>
        </p>
      </div>
    </div>
  )
}
