"use client"

import React, { useState, useEffect, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { ArrowLeft, Eye, EyeOff, AlertCircle, Loader2, CheckCircle, Lock } from 'lucide-react'
import AuthAPI from '@/lib/auth-api'

function ResetPasswordContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams?.get('token')

  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [tokenValid, setTokenValid] = useState<boolean | null>(null)

  useEffect(() => {
    // Validate token exists
    if (!token) {
      setTokenValid(false)
      setError('Invalid password reset link. No token provided.')
    } else {
      setTokenValid(true)
    }
  }, [token])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setIsLoading(true)

    try {
      if (!token) {
        throw new Error('Invalid reset link')
      }

      // Validate password
      if (!newPassword || !confirmPassword) {
        throw new Error('Please fill in all fields')
      }

      if (newPassword !== confirmPassword) {
        throw new Error('Passwords do not match')
      }

      const passwordValidation = AuthAPI.validatePassword(newPassword)
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.message)
      }

      // Reset password
      const result = await AuthAPI.resetPassword(token, newPassword)

      if (result.success) {
        setSuccess(true)
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/login')
        }, 3000)
      } else {
        throw new Error(result.message || 'Failed to reset password')
      }
    } catch (error) {
      console.error('Password reset failed:', error)
      setError(error instanceof Error ? error.message : 'Failed to reset password. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  const passwordsMatch = newPassword === confirmPassword
  const passwordStrength = newPassword ? AuthAPI.validatePassword(newPassword) : null

  // Invalid token state
  if (tokenValid === false) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md">
          <Card className="glass-strong border-border/50">
            <CardHeader className="text-center space-y-4 pb-6">
              <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-red-500/10">
                <AlertCircle className="w-8 h-8 text-red-500" />
              </div>
              <div>
                <CardTitle className="text-2xl font-bold text-foreground">Invalid Reset Link</CardTitle>
                <CardDescription className="text-muted-foreground mt-2">
                  This password reset link is invalid or has expired
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-4">
              <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg text-sm text-red-700">
                <p>{error}</p>
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">This could happen if:</p>
                <ul className="list-disc list-inside space-y-1 pl-2">
                  <li>The reset link has expired (valid for 1 hour)</li>
                  <li>The link has already been used</li>
                  <li>The link was copied incorrectly</li>
                </ul>
              </div>

              <Button
                onClick={() => router.push('/forgot-password')}
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Request New Reset Link
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    )
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
              <Lock className="w-6 h-6 text-primary" />
            </div>
            <CardTitle className="text-2xl font-bold text-foreground">Reset your password</CardTitle>
            <CardDescription className="text-muted-foreground">
              Enter a new password for your account
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

                {/* New Password field */}
                <div className="space-y-2">
                  <Label htmlFor="newPassword" className="text-foreground font-medium">
                    New password
                  </Label>
                  <div className="relative">
                    <Input
                      id="newPassword"
                      type={showPassword ? "text" : "password"}
                      placeholder="Create a strong password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="glass-subtle bg-input/50 border-border/40 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 pr-10"
                      required
                      autoFocus
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {/* Password strength indicator */}
                  {newPassword && passwordStrength && (
                    <p className={`text-xs ${
                      passwordStrength.isValid ? 'text-green-600' : 'text-yellow-600'
                    }`}>
                      {passwordStrength.message}
                    </p>
                  )}
                </div>

                {/* Confirm Password field */}
                <div className="space-y-2">
                  <Label htmlFor="confirmPassword" className="text-foreground font-medium">
                    Confirm password
                  </Label>
                  <div className="relative">
                    <Input
                      id="confirmPassword"
                      type={showConfirmPassword ? "text" : "password"}
                      placeholder="Confirm your password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`glass-subtle bg-input/50 border-border/40 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 pr-10 ${
                        confirmPassword && !passwordsMatch ? "border-red-500/50" : ""
                      }`}
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <p className="text-xs text-red-400">Passwords do not match</p>
                  )}
                </div>

                {/* Password requirements */}
                <div className="p-3 bg-primary/5 border border-primary/10 rounded-lg">
                  <p className="text-xs font-medium text-foreground mb-2">Password requirements:</p>
                  <ul className="text-xs text-muted-foreground space-y-1 list-disc list-inside">
                    <li>At least 8 characters long</li>
                    <li>Contains uppercase and lowercase letters</li>
                    <li>Contains at least one number</li>
                  </ul>
                </div>

                {/* Submit button */}
                <Button
                  type="submit"
                  disabled={isLoading || !passwordsMatch || !passwordStrength?.isValid}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 transition-all duration-200 hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Resetting password...
                    </>
                  ) : (
                    <>
                      <Lock className="w-4 h-4 mr-2" />
                      Reset Password
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
                  <h3 className="font-semibold text-foreground text-lg">Password Reset Successful!</h3>
                  <p className="text-sm text-muted-foreground">
                    Your password has been updated successfully
                  </p>
                </div>

                <div className="p-4 bg-green-500/5 border border-green-500/10 rounded-lg text-center">
                  <p className="text-sm text-muted-foreground">
                    Redirecting to sign in page...
                  </p>
                </div>

                <Button
                  onClick={() => router.push('/login')}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Go to Sign In
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer text */}
        {!success && (
          <p className="text-center text-xs text-muted-foreground mt-8">
            <Link href="/support" className="hover:text-foreground transition-colors">
              Need help?
            </Link>
            {' '}•{' '}
            <Link href="/" className="hover:text-foreground transition-colors">
              Return to Homepage
            </Link>
          </p>
        )}
      </div>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="glass-strong border-border/50 shadow-2xl w-full max-w-md">
          <CardHeader className="text-center space-y-4 pb-6">
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-purple-500/20">
              <Loader2 className="w-8 h-8 text-primary animate-spin" />
            </div>
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">Loading...</CardTitle>
              <CardDescription className="text-muted-foreground mt-2">Please wait</CardDescription>
            </div>
          </CardHeader>
        </Card>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  )
}
