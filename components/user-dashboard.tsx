/**
 * User Dashboard Component - PDFCraft.Pro
 * Comprehensive user analytics and management dashboard
 * Displays OCR Overlay conversion history and statistics
 */

'use client';

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Area, AreaChart
} from 'recharts';
import {
  User, FileText, BarChart3, Clock, Zap, Brain, Star, TrendingUp,
  Download, Settings, Crown, Shield, Calendar, Activity
} from 'lucide-react';

interface UserStats {
  totalConversions: number;
  ocrOverlayConversions: number;
  totalProcessingTime: number;
  averageQualityScore: number;
  filesProcessed: number;
  totalFileSize: number;
  subscriptionStatus: string;
  usageThisMonth: number;
  usageLimit: number;
  favoritePerformanceMode: string;
  enhancementUsageRate: number;
}

interface ConversionHistory {
  id: string;
  type: string;
  status: string;
  fileName: string;
  fileSize: number;
  processingTime: number;
  qualityMetrics: {
    textAccuracy: number;
    imagePreservation: number;
    overallQuality: number;
  };
  performanceMode: string;
  enhancementsUsed: boolean;
  createdAt: string;
  completedAt: string;
}

interface DashboardData {
  stats: UserStats;
  history: ConversionHistory[];
  analytics: any;
}

