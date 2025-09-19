"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, Zap, Shield, CheckCircle } from "lucide-react"
import { Navigation } from "@/components/Navigation"
import { PDFUpload } from "@/components/PDFUpload"

export default function PDFCraftPro() {
  const [uploadResult, setUploadResult] = useState(null)
  const [uploadError, setUploadError] = useState("")

  const handleUploadSuccess = (result) => {
    setUploadResult(result)
    setUploadError("")
  }

  const handleUploadError = (error) => {
    setUploadError(error)
    setUploadResult(null)
  }

  return (
    <div className="min-h-screen">
      <Navigation />

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="font-bold text-5xl md:text-6xl mb-6 leading-tight">
            Convert & Merge PDFs
            <br />
            <span className="text-primary">instantly</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12">
            Fast, secure PDF processing. Convert to PowerPoint or merge multiple PDFs.
          </p>

          {/* Two Column Layout for Both Features */}
          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-16">

            {/* PDF to PowerPoint Conversion */}
            <div className="space-y-4">
              <PDFUpload
                mode="convert"
                onSuccess={handleUploadSuccess}
                onError={handleUploadError}
              />
            </div>

            {/* PDF Merging */}
            <div className="space-y-4">
              <PDFUpload
                mode="merge"
                onSuccess={handleUploadSuccess}
                onError={handleUploadError}
              />
            </div>
          </div>

          {/* Stats Section */}
          <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
            <div className="text-center">
              <div className="font-bold text-2xl text-primary mb-1">4.8s</div>
              <div className="text-xs text-muted-foreground">Average Speed</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-2xl text-primary mb-1">100%</div>
              <div className="text-xs text-muted-foreground">Accuracy</div>
            </div>
            <div className="text-center">
              <div className="font-bold text-2xl text-primary mb-1">256-bit</div>
              <div className="text-xs text-muted-foreground">Secure</div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose PDF Craft Pro? */}
      <section id="features" className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Why Choose PDF Craft Pro?</h2>
            <p className="text-muted-foreground">Experience the difference with our premium features</p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="glass text-center">
              <CardContent className="p-6">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Lightning Fast</h3>
                <p className="text-sm text-muted-foreground">Convert PDFs in under 5 seconds</p>
              </CardContent>
            </Card>

            <Card className="glass text-center">
              <CardContent className="p-6">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Bank-Level Security</h3>
                <p className="text-sm text-muted-foreground">256-bit encryption & validation</p>
              </CardContent>
            </Card>

            <Card className="glass text-center">
              <CardContent className="p-6">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Perfect Quality</h3>
                <p className="text-sm text-muted-foreground">100% accuracy guaranteed</p>
              </CardContent>
            </Card>
          </div>

          <div className="text-center mt-8">
            <Link href="/features">
              <Button variant="outline" size="lg">
                View All Features
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/30 py-6 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-sm text-muted-foreground">© 2024 PDF Craft Pro. All rights reserved.</div>
        </div>
      </footer>

    </div>
  )
}
