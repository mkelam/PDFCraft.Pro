"use client"

import React, { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Mail, AlertCircle, Loader2, CheckCircle } from 'lucide-react'
import AuthAPI from '@/lib/auth-api'

export default function ForgotPasswordPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      // Validate email
      if (!email) {
        throw new Error('Please enter your email address')
      }

      if (!AuthAPI.validateEmail(email)) {
        throw new Error('Please enter a valid email address')
      }

      // Request password reset
      const result = await AuthAPI.forgotPassword(email)

      if (result.success) {
        setSuccess(true)
      } else {
        throw new Error(result.message || 'Failed to send reset email')
      }
    } catch (error) {
      console.error('Forgot password failed:', error)
      setError(error instanceof Error ? error.message : 'Failed to send reset email. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Back link */}
        <Link
          href="/login"
          className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors mb-8 group"
        >
          <ArrowLeft className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
          Back to Sign In
        </Link>

        {/* Form card */}
        <Card className="glass-strong border-border/50">
          <CardHeader className="text-center space-y-2">
            <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-2">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">Forgot your password?</CardTitle>
            <CardDescription className="text-muted-foreground">
              No worries! Enter your email and we'll send you reset instructions
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {!success ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                {/* Error message */}
                {error && (
                  <div className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
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
                    className="glass-subtle bg-input/50 border-border/40 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20"
                    required
                    autoFocus
                  />
                </div>

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 transition-all duration-200 hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Sending reset link...
                    </>
                  ) : (
                    <>
                      <Mail className="w-4 h-4 mr-2" />
                      Send Reset Link
                    </>
                  )}
                </Button>
              </form>
            ) : (
              /* Success state */
              <div className="space-y-4 py-4">
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                </div>

                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-foreground text-lg">Check your email</h3>
                  <p className="text-sm text-muted-foreground">
                    We've sent password reset instructions to{' '}
                    <span className="font-medium text-foreground">{email}</span>
                  </p>
                </div>

                <div className="p-4 bg-primary/5 border border-primary/10 rounded-lg space-y-2">
                  <p className="text-sm text-foreground font-medium">What's next?</p>
                  <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                    <li>Check your inbox for the reset email</li>
                    <li>Click the reset link (valid for 1 hour)</li>
                    <li>Create a new password</li>
                  </ul>
                </div>

                <div className="flex flex-col gap-3">
                  <Button
                    onClick={() => setSuccess(false)}
                    variant="outline"
                    className="w-full glass-subtle border-border/40"
                  >
                    Didn't receive it? Try again
                  </Button>

                  <Button
                    onClick={() => router.push('/login')}
                    className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Return to Sign In
                  </Button>
                </div>
              </div>
            )}

            {/* Divider */}
            {!success && (
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border/40" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-card px-4 text-muted-foreground">Need help?</span>
                </div>
              </div>
            )}

            {/* Help links */}
            {!success && (
              <div className="text-center space-y-2">
                <p className="text-sm text-muted-foreground">
                  Remember your password?{' '}
                  <Link href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
                    Sign in instead
                  </Link>
                </p>
                <p className="text-sm text-muted-foreground">
                  Don't have an account?{' '}
                  <Link href="/signup" className="text-primary hover:text-primary/80 font-medium transition-colors">
                    Create account
                  </Link>
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer text */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          For security reasons, password reset links expire after 1 hour.
        </p>
      </div>
    </div>
  )
}
