"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, Zap, Shield, CheckCircle } from "lucide-react"
import { Navigation } from "@/components/Navigation"

export default function PDFCraftPro() {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)

  const handleFileUpload = () => {
    setIsProcessing(true)
    setProgress(0)

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setTimeout(() => {
            setIsProcessing(false)
            setProgress(0)
          }, 500)
          return 100
        }
        return prev + 20
      })
    }, 1000)
  }

  return (
    <div className="min-h-screen">
      <Navigation />

      <section className="pt-32 pb-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-bold text-5xl md:text-6xl mb-6 leading-tight">
            Convert PDFs
            <br />
            <span className="text-primary">instantly</span>
          </h1>

          <p className="text-lg text-muted-foreground max-w-2xl mx-auto mb-12">
            Fast, secure PDF conversion. No subscriptions, no limits.
          </p>

          <Card className="glass max-w-2xl mx-auto mb-16">
            <CardContent className="p-8">
              <div className="text-center cursor-pointer py-8" onClick={handleFileUpload}>
                <div className="w-12 h-12 mx-auto mb-4 bg-primary/10 rounded-xl flex items-center justify-center">
                  <Upload className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-semibold text-xl mb-2">Drop your PDF here</h3>
                <p className="text-sm text-muted-foreground">Maximum 100MB</p>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto">
            <div className="text-center">
              <div className="font-bold text-2xl text-primary mb-1">4.8s</div>
              <div className="text-xs text-muted-foreground">Average</div>
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

      {/* Processing Modal */}
      {isProcessing && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <Card className="glass-strong max-w-sm w-full mx-4">
            <CardContent className="p-6 text-center">
              <div className="flex justify-center space-x-1 mb-4">
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.2s" }} />
                <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0.4s" }} />
              </div>
              <h3 className="font-semibold mb-2">Converting...</h3>
              <div className="w-full bg-muted rounded-full h-1">
                <div
                  className="bg-primary h-1 rounded-full transition-all duration-1000"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  )
}