export default function UserDashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // In a real implementation, these would be actual API calls
      // For now, we'll simulate the data structure
      const mockData: DashboardData = {
        stats: {
          totalConversions: 45,
          ocrOverlayConversions: 38,
          totalProcessingTime: 156000, // ms
          averageQualityScore: 92,
          filesProcessed: 45,
          totalFileSize: 125000000, // bytes
          subscriptionStatus: 'pro',
          usageThisMonth: 38,
          usageLimit: -1, // unlimited
          favoritePerformanceMode: 'balanced',
          enhancementUsageRate: 84
        },
        history: [
          {
            id: '1',
            type: 'pdf-to-powerpoint-ocr-overlay',
            status: 'completed',
            fileName: 'Quarterly Report Q4.pdf',
            fileSize: 2500000,
            processingTime: 4200,
            qualityMetrics: {
              textAccuracy: 94,
              imagePreservation: 99,
              overallQuality: 95
            },
            performanceMode: 'quality',
            enhancementsUsed: true,
            createdAt: new Date(Date.now() - 3600000).toISOString(),
            completedAt: new Date(Date.now() - 3595000).toISOString()
          },
          // Add more mock history items...
        ],
        analytics: {
          conversionsPerDay: [
            { date: '2024-01-15', count: 3, ocrOverlay: 3 },
            { date: '2024-01-16', count: 5, ocrOverlay: 4 },
            { date: '2024-01-17', count: 2, ocrOverlay: 2 },
            { date: '2024-01-18', count: 7, ocrOverlay: 6 },
            { date: '2024-01-19', count: 4, ocrOverlay: 4 },
          ],
          performanceModeDistribution: {
            balanced: 22,
            quality: 12,
            speed: 4
          },
          enhancementAdoption: {
            totalWithEnhancements: 32,
            totalWithoutEnhancements: 6,
            adoptionRate: 84
          }
        }
      };

      setData(mockData);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  };

  const formatFileSize = (bytes: number): string => {
    const sizes = ['B', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 B';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${sizes[i]}`;
  };

  const formatProcessingTime = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'completed': return 'text-green-600 bg-green-100';
      case 'processing': return 'text-blue-600 bg-blue-100';
      case 'failed': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPlanBadgeColor = (plan: string): string => {
    switch (plan) {
      case 'pro': return 'bg-purple-100 text-purple-800';
      case 'starter': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-3 text-gray-600">Loading dashboard...</span>
      </div>
    );
  }

  if (error || !data) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center text-red-600">
            {error || 'Failed to load dashboard data'}
          </div>
        </CardContent>
      </Card>
    );
  }

  const usagePercentage = data.stats.usageLimit > 0
    ? (data.stats.usageThisMonth / data.stats.usageLimit) * 100
    : 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-600 mt-1">Welcome back! Here's your OCR Overlay conversion overview.</p>
        </div>
        <Badge className={getPlanBadgeColor(data.stats.subscriptionStatus)}>
          <Crown className="h-4 w-4 mr-1" />
          {data.stats.subscriptionStatus.toUpperCase()} Plan
        </Badge>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Total Conversions</p>
                <p className="text-2xl font-bold text-gray-900">{data.stats.totalConversions}</p>
              </div>
              <FileText className="h-8 w-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">OCR Overlay</p>
                <p className="text-2xl font-bold text-green-600">{data.stats.ocrOverlayConversions}</p>
              </div>
              <Brain className="h-8 w-8 text-green-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Avg Quality</p>
                <p className="text-2xl font-bold text-purple-600">{data.stats.averageQualityScore}%</p>
              </div>
              <Star className="h-8 w-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Files Processed</p>
                <p className="text-2xl font-bold text-orange-600">{formatFileSize(data.stats.totalFileSize)}</p>
              </div>
              <TrendingUp className="h-8 w-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Dashboard */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Usage Overview */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5" />
                  Usage Overview
                </CardTitle>
                <CardDescription>Your current month's conversion usage</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Conversions Used</span>
                    <span>{data.stats.usageThisMonth}{data.stats.usageLimit > 0 ? ` / ${data.stats.usageLimit}` : ' (Unlimited)'}</span>
                  </div>
                  {data.stats.usageLimit > 0 && (
                    <Progress value={usagePercentage} className="h-2" />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <p className="text-lg font-bold text-blue-600">{data.stats.enhancementUsageRate}%</p>
                    <p className="text-sm text-gray-600">Enhancement Usage</p>
                  </div>
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-lg font-bold text-green-600">{data.stats.favoritePerformanceMode}</p>
                    <p className="text-sm text-gray-600">Favorite Mode</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="h-5 w-5" />
                  Recent Activity
                </CardTitle>
                <CardDescription>Your latest OCR Overlay conversions</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {data.history.slice(0, 5).map((item) => (
                    <div key={item.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{item.fileName}</p>
                        <p className="text-xs text-gray-500">
                          {formatProcessingTime(item.processingTime)} • {item.qualityMetrics.overallQuality}% quality
                        </p>
                      </div>
                      <Badge className={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4">
                  View All History
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Performance Metrics */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Performance Metrics
              </CardTitle>
              <CardDescription>OCR Overlay system performance overview</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-3xl font-bold text-blue-600">90%+</div>
                  <div className="text-sm text-gray-600">Text Accuracy</div>
                  <div className="text-xs text-gray-500 mt-1">OCR Overlay Technology</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-green-600">99%</div>
                  <div className="text-sm text-gray-600">Image Preservation</div>
                  <div className="text-xs text-gray-500 mt-1">Perfect Visual Fidelity</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-purple-600">{'<5s'}</div>
                  <div className="text-sm text-gray-600">Avg Processing</div>
                  <div className="text-xs text-gray-500 mt-1">Lightning Fast Speed</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Daily Conversions Chart */}
            <Card>
              <CardHeader>
                <CardTitle>Daily Conversions</CardTitle>
                <CardDescription>Your conversion activity over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <AreaChart data={data.analytics.conversionsPerDay}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" stroke="#3B82F6" fill="#3B82F6" fillOpacity={0.2} />
                    <Area type="monotone" dataKey="ocrOverlay" stroke="#10B981" fill="#10B981" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Performance Mode Distribution */}
            <Card>
              <CardHeader>
                <CardTitle>Performance Modes</CardTitle>
                <CardDescription>Distribution of performance mode usage</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={Object.entries(data.analytics.performanceModeDistribution).map(([mode, count]) => ({
                        name: mode,
                        value: count
                      }))}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      dataKey="value"
                      label
                    >
                      <Cell fill="#3B82F6" />
                      <Cell fill="#10B981" />
                      <Cell fill="#F59E0B" />
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Enhancement Adoption */}
          <Card>
            <CardHeader>
              <CardTitle>Enhancement Adoption</CardTitle>
              <CardDescription>Usage of Week 2 enhancement features</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-3 gap-6 text-center">
                <div>
                  <div className="text-2xl font-bold text-green-600">
                    {data.analytics.enhancementAdoption.totalWithEnhancements}
                  </div>
                  <div className="text-sm text-gray-600">With Enhancements</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-gray-600">
                    {data.analytics.enhancementAdoption.totalWithoutEnhancements}
                  </div>
                  <div className="text-sm text-gray-600">Without Enhancements</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-blue-600">
                    {data.analytics.enhancementAdoption.adoptionRate}%
                  </div>
                  <div className="text-sm text-gray-600">Adoption Rate</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* History Tab */}
        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Conversion History</CardTitle>
              <CardDescription>Complete history of your OCR Overlay conversions</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {data.history.map((item) => (
                  <div key={item.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium">{item.fileName}</h4>
                        <p className="text-sm text-gray-500">
                          {new Date(item.createdAt).toLocaleDateString()} • {formatFileSize(item.fileSize)}
                        </p>
                      </div>
                      <Badge className={getStatusColor(item.status)}>
                        {item.status}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-gray-600">Processing Time:</span>
                        <p className="font-medium">{formatProcessingTime(item.processingTime)}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Quality Score:</span>
                        <p className="font-medium">{item.qualityMetrics.overallQuality}%</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Performance Mode:</span>
                        <p className="font-medium">{item.performanceMode}</p>
                      </div>
                      <div>
                        <span className="text-gray-600">Enhancements:</span>
                        <p className="font-medium">{item.enhancementsUsed ? 'Enabled' : 'Disabled'}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                Conversion Preferences
              </CardTitle>
              <CardDescription>Configure your default OCR Overlay settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-gray-600">Settings management will be implemented in the next phase.</p>
              <Button variant="outline" className="w-full">
                <Settings className="h-4 w-4 mr-2" />
                Manage Preferences
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}