"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { FileText } from "lucide-react"

export function Navigation() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 glass-nav">
      <div className="max-w-6xl mx-auto px-6">
        <div className="flex items-center justify-between h-16">
          <Link href="/" className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <FileText className="w-4 h-4 text-primary" />
            </div>
            <span className="font-semibold text-lg">PDF Craft Pro</span>
          </Link>

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
          </div>

          {/* Mobile menu button for smaller screens */}
          <div className="flex items-center space-x-2 md:hidden">
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
          </div>
        </div>
      </div>
    </nav>
  )
}
