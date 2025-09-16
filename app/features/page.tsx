"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import {
  Upload,
  Zap,
  Shield,
  CheckCircle,
  Clock,
  Database,
  Wifi,
  Download,
  Merge,
  BarChart3,
  ArrowLeft,
} from "lucide-react"
import { Navigation } from "@/components/Navigation"

export default function FeaturesPage() {
  return (
    <div className="min-h-screen">
      <Navigation />

      <section className="pt-32 pb-12 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center mb-8">
            <Link href="/">
              <Button variant="ghost" size="sm" className="mr-4">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Home
              </Button>
            </Link>
          </div>

          <div className="text-center mb-16">
            <h1 className="font-bold text-4xl md:text-5xl mb-6 leading-tight">Powerful PDF Features</h1>
            <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
              Comprehensive PDF processing capabilities designed for speed, security, and reliability.
            </p>
          </div>

          {/* Core PDF Features - Production Ready */}
          <div className="mb-16">
            <div className="flex items-center mb-8">
              <Badge className="bg-green-500/20 text-green-400 border-green-500/30 mr-3">Production Ready</Badge>
              <h2 className="text-2xl font-bold">Core PDF Features</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8 mb-12">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Upload className="w-5 h-5 text-primary mr-2" />
                    PDF→PowerPoint Conversion
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Upload className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium">File Upload</p>
                      <p className="text-sm text-muted-foreground">25MB limit with PDF validation</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Zap className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium">LibreOffice Engine</p>
                      <p className="text-sm text-muted-foreground">Headless conversion to PPTX format</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Clock className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Speed Target</p>
                      <p className="text-sm text-muted-foreground">&lt;5 second processing</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Database className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Queue System</p>
                      <p className="text-sm text-muted-foreground">Bull + Redis for background processing</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Wifi className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Real-time Progress</p>
                      <p className="text-sm text-muted-foreground">WebSocket updates with glassmorphic UI</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Download className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Secure Download</p>
                      <p className="text-sm text-muted-foreground">Cloudflare R2 storage with temporary URLs</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="w-5 h-5 text-primary mr-2" />
                    PDF Validation & Security
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium">File Type Validation</p>
                      <p className="text-sm text-muted-foreground">Only accepts .pdf files</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Size Limits</p>
                      <p className="text-sm text-muted-foreground">100MB configurable limit (25MB for conversions)</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Format Verification</p>
                      <p className="text-sm text-muted-foreground">MIME type checking</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Security Scanning</p>
                      <p className="text-sm text-muted-foreground">PDF integrity validation</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <CheckCircle className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Error Handling</p>
                      <p className="text-sm text-muted-foreground">Comprehensive error messages</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* PDF Features - Backend Ready, UI Integration Needed */}
          <div className="mb-16">
            <div className="flex items-center mb-8">
              <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30 mr-3">Backend Ready</Badge>
              <h2 className="text-2xl font-bold">Advanced PDF Features</h2>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Merge className="w-5 h-5 text-primary mr-2" />
                    PDF Merge
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Upload className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Multi-file Upload</p>
                      <p className="text-sm text-muted-foreground">Up to 10 PDFs at once</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Zap className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium">pdf-lib Integration</p>
                      <p className="text-sm text-muted-foreground">Fast in-memory merging</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Clock className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Speed Target</p>
                      <p className="text-sm text-muted-foreground">&lt;2 second processing</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Upload className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Page Preservation</p>
                      <p className="text-sm text-muted-foreground">Maintains all pages from source files</p>
                    </div>
                  </div>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mt-4">
                    <p className="text-sm text-yellow-400">
                      ⚠️ Frontend upload UI needs connection to /api/convert/merge
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="w-5 h-5 text-primary mr-2" />
                    PDF Processing Workflow
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-start space-x-3">
                    <Database className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Job Tracking</p>
                      <p className="text-sm text-muted-foreground">Unique job IDs with status endpoints</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <Wifi className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Progress Monitoring</p>
                      <p className="text-sm text-muted-foreground">Real-time progress updates (10% → 100%)</p>
                    </div>
                  </div>
                  <div className="flex items-start space-x-3">
                    <BarChart3 className="w-4 h-4 text-primary mt-1 flex-shrink-0" />
                    <div>
                      <p className="font-medium">Performance Metrics</p>
                      <p className="text-sm text-muted-foreground">Speed comparison vs Adobe (45s baseline)</p>
                    </div>
                  </div>
                  <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-lg p-3 mt-4">
                    <p className="text-sm text-yellow-400">⚠️ Frontend needs WebSocket integration for live updates</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Call to Action */}
          <div className="text-center">
            <Card className="glass max-w-2xl mx-auto">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold mb-4">Ready to Experience These Features?</h3>
                <p className="text-muted-foreground mb-6">
                  Join thousands of users who trust PDF Craft Pro for their document processing needs.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Link href="/signup">
                    <Button size="lg" className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      Get Started Free
                    </Button>
                  </Link>
                  <Link href="/pricing">
                    <Button variant="outline" size="lg">
                      View Pricing
                    </Button>
                  </Link>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/30 py-6 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <div className="text-sm text-muted-foreground">© 2024 PDF Craft Pro. All rights reserved.</div>
        </div>
      </footer>
    </div>
  )
}
