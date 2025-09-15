"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, FileText, Shield, Zap, CheckCircle, ArrowRight } from "lucide-react"

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
      <nav className="fixed top-0 left-0 right-0 z-50 glass-nav">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
                <FileText className="w-4 h-4 text-primary" />
              </div>
              <span className="font-semibold text-lg">PDF Craft Pro</span>
            </div>

            <div className="hidden md:flex items-center space-x-6">
              <Button variant="ghost" size="sm" className="text-sm">
                Features
              </Button>
              <Button variant="ghost" size="sm" className="text-sm">
                Pricing
              </Button>
              <Button variant="ghost" size="sm" className="text-sm">
                Sign in
              </Button>
            </div>

            {/* Mobile menu button for smaller screens */}
            <Button variant="ghost" size="sm" className="text-sm md:hidden">
              Sign in
            </Button>
          </div>
        </div>
      </nav>

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

      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8">
            <Card className="glass text-center">
              <CardContent className="p-6">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Zap className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Fast</h3>
                <p className="text-sm text-muted-foreground">Convert in seconds</p>
              </CardContent>
            </Card>

            <Card className="glass text-center">
              <CardContent className="p-6">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <Shield className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Secure</h3>
                <p className="text-sm text-muted-foreground">256-bit encryption</p>
              </CardContent>
            </Card>

            <Card className="glass text-center">
              <CardContent className="p-6">
                <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-5 h-5 text-primary" />
                </div>
                <h3 className="font-semibold mb-2">Quality</h3>
                <p className="text-sm text-muted-foreground">Perfect results</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-20 px-6">
        <div className="max-w-2xl mx-auto text-center">
          <Card className="glass">
            <CardContent className="p-8">
              <h2 className="font-bold text-3xl mb-4">Ready to start?</h2>
              <p className="text-muted-foreground mb-6">Join thousands of users converting PDFs daily.</p>
              <Button className="bg-primary hover:bg-primary/90">
                Get started <ArrowRight className="ml-2 w-4 h-4" />
              </Button>
            </CardContent>
          </Card>
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
