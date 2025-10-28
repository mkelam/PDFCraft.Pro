"use client"

import React, { useState } from 'react'
import { AlertCircle, Mail, X, Loader2, CheckCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import AuthAPI from '@/lib/auth-api'

interface EmailVerificationBannerProps {
  email: string;
  onDismiss?: () => void;
  className?: string;
}

export default function EmailVerificationBanner({
  email,
  onDismiss,
  className = ''
}: EmailVerificationBannerProps) {
  const [isResending, setIsResending] = useState(false)
  const [resendSuccess, setResendSuccess] = useState(false)
  const [resendError, setResendError] = useState('')

  const handleResendEmail = async () => {
    setIsResending(true)
    setResendError('')
    setResendSuccess(false)

    try {
      await AuthAPI.resendVerification(email)
      setResendSuccess(true)

      // Auto-dismiss success message after 5 seconds
      setTimeout(() => {
        setResendSuccess(false)
      }, 5000)
    } catch (error) {
      console.error('Failed to resend verification email:', error)
      setResendError(error instanceof Error ? error.message : 'Failed to resend email')
    } finally {
      setIsResending(false)
    }
  }

  return (
    <div className={`w-full ${className}`}>
      <div className="glass-strong border border-yellow-500/30 rounded-lg p-4 shadow-lg">
        <div className="flex items-start gap-3">
          {/* Icon */}
          <div className="flex-shrink-0 mt-0.5">
            <AlertCircle className="w-5 h-5 text-yellow-500" />
          </div>

          {/* Content */}
          <div className="flex-1 space-y-2">
            <div className="flex items-start justify-between gap-2">
              <div>
                <h3 className="font-semibold text-foreground">Email Verification Required</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  Please verify your email address to start converting PDFs. We've sent a verification link to{' '}
                  <span className="font-medium text-foreground">{email}</span>
                </p>
              </div>

              {/* Dismiss button */}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="flex-shrink-0 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label="Dismiss"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Success message */}
            {resendSuccess && (
              <div className="flex items-center gap-2 p-2 bg-green-500/10 border border-green-500/20 rounded text-sm text-green-600">
                <CheckCircle className="w-4 h-4" />
                <span>Verification email sent successfully! Check your inbox.</span>
              </div>
            )}

            {/* Error message */}
            {resendError && (
              <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-sm text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span>{resendError}</span>
              </div>
            )}

            {/* Actions */}
            <div className="flex items-center gap-3 pt-2">
              <Button
                onClick={handleResendEmail}
                disabled={isResending || resendSuccess}
                size="sm"
                variant="outline"
                className="glass-subtle border-yellow-500/30 hover:border-yellow-500/50 text-foreground hover:bg-yellow-500/5"
              >
                {isResending ? (
                  <>
                    <Loader2 className="w-3 h-3 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : resendSuccess ? (
                  <>
                    <CheckCircle className="w-3 h-3 mr-2" />
                    Email Sent
                  </>
                ) : (
                  <>
                    <Mail className="w-3 h-3 mr-2" />
                    Resend Email
                  </>
                )}
              </Button>

              <p className="text-xs text-muted-foreground">
                Didn't receive it? Check your spam folder or click resend.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
