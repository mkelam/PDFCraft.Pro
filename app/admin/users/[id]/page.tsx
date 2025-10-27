"use client"

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { useAuth, useRequireAuth } from "@/contexts/AuthContext"
import { Navigation } from "@/components/Navigation"
import {
  User, Mail, Calendar, ArrowLeft, Save, Shield, Activity, CheckCircle, XCircle
} from "lucide-react"
import Link from "next/link"

interface UserDetail {
  id: number
  email: string
  full_name: string | null
  email_verified: boolean
  plan: 'free' | 'starter' | 'pro' | 'enterprise'
  conversions_used: number
  conversions_limit: number
  created_at: string
  last_login: string | null
  oauth_provider: string | null
}

export default function EditUserPage() {
  const params = useParams()
  const router = useRouter()
  const userId = params.id as string
  const { user: currentUser, isLoading: authLoading } = useRequireAuth()

  const [user, setUser] = useState<UserDetail | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  // Form fields
  const [fullName, setFullName] = useState('')
  const [plan, setPlan] = useState<'free' | 'starter' | 'pro' | 'enterprise'>('free')
  const [conversionsLimit, setConversionsLimit] = useState(0)

  // Fetch user details
  const fetchUser = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('authToken')
      const response = await fetch(`http://localhost:3015/api/admin/users/${userId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        const userData = data.data.user // Access data.data.user instead of data.data
        setUser(userData)
        setFullName(userData.full_name || '')
        setPlan(userData.plan)
        setConversionsLimit(userData.conversions_limit)
      } else {
        alert('Failed to load user')
        router.push('/admin/users')
      }
    } catch (error) {
      console.error('Error fetching user:', error)
      alert('Error loading user')
      router.push('/admin/users')
    } finally {
      setIsLoading(false)
    }
  }

  // Save user changes
  const handleSave = async () => {
    if (!user) return

    try {
      setIsSaving(true)
      const token = localStorage.getItem('authToken')
      const response = await fetch(`http://localhost:3015/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          full_name: fullName || null,
          plan,
          conversions_limit: conversionsLimit
        })
      })

      if (response.ok) {
        alert('User updated successfully')
        fetchUser() // Refresh user data
      } else {
        const data = await response.json()
        alert(data.error?.message || 'Failed to update user')
      }
    } catch (error) {
      console.error('Error updating user:', error)
      alert('Error updating user')
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    if (!authLoading && currentUser) {
      fetchUser()
    }
  }, [authLoading, currentUser, userId])

  if (authLoading || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <p className="text-muted-foreground">User not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-32 pb-12 px-6">
        <div className="container mx-auto max-w-4xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <Link href="/admin/users">
                <Button variant="ghost" className="mb-4">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Users
                </Button>
              </Link>
              <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                <User className="w-8 h-8 text-primary" />
                Edit User
              </h1>
              <p className="text-muted-foreground">{user.email}</p>
            </div>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>

          {/* User Info Cards */}
          <div className="grid md:grid-cols-3 gap-4 mb-6">
            <Card className="glass-strong border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    {user.email_verified ? (
                      <Badge className="bg-green-500/10 text-green-600 mt-2">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Verified
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="mt-2">
                        <XCircle className="w-3 h-3 mr-1" />
                        Unverified
                      </Badge>
                    )}
                  </div>
                  <Mail className="w-8 h-8 text-primary opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-strong border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Member Since</p>
                    <p className="text-sm font-medium mt-1">
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <Calendar className="w-8 h-8 text-primary opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-strong border-border/50">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Last Login</p>
                    <p className="text-sm font-medium mt-1">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                    </p>
                  </div>
                  <Activity className="w-8 h-8 text-primary opacity-20" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Edit Form */}
          <Card className="glass-strong border-border/50">
            <CardHeader>
              <CardTitle>User Details</CardTitle>
              <CardDescription>Update user information and settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Email (read-only) */}
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  value={user.email}
                  disabled
                  className="bg-muted/50"
                />
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input
                  id="fullName"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter full name"
                />
              </div>

              {/* Plan */}
              <div className="space-y-2">
                <Label htmlFor="plan">Subscription Plan</Label>
                <Select value={plan} onValueChange={(value: any) => setPlan(value)}>
                  <SelectTrigger id="plan">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Conversions Limit */}
              <div className="space-y-2">
                <Label htmlFor="conversionsLimit">Conversions Limit</Label>
                <Input
                  id="conversionsLimit"
                  type="number"
                  min="0"
                  value={conversionsLimit}
                  onChange={(e) => setConversionsLimit(parseInt(e.target.value) || 0)}
                />
                <p className="text-xs text-muted-foreground">
                  Current usage: {user.conversions_used} / {conversionsLimit}
                </p>
              </div>

              {/* OAuth Info (read-only) */}
              {user.oauth_provider && (
                <div className="space-y-2">
                  <Label>OAuth Provider</Label>
                  <div className="p-3 bg-muted/50 rounded-md">
                    <Badge variant="outline" className="capitalize">
                      {user.oauth_provider}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">User signed up via OAuth</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Save Button (bottom) */}
          <div className="mt-6 flex justify-end gap-3">
            <Link href="/admin/users">
              <Button variant="outline">Cancel</Button>
            </Link>
            <Button onClick={handleSave} disabled={isSaving}>
              <Save className="w-4 h-4 mr-2" />
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
