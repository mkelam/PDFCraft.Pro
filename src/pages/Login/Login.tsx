import React, { useState } from 'react'
import { Navigate, useNavigate } from 'react-router-dom'
import { useForm } from 'react-hook-form'
import { motion } from 'framer-motion'
import { Eye, EyeOff, ArrowRight } from 'lucide-react'
import { useUserStore } from '../../stores/userStore'

interface LoginForm {
  email: string
  password: string
}

export const Login: React.FC = () => {
  const navigate = useNavigate()
  const { login, isAuthenticated, isLoading, error, clearError } = useUserStore()
  const [showPassword, setShowPassword] = useState(false)

  const {
    register,
    handleSubmit,
    formState: { errors }
  } = useForm<LoginForm>()

  // Redirect if already authenticated
  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  const onSubmit = async (data: LoginForm) => {
    clearError()
    await login(data.email, data.password)
    if (useUserStore.getState().isAuthenticated) {
      navigate('/dashboard')
    }
  }

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <div className="mx-auto h-16 w-16 rounded-2xl bg-white flex items-center justify-center mb-4">
            <span className="text-2xl font-bold text-black">P</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">Welcome back</h1>
          <p className="text-[var(--color-text-tertiary)]">
            Sign in to your PDF SaaS account
          </p>
        </motion.div>

        {/* Login Form */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="premium-card"
        >
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Error Message */}
            {error && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="p-4 bg-red-500/10 border border-red-500/20 rounded-lg"
              >
                <p className="text-red-400 text-sm">{error}</p>
              </motion.div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Email
              </label>
              <input
                type="email"
                {...register('email', {
                  required: 'Email is required',
                  pattern: {
                    value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                    message: 'Invalid email address'
                  }
                })}
                className="w-full px-3 py-3 bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] rounded-lg text-white placeholder-[var(--color-text-quaternary)] focus:outline-none focus:border-white transition-colors"
                placeholder="Enter your email"
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-400">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-[var(--color-text-secondary)] mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  {...register('password', {
                    required: 'Password is required',
                    minLength: {
                      value: 6,
                      message: 'Password must be at least 6 characters'
                    }
                  })}
                  className="w-full px-3 py-3 pr-10 bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] rounded-lg text-white placeholder-[var(--color-text-quaternary)] focus:outline-none focus:border-white transition-colors"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                  ) : (
                    <Eye className="h-4 w-4 text-[var(--color-text-tertiary)]" />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1 text-sm text-red-400">{errors.password.message}</p>
              )}
            </div>

            {/* Remember & Forgot */}
            <div className="flex items-center justify-between">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  className="rounded border-[var(--color-border-primary)] bg-[var(--color-bg-tertiary)] text-white focus:ring-0 focus:ring-offset-0"
                />
                <span className="ml-2 text-sm text-[var(--color-text-secondary)]">Remember me</span>
              </label>
              <a href="#" className="text-sm text-white hover:text-[var(--color-text-secondary)] transition-colors">
                Forgot password?
              </a>
            </div>

            {/* Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              className="w-full premium-button premium-button-primary flex items-center justify-center space-x-2 py-3 disabled:opacity-50 disabled:cursor-not-allowed"
              whileHover={{ scale: isLoading ? 1 : 1.02 }}
              whileTap={{ scale: isLoading ? 1 : 0.98 }}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </motion.button>
          </form>
        </motion.div>

        {/* Sign Up Link */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="text-center mt-6"
        >
          <p className="text-[var(--color-text-tertiary)]">
            Don't have an account?{' '}
            <a href="#" className="text-white hover:text-[var(--color-text-secondary)] transition-colors font-medium">
              Sign up for free
            </a>
          </p>
        </motion.div>

        {/* Demo Notice */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-8 premium-card bg-blue-500/5 border-blue-500/20"
        >
          <div className="text-center">
            <h3 className="text-white font-medium mb-2">Demo Account</h3>
            <p className="text-[var(--color-text-tertiary)] text-sm mb-3">
              Try the platform with our demo credentials:
            </p>
            <div className="text-mono text-sm space-y-1">
              <div className="text-[var(--color-text-secondary)]">Email: demo@pdfsaas.com</div>
              <div className="text-[var(--color-text-secondary)]">Password: demo123</div>
            </div>
          </div>
        </motion.div>

        {/* Back to Home */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="text-center mt-6"
        >
          <a
            href="/"
            className="text-[var(--color-text-tertiary)] hover:text-white transition-colors text-sm"
          >
            ← Back to Home
          </a>
        </motion.div>
      </div>
    </div>
  )
}