"use client"

import React, { useEffect, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { CheckCircle, XCircle, Loader2, ArrowRight, Home } from 'lucide-react'
import AuthAPI from '@/lib/auth-api'

function VerifyEmailContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams?.get('token')

  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')
  const [countdown, setCountdown] = useState(5)

  useEffect(() => {
    const verifyEmail = async () => {
      if (!token) {
        setStatus('error')
        setMessage('Invalid verification link. No token provided.')
        return
      }

      try {
        const result = await AuthAPI.verifyEmail(token)

        if (result.success) {
          setStatus('success')
          setMessage(result.message || 'Email verified successfully!')

          // Start countdown timer
          const timer = setInterval(() => {
            setCountdown((prev) => {
              if (prev <= 1) {
                clearInterval(timer)
                router.push('/dashboard')
                return 0
              }
              return prev - 1
            })
          }, 1000)

          return () => clearInterval(timer)
        } else {
          setStatus('error')
          setMessage(result.message || 'Email verification failed')
        }
      } catch (error) {
        console.error('Email verification error:', error)
        setStatus('error')
        setMessage(
          error instanceof Error
            ? error.message
            : 'Email verification failed. The link may be expired or invalid.'
        )
      }
    }

    verifyEmail()
  }, [token, router])

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <Card className="glass-strong border-border/50 shadow-2xl">
          <CardHeader className="text-center space-y-4 pb-6">
            {/* Icon */}
            <div className="mx-auto w-16 h-16 rounded-full flex items-center justify-center bg-gradient-to-br from-primary/20 to-purple-500/20">
              {status === 'loading' && (
                <Loader2 className="w-8 h-8 text-primary animate-spin" />
              )}
              {status === 'success' && (
                <CheckCircle className="w-8 h-8 text-green-500" />
              )}
              {status === 'error' && (
                <XCircle className="w-8 h-8 text-red-500" />
              )}
            </div>

            {/* Title */}
            <div>
              <CardTitle className="text-2xl font-bold text-foreground">
                {status === 'loading' && 'Verifying Your Email...'}
                {status === 'success' && 'Email Verified!'}
                {status === 'error' && 'Verification Failed'}
              </CardTitle>
              <CardDescription className="text-muted-foreground mt-2">
                {status === 'loading' && 'Please wait while we verify your email address'}
                {status === 'success' && 'Your account is now active and ready to use'}
                {status === 'error' && 'We couldn\'t verify your email address'}
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Message */}
            <div className={`p-4 rounded-lg border ${
              status === 'success'
                ? 'bg-green-500/10 border-green-500/20 text-green-700'
                : status === 'error'
                ? 'bg-red-500/10 border-red-500/20 text-red-700'
                : 'bg-primary/10 border-primary/20 text-primary'
            }`}>
              <p className="text-sm text-center">{message}</p>
            </div>

            {/* Success state */}
            {status === 'success' && (
              <>
                {/* Benefits list */}
                <div className="space-y-3">
                  <p className="text-sm font-medium text-foreground">You can now:</p>
                  <ul className="space-y-2 text-sm text-muted-foreground">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Convert PDFs to PowerPoint, Word & Excel</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Merge multiple PDF files</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span>Get 3 free conversions per month</span>
                    </li>
                  </ul>
                </div>

                {/* Auto-redirect message */}
                <div className="text-center p-3 bg-primary/5 rounded-lg border border-primary/10">
                  <p className="text-sm text-muted-foreground">
                    Redirecting to dashboard in{' '}
                    <span className="font-bold text-primary">{countdown}</span> seconds...
                  </p>
                </div>

                {/* Manual navigation button */}
                <Button
                  onClick={() => router.push('/dashboard')}
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  Go to Dashboard Now
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </>
            )}

            {/* Error state */}
            {status === 'error' && (
              <div className="space-y-4">
                <div className="space-y-2 text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">This could happen if:</p>
                  <ul className="list-disc list-inside space-y-1 pl-2">
                    <li>The verification link has expired (valid for 24 hours)</li>
                    <li>The link has already been used</li>
                    <li>The link was copied incorrectly</li>
                  </ul>
                </div>

                <div className="flex gap-3">
                  <Button
                    onClick={() => router.push('/signup')}
                    variant="outline"
                    className="flex-1 glass-subtle border-border/40"
                  >
                    <Home className="w-4 h-4 mr-2" />
                    Home
                  </Button>
                  <Button
                    onClick={() => router.push('/login')}
                    className="flex-1 bg-primary hover:bg-primary/90 text-primary-foreground"
                  >
                    Sign In
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Loading state */}
            {status === 'loading' && (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground animate-pulse">
                  This should only take a moment...
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          <Link href="/" className="hover:text-foreground transition-colors">
            Return to Homepage
          </Link>
          {' '}•{' '}
          <Link href="/support" className="hover:text-foreground transition-colors">
            Contact Support
          </Link>
        </p>
      </div>
    </div>
  )
}

export default function VerifyEmailPage() {
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
      <VerifyEmailContent />
    </Suspense>
  )
}
