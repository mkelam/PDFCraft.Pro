"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Upload, Zap, Shield, CheckCircle } from "lucide-react"
import { Navigation } from "@/components/Navigation"
import { PDFUpload } from "@/components/PDFUpload"
import { UnifiedConversionInterface } from "@/components/UnifiedConversionInterface"
import { TestimonialsCarousel } from "@/components/TestimonialsCarousel"

export default function pdflabPro() {
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

      <section className="pt-24 pb-12 px-6">
        <div className="max-w-6xl mx-auto text-center">
          <h1 className="font-bold text-3xl md:text-4xl mb-4 leading-tight">
            Convert & Merge PDFs Into Editable Office Files
            <br />
            <span className="text-primary text-lg md:text-2xl">PowerPoint • Word • Excel | Under 5 Seconds</span>
          </h1>


          {/* Performance Guarantees & Trust Signals */}
          <div className="flex justify-center gap-3 lg:gap-6 mb-6 text-xs lg:text-sm">
            <div className="flex items-center gap-1 lg:gap-2 px-2 lg:px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Shield className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
              <span className="text-white font-medium whitespace-nowrap">Privacy First</span>
            </div>
            <div className="flex items-center gap-1 lg:gap-2 px-2 lg:px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <Zap className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
              <span className="text-white font-medium whitespace-nowrap">4.7x faster than Adobe</span>
            </div>
            <div className="flex items-center gap-1 lg:gap-2 px-2 lg:px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
              <CheckCircle className="w-3 h-3 lg:w-4 lg:h-4 text-white" />
              <span className="text-white font-medium whitespace-nowrap">96% OCR accuracy</span>
            </div>
          </div>


          {/* Unified Conversion Interface */}
          <div className="mb-16">
            <UnifiedConversionInterface
              onSuccess={handleUploadSuccess}
              onError={handleUploadError}
            />
          </div>

          {/* Client Testimonials Carousel */}
          <div className="w-full">
            <TestimonialsCarousel />
          </div>

        </div>
      </section>

      <footer className="border-t border-border/30 py-6 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="text-sm text-muted-foreground">© 2024 PDFLab.Pro. All rights reserved.</div>
        </div>
      </footer>

    </div>
  )
}
