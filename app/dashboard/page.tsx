"use client"

import React, { useEffect, useState } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { useAuth, useRequireAuth } from "@/contexts/AuthContext"
import { Navigation } from "@/components/Navigation"
import { User, FileText, Download, Settings, LogOut, Clock, CheckCircle, XCircle } from "lucide-react"
import Link from "next/link"

interface ConversionActivity {
  id: string
  type: string
  status: string
  fileName: string
  fileSize: number
  processingTime: number
  createdAt: string
  completedAt: string
}

export default function DashboardPage() {
  // Require authentication - will redirect to login if not authenticated
  const { user, isLoading } = useRequireAuth()
  const { logout } = useAuth()
  const [recentActivity, setRecentActivity] = useState<ConversionActivity[]>([])
  const [activityLoading, setActivityLoading] = useState(true)

  const handleLogout = async () => {
    try {
      await logout()
      // Redirect will happen automatically
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  // Fetch recent activity when user is available
  useEffect(() => {
    const fetchRecentActivity = async () => {
      if (!user) return

      try {
        setActivityLoading(true)
        const token = localStorage.getItem('authToken')  // Fixed: Changed from 'auth_token' to 'authToken'
        const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3015'

        const response = await fetch(`${API_URL}/api/users/enhanced/history?limit=5`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })

        if (response.ok) {
          const data = await response.json()
          setRecentActivity(data.data.history || [])
        }
      } catch (error) {
        console.error('Failed to fetch recent activity:', error)
      } finally {
        setActivityLoading(false)
      }
    }

    fetchRecentActivity()
  }, [user])

  // Show loading state while checking authentication
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  // This will only render if user is authenticated
  if (!user) return null

  // Calculate usage percentage
  const usagePercentage = user.plan === 'pro'
    ? 0 // Unlimited for pro users
    : Math.min((user.conversions_used / user.conversions_limit) * 100, 100)

  const remainingConversions = user.plan === 'pro'
    ? 'Unlimited'
    : Math.max(0, user.conversions_limit - user.conversions_used)

  return (
    <div className="min-h-screen">
      <Navigation />

      <div className="pt-32 pb-12 px-6">
        <div className="container mx-auto max-w-6xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2">Dashboard</h1>
              <p className="text-muted-foreground">Welcome back, {user.email}!</p>
            </div>

            <div className="flex items-center gap-4">
              <Badge variant={user.plan === 'free' ? 'secondary' : 'default'} className="capitalize">
                {user.plan} Plan
              </Badge>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="flex items-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {/* Usage Stats */}
            <Card className="glass-strong border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="w-5 h-5 text-primary" />
                  Usage Statistics
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Conversions Used</span>
                    <span className="font-medium">
                      {user.conversions_used} / {user.plan === 'pro' ? '∞' : user.conversions_limit}
                    </span>
                  </div>
                  {user.plan !== 'pro' && (
                    <Progress value={usagePercentage} className="h-2" />
                  )}
                  <p className="text-sm text-muted-foreground">
                    {remainingConversions} conversions remaining this month
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Account Info */}
            <Card className="glass-strong border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <User className="w-5 h-5 text-primary" />
                  Account
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <p className="font-medium truncate">{user.email}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Plan</p>
                    <p className="font-medium capitalize">{user.plan}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Member Since</p>
                    <p className="font-medium">
                      {new Date(user.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="glass-strong border-border/50">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Settings className="w-5 h-5 text-primary" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <Link href="/convert" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <FileText className="w-4 h-4 mr-2" />
                      Convert PDF
                    </Button>
                  </Link>
                  <Link href="/pricing" className="block">
                    <Button variant="outline" className="w-full justify-start">
                      <Download className="w-4 h-4 mr-2" />
                      Upgrade Plan
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card className="glass-strong border-border/50">
            <CardHeader>
              <CardTitle className="text-xl">Recent Activity</CardTitle>
              <CardDescription>Your recent PDF conversions and activity</CardDescription>
            </CardHeader>
            <CardContent>
              {activityLoading ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading activity...</p>
                </div>
              ) : recentActivity.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No Recent Activity</h3>
                  <p className="text-muted-foreground mb-4">
                    Start converting PDFs to see your activity here
                  </p>
                  <Link href="/convert">
                    <Button>Convert Your First PDF</Button>
                  </Link>
                </div>
              ) : (
                <div className="space-y-4">
                  {recentActivity.map((activity) => (
                    <div
                      key={activity.id}
                      className="flex items-start gap-4 p-4 rounded-lg border border-border/50 hover:border-border transition-colors"
                    >
                      <div className="flex-shrink-0">
                        {activity.status === 'completed' ? (
                          <CheckCircle className="w-5 h-5 text-green-500" />
                        ) : activity.status === 'failed' ? (
                          <XCircle className="w-5 h-5 text-red-500" />
                        ) : (
                          <Clock className="w-5 h-5 text-amber-500" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium text-foreground truncate">
                              {activity.fileName}
                            </h4>
                            <div className="flex items-center gap-3 mt-1 text-sm text-muted-foreground">
                              <span className="capitalize">{activity.type.replace('-', ' ')}</span>
                              <span>•</span>
                              <span>{(activity.fileSize / 1024).toFixed(1)} KB</span>
                              {activity.processingTime > 0 && (
                                <>
                                  <span>•</span>
                                  <span>{(activity.processingTime / 1000).toFixed(1)}s</span>
                                </>
                              )}
                            </div>
                          </div>
                          <Badge
                            variant={
                              activity.status === 'completed'
                                ? 'default'
                                : activity.status === 'failed'
                                ? 'destructive'
                                : 'secondary'
                            }
                            className="capitalize flex-shrink-0"
                          >
                            {activity.status}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(activity.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  ))}
                  {recentActivity.length >= 5 && (
                    <div className="text-center pt-2">
                      <Button variant="outline" size="sm">
                        View All Activity
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Usage Warning for Free Users */}
          {user.plan === 'free' && usagePercentage > 80 && (
            <Card className="glass-strong border-amber-200 bg-amber-50/50 mt-6">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 bg-amber-500 rounded-full animate-pulse"></div>
                  <div>
                    <p className="font-medium text-amber-800">
                      You're running low on conversions!
                    </p>
                    <p className="text-sm text-amber-700">
                      You have {remainingConversions} conversions left.
                      <Link href="/pricing" className="underline ml-1">
                        Upgrade your plan
                      </Link> for unlimited access.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}