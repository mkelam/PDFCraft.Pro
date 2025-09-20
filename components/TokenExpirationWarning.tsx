"use client"

import { useState, useEffect } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { AlertTriangle, X } from "lucide-react"
import { PDFCraftAPI } from "@/lib/api"

interface TokenWarning {
  message: string
  expiresIn: number
  action: string
}

export function TokenExpirationWarning() {
  const [warning, setWarning] = useState<TokenWarning | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Set up the token warning handler
    PDFCraftAPI.setTokenWarningHandler((tokenWarning: TokenWarning) => {
      setWarning(tokenWarning)
      setIsDismissed(false)
    })
  }, [])

  // Don't show if dismissed or no warning
  if (!warning || isDismissed) {
    return null
  }

  const handleDismiss = () => {
    setIsDismissed(true)
  }

  const handleLoginRedirect = () => {
    window.location.href = '/login'
  }

  return (
    <Alert className="fixed top-4 right-4 max-w-md bg-amber-50 border-amber-200 z-50 shadow-lg">
      <AlertTriangle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="text-amber-800 pr-8">
        <div className="space-y-3">
          <p>{warning.message}</p>
          <div className="flex space-x-2">
            <Button
              onClick={handleLoginRedirect}
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white"
            >
              Login Now
            </Button>
            <Button
              onClick={handleDismiss}
              variant="outline"
              size="sm"
              className="border-amber-300 text-amber-700 hover:bg-amber-100"
            >
              Dismiss
            </Button>
          </div>
        </div>
      </AlertDescription>
      <Button
        variant="ghost"
        size="sm"
        className="absolute top-2 right-2 h-6 w-6 p-0 text-amber-600 hover:bg-amber-100"
        onClick={handleDismiss}
      >
        <X className="h-3 w-3" />
      </Button>
    </Alert>
  )
}