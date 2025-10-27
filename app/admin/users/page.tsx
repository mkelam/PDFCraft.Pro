"use client"

import React, { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useAuth, useRequireAuth } from "@/contexts/AuthContext"
import { Navigation } from "@/components/Navigation"
import {
  User, Users, Mail, Calendar, Settings, Trash2, Edit, CheckCircle, XCircle,
  Search, Filter, ChevronLeft, ChevronRight, RefreshCw, Shield, Activity
} from "lucide-react"
import Link from "next/link"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// User interface matching backend
interface ManagedUser {
  id: number
  email: string
  full_name: string | null
  email_verified: boolean
  plan: 'free' | 'starter' | 'pro' | 'enterprise'
  conversions_used: number
  conversions_limit: number
  created_at: string
  last_login: string | null
}

interface DashboardStats {
  users: {
    total: number
    byPlan: Array<{ plan: string; count: number }>
    verified: number
    unverified: number
    newToday: number
    newThisWeek: number
    activeLastMonth: number
  }
  conversions: {
    total: number
    byStatus: Array<{ status: string; count: number }>
  }
}

export default function UserManagementPage() {
  const { user, isLoading: authLoading } = useRequireAuth()
  const [users, setUsers] = useState<ManagedUser[]>([])
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [planFilter, setPlanFilter] = useState('all')
  const [verifiedFilter, setVerifiedFilter] = useState('all')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)

  // Fetch dashboard stats
  const fetchStats = async () => {
    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch('http://localhost:3015/api/admin/stats', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setStats(data.data)
      }
    } catch (error) {
      console.error('Failed to fetch stats:', error)
    }
  }

  // Fetch users list
  const fetchUsers = async () => {
    try {
      setIsLoading(true)
      const token = localStorage.getItem('authToken')

      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10',
        ...(searchQuery && { search: searchQuery }),
        ...(planFilter !== 'all' && { plan: planFilter }),
        ...(verifiedFilter !== 'all' && { verified: verifiedFilter })
      })

      const response = await fetch(`http://localhost:3015/api/admin/users?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        const data = await response.json()
        setUsers(data.data.users)
        setTotalPages(data.data.pagination.totalPages)
        setTotalUsers(data.data.pagination.total)
      } else {
        console.error('Failed to fetch users')
      }
    } catch (error) {
      console.error('Error fetching users:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // Verify user email manually
  const verifyUser = async (userId: number) => {
    if (!confirm('Manually verify this user\'s email?')) return

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`http://localhost:3015/api/admin/users/${userId}/verify`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        alert('User verified successfully')
        fetchUsers() // Refresh list
      } else {
        const data = await response.json()
        alert(data.error?.message || 'Failed to verify user')
      }
    } catch (error) {
      alert('Error verifying user')
    }
  }

  // Reset user usage
  const resetUsage = async (userId: number) => {
    if (!confirm('Reset usage for this user?')) return

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`http://localhost:3015/api/admin/users/${userId}/reset-usage`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        alert('Usage reset successfully')
        fetchUsers() // Refresh list
      } else {
        alert('Failed to reset usage')
      }
    } catch (error) {
      alert('Error resetting usage')
    }
  }

  // Delete user
  const deleteUser = async (userId: number, email: string) => {
    if (!confirm(`Permanently delete user ${email}? This cannot be undone.`)) return

    try {
      const token = localStorage.getItem('authToken')
      const response = await fetch(`http://localhost:3015/api/admin/users/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (response.ok) {
        alert('User deleted successfully')
        fetchUsers() // Refresh list
      } else {
        const data = await response.json()
        alert(data.error?.message || 'Failed to delete user')
      }
    } catch (error) {
      alert('Error deleting user')
    }
  }

  // Initial load
  useEffect(() => {
    if (!authLoading && user) {
      fetchStats()
      fetchUsers()
    }
  }, [authLoading, user])

  // Refetch on filter/page change
  useEffect(() => {
    if (!authLoading && user) {
      fetchUsers()
    }
  }, [page, planFilter, verifiedFilter])

  // Show loading state
  if (authLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

      <div className="pt-32 pb-12 px-6">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold text-foreground mb-2 flex items-center gap-2">
                <Shield className="w-8 h-8 text-primary" />
                User Management
              </h1>
              <p className="text-muted-foreground">Manage user accounts, permissions, and usage</p>
            </div>
            <Link href="/dashboard">
              <Button variant="outline">Back to Dashboard</Button>
            </Link>
          </div>

          {/* Stats Overview */}
          {stats && (
            <div className="grid md:grid-cols-4 gap-4 mb-8">
              <Card className="glass-strong border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Total Users</p>
                      <p className="text-2xl font-bold">{stats.users.total}</p>
                    </div>
                    <Users className="w-8 h-8 text-primary opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-strong border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Verified</p>
                      <p className="text-2xl font-bold text-green-600">{stats.users.verified}</p>
                    </div>
                    <CheckCircle className="w-8 h-8 text-green-500 opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-strong border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Unverified</p>
                      <p className="text-2xl font-bold text-amber-600">{stats.users.unverified}</p>
                    </div>
                    <XCircle className="w-8 h-8 text-amber-500 opacity-20" />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-strong border-border/50">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active (30d)</p>
                      <p className="text-2xl font-bold text-blue-600">{stats.users.activeLastMonth}</p>
                    </div>
                    <Activity className="w-8 h-8 text-blue-500 opacity-20" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Filters */}
          <Card className="glass-strong border-border/50 mb-6">
            <CardContent className="pt-6">
              <div className="grid md:grid-cols-4 gap-4">
                <div className="md:col-span-2">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                    <Input
                      placeholder="Search by email or name..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && fetchUsers()}
                      className="pl-10"
                    />
                  </div>
                </div>

                <Select value={planFilter} onValueChange={setPlanFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by plan" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Plans</SelectItem>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="starter">Starter</SelectItem>
                    <SelectItem value="pro">Pro</SelectItem>
                    <SelectItem value="enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={verifiedFilter} onValueChange={setVerifiedFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="true">Verified</SelectItem>
                    <SelectItem value="false">Unverified</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-2 mt-4">
                <Button
                  onClick={fetchUsers}
                  size="sm"
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </Button>
                <span className="text-sm text-muted-foreground">
                  Showing {users.length} of {totalUsers} users
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Users Table */}
          <Card className="glass-strong border-border/50">
            <CardHeader>
              <CardTitle>Users</CardTitle>
              <CardDescription>Manage all registered users</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading users...</p>
                </div>
              ) : users.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No users found</h3>
                  <p className="text-muted-foreground">Try adjusting your filters</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-border">
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">User</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Plan</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Usage</th>
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">Joined</th>
                        <th className="text-right py-3 px-4 font-medium text-muted-foreground">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map((managedUser) => (
                        <tr key={managedUser.id} className="border-b border-border/50 hover:bg-muted/50 transition">
                          <td className="py-4 px-4">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <User className="w-5 h-5 text-primary" />
                              </div>
                              <div>
                                <p className="font-medium">{managedUser.email}</p>
                                {managedUser.full_name && (
                                  <p className="text-sm text-muted-foreground">{managedUser.full_name}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            {managedUser.email_verified ? (
                              <Badge className="bg-green-500/10 text-green-600 hover:bg-green-500/20">
                                Verified
                              </Badge>
                            ) : (
                              <Badge variant="secondary">Unverified</Badge>
                            )}
                          </td>
                          <td className="py-4 px-4">
                            <Badge variant="outline" className="capitalize">
                              {managedUser.plan}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm">
                              <span className="font-medium">{managedUser.conversions_used}</span>
                              <span className="text-muted-foreground"> / {managedUser.conversions_limit}</span>
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="text-sm text-muted-foreground">
                              {new Date(managedUser.created_at).toLocaleDateString()}
                            </div>
                          </td>
                          <td className="py-4 px-4">
                            <div className="flex items-center justify-end gap-2">
                              {!managedUser.email_verified && (
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => verifyUser(managedUser.id)}
                                  className="flex items-center gap-1"
                                  title="Verify Email"
                                >
                                  <CheckCircle className="w-4 h-4" />
                                </Button>
                              )}
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => resetUsage(managedUser.id)}
                                className="flex items-center gap-1"
                                title="Reset Usage"
                              >
                                <RefreshCw className="w-4 h-4" />
                              </Button>
                              <Link href={`/admin/users/${managedUser.id}`}>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="flex items-center gap-1"
                                  title="Edit User"
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                              </Link>
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => deleteUser(managedUser.id, managedUser.email)}
                                className="flex items-center gap-1 text-destructive hover:text-destructive"
                                title="Delete User"
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-6 pt-6 border-t border-border">
                  <p className="text-sm text-muted-foreground">
                    Page {page} of {totalPages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(p => Math.max(1, p - 1))}
                      disabled={page === 1}
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                      disabled={page === totalPages}
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
