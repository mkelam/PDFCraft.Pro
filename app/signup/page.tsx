"use client"

import type React from "react"
import { useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Eye, EyeOff, ArrowLeft, Check, AlertCircle, Loader2, Mail, CheckCircle } from "lucide-react"
import { useAuth, useGuestOnly } from "@/contexts/AuthContext"
import AuthAPI from "@/lib/auth-api"
import { socialProviders } from "@/lib/social-auth"

export default function SignupPage() {
  // Redirect if already authenticated
  useGuestOnly()

  const router = useRouter()
  const { register } = useAuth()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [socialLoading, setSocialLoading] = useState<string | null>(null)
  const [registrationSuccess, setRegistrationSuccess] = useState(false)
  const [registeredEmail, setRegisteredEmail] = useState("")
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptTerms: false,
  })

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    // Clear error when user starts typing
    if (error) setError("")
  }

  const handleSocialSignup = async (provider: string) => {
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
      console.error(`${provider} signup failed:`, error)
      setError(error instanceof Error ? error.message : `${provider} signup failed. Please try again.`)
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
      if (!formData.firstName || !formData.lastName || !formData.email || !formData.password) {
        throw new Error("Please fill in all required fields")
      }

      if (!AuthAPI.validateEmail(formData.email)) {
        throw new Error("Please enter a valid email address")
      }

      if (formData.password !== formData.confirmPassword) {
        throw new Error("Passwords do not match")
      }

      const passwordValidation = AuthAPI.validatePassword(formData.password)
      if (!passwordValidation.isValid) {
        throw new Error(passwordValidation.message)
      }

      if (!formData.acceptTerms) {
        throw new Error("Please accept the terms and conditions")
      }

      // Attempt registration
      await register({
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        firstName: formData.firstName,
        lastName: formData.lastName,
      })

      // Show success message instead of redirecting
      setRegisteredEmail(formData.email)
      setRegistrationSuccess(true)
    } catch (error) {
      console.error("Registration failed:", error)
      setError(error instanceof Error ? error.message : "Registration failed. Please try again.")
    } finally {
      setIsLoading(false)
    }
  }


  const passwordsMatch = formData.password === formData.confirmPassword
  const isFormValid =
    formData.firstName &&
    formData.lastName &&
    formData.email &&
    formData.password &&
    passwordsMatch &&
    formData.acceptTerms

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

        {/* Signup form card */}
        <Card className="glass-strong border-border/50">
          <CardHeader className="text-center space-y-2">
            <CardTitle className="text-2xl font-bold text-foreground">Create your account</CardTitle>
            <CardDescription className="text-muted-foreground">
              Join PDF Lab Pro and start converting documents instantly
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Success message after registration */}
            {registrationSuccess ? (
              <div className="space-y-6 py-4">
                {/* Success icon */}
                <div className="flex items-center justify-center mb-4">
                  <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
                    <CheckCircle className="w-8 h-8 text-green-500" />
                  </div>
                </div>

                {/* Success title */}
                <div className="text-center space-y-2">
                  <h3 className="font-semibold text-foreground text-lg">Check your email!</h3>
                  <p className="text-sm text-muted-foreground">
                    We've sent a verification link to{' '}
                    <span className="font-medium text-foreground">{registeredEmail}</span>
                  </p>
                </div>

                {/* Instructions */}
                <div className="p-4 bg-primary/5 border border-primary/10 rounded-lg space-y-3">
                  <div className="flex items-start gap-3">
                    <Mail className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-foreground">Next steps:</p>
                      <ol className="text-sm text-muted-foreground space-y-1 list-decimal list-inside">
                        <li>Check your inbox for the verification email</li>
                        <li>Click the verification link in the email</li>
                        <li>Start converting PDFs instantly!</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Benefits reminder */}
                <div className="space-y-2">
                  <p className="text-xs font-medium text-foreground">After verification, you'll get:</p>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>3 free conversions per month</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>Convert to PowerPoint, Word & Excel</span>
                    </li>
                    <li className="flex items-center gap-2">
                      <CheckCircle className="w-3 h-3 text-green-500" />
                      <span>96% OCR accuracy on scanned PDFs</span>
                    </li>
                  </ul>
                </div>

                {/* Resend option */}
                <div className="text-center pt-4 border-t border-border/40">
                  <p className="text-xs text-muted-foreground">
                    Didn't receive the email?{' '}
                    <button
                      onClick={() => {
                        AuthAPI.resendVerification(registeredEmail)
                          .then(() => alert('Verification email resent!'))
                          .catch(() => alert('Failed to resend email'))
                      }}
                      className="text-primary hover:text-primary/80 font-medium transition-colors"
                    >
                      Resend verification email
                    </button>
                  </p>
                </div>
              </div>
            ) : (
              <>
            <div className="space-y-3">
              {socialProviders.map((provider) => (
                <Button
                  key={provider.id}
                  type="button"
                  variant="outline"
                  onClick={() => handleSocialSignup(provider.id)}
                  disabled={socialLoading !== null}
                  data-testid={`social-signup-${provider.id}`}
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
                <div data-testid="signup-error-message" className="flex items-center gap-2 p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded-md">
                  <AlertCircle className="w-4 h-4" />
                  <span>{error}</span>
                </div>
              )}

              {/* Name fields */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName" className="text-foreground font-medium">
                    First name
                  </Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => handleInputChange("firstName", e.target.value)}
                    data-testid="signup-first-name-input"
                    className="glass-subtle bg-input/50 border-border/40 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName" className="text-foreground font-medium">
                    Last name
                  </Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => handleInputChange("lastName", e.target.value)}
                    data-testid="signup-last-name-input"
                    className="glass-subtle bg-input/50 border-border/40 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20"
                    required
                  />
                </div>
              </div>

              {/* Email field */}
              <div className="space-y-2">
                <Label htmlFor="email" className="text-foreground font-medium">
                  Email address
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.email}
                  onChange={(e) => handleInputChange("email", e.target.value)}
                  data-testid="signup-email-input"
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
                    placeholder="Create a strong password"
                    value={formData.password}
                    onChange={(e) => handleInputChange("password", e.target.value)}
                    data-testid="signup-password-input"
                    className="glass-subtle bg-input/50 border-border/40 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 pr-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    data-testid="toggle-signup-password-visibility"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    title={showPassword ? "Hide password" : "Show password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
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
                    value={formData.confirmPassword}
                    onChange={(e) => handleInputChange("confirmPassword", e.target.value)}
                    data-testid="signup-confirm-password-input"
                    className={`glass-subtle bg-input/50 border-border/40 text-foreground placeholder:text-muted-foreground focus:border-primary/50 focus:ring-primary/20 pr-10 ${
                      formData.confirmPassword && !passwordsMatch ? "border-red-500/50" : ""
                    }`}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    data-testid="toggle-confirm-password-visibility"
                    aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    title={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {formData.confirmPassword && !passwordsMatch && (
                  <p className="text-sm text-red-400">Passwords do not match</p>
                )}
              </div>

              {/* Terms acceptance */}
              <div className="flex items-start space-x-3">
                <button
                  type="button"
                  onClick={() => handleInputChange("acceptTerms", !formData.acceptTerms)}
                  data-testid="accept-terms-checkbox"
                  role="checkbox"
                  aria-checked={formData.acceptTerms}
                  aria-label="Accept terms and conditions"
                  className={`flex-shrink-0 w-5 h-5 rounded border-2 transition-all duration-200 ${
                    formData.acceptTerms
                      ? "bg-primary border-primary text-primary-foreground"
                      : "border-border/40 hover:border-primary/50"
                  }`}
                >
                  {formData.acceptTerms && <Check className="w-3 h-3 m-auto" />}
                </button>
                <Label className="text-sm text-muted-foreground leading-relaxed cursor-pointer">
                  I agree to the{" "}
                  <Link href="/terms" className="text-primary hover:text-primary/80 transition-colors">
                    Terms of Service
                  </Link>{" "}
                  and{" "}
                  <Link href="/privacy" className="text-primary hover:text-primary/80 transition-colors">
                    Privacy Policy
                  </Link>
                </Label>
              </div>

              {/* Signup button */}
              <Button
                type="submit"
                disabled={!isFormValid || isLoading}
                data-testid="create-account-button"
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-medium py-2.5 transition-all duration-200 hover:shadow-lg hover:shadow-primary/20 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create account"
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-border/40" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-card px-4 text-muted-foreground">Already have an account?</span>
              </div>
            </div>

            {/* Sign in link */}
            <div className="text-center">
              <Link href="/login" className="text-primary hover:text-primary/80 font-medium transition-colors">
                Sign in to your account
              </Link>
            </div>
            </>
            )}
          </CardContent>
        </Card>

        {/* Footer text */}
        <p className="text-center text-xs text-muted-foreground mt-8">
          By creating an account, you agree to receive updates about PDF Lab Pro features and services.
        </p>
      </div>
    </div>
  )
}
