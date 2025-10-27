"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { FileText, LogOut, User } from "lucide-react"
import { useAuth } from "@/contexts/AuthContext"

export function Navigation() {
  const { user, isLoading, logout } = useAuth()

  const handleLogout = async () => {
    try {
      await logout()
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-nav">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-lg">PDF Lab Pro</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center space-x-6">
            <Link href="/features">
              <Button variant="ghost" size="sm" className="text-sm">
                Features
              </Button>
            </Link>
            <Link href="/pricing">
              <Button variant="ghost" size="sm" className="text-sm">
                Pricing
              </Button>
            </Link>

            {isLoading ? (
              <div className="w-20 h-8 animate-pulse bg-muted rounded" />
            ) : user ? (
              // Authenticated user navigation
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className="text-sm">
                    <User className="w-4 h-4 mr-2" />
                    Dashboard
                  </Button>
                </Link>
                <Badge variant={user.plan === 'free' ? 'secondary' : 'default'} className="capitalize">
                  {user.plan}
                </Badge>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Logout
                </Button>
              </>
            ) : (
              // Unauthenticated user navigation
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-sm">
                    Sign in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm" className="text-sm bg-primary hover:bg-primary/90 text-primary-foreground">
                    Sign up
                  </Button>
                </Link>
              </>
            )}
          </div>

          {/* Mobile Navigation */}
          <div className="flex items-center space-x-2 md:hidden">
            {isLoading ? (
              <div className="w-16 h-8 animate-pulse bg-muted rounded" />
            ) : user ? (
              <>
                <Link href="/dashboard">
                  <Button variant="ghost" size="sm" className="text-sm">
                    <User className="w-4 h-4" />
                  </Button>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-sm"
                  onClick={handleLogout}
                >
                  <LogOut className="w-4 h-4" />
                </Button>
              </>
            ) : (
              <>
                <Link href="/login">
                  <Button variant="ghost" size="sm" className="text-sm">
                    Sign in
                  </Button>
                </Link>
                <Link href="/signup">
                  <Button size="sm" className="text-sm bg-primary hover:bg-primary/90 text-primary-foreground">
                    Sign up
                  </Button>
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
