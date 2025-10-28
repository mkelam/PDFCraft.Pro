"use client"

import { useState, useEffect } from "react"
import { Quote } from "lucide-react"

interface Testimonial {
  id: number
  name: string
  location: string
  title: string
  content: string
  image: string
}

const testimonials: Testimonial[] = [
  {
    id: 0,
    name: "JENNIFER",
    location: "SAN FRANCISCO, USA",
    title: "75% LESS COST, 100% PRIVACY!",
    content: "We switched from Adobe and cut our costs by 75% while keeping all our documents private. No cloud uploads, no data harvesting - just fast, secure conversions on our terms!",
    image: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&h=100&fit=crop&crop=face"
  },
  {
    id: 1,
    name: "MICHAEL",
    location: "NEW YORK, USA",
    title: "SAVES ME HOURS EVERY WEEK!",
    content: "Converting PDFs to editable documents used to take forever. PDFLab.Pro does it in seconds with perfect quality!",
    image: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=100&h=100&fit=crop&crop=face"
  },
  {
    id: 2,
    name: "SARAH",
    location: "LONDON, UK",
    title: "INCREDIBLY ACCURATE!",
    content: "The OCR accuracy is amazing - even scanned documents convert perfectly. This is a game-changer for our team!",
    image: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=100&h=100&fit=crop&crop=face"
  },
  {
    id: 3,
    name: "DAVID",
    location: "LOS ANGELES, USA",
    title: "INCREDIBLE SPEED!",
    content: "We process client documents 10x faster than before. The quality is perfect every time.",
    image: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=100&h=100&fit=crop&crop=face"
  },
  {
    id: 4,
    name: "ANNA",
    location: "TORONTO, CA",
    title: "SECURE & RELIABLE!",
    content: "Security was our main concern, but PDFLab.Pro's encryption gives us peace of mind.",
    image: "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=100&h=100&fit=crop&crop=face"
  },
  {
    id: 5,
    name: "JAMES",
    location: "CHICAGO, USA",
    title: "GAME CHANGER!",
    content: "The ROI was immediate - we're saving 20+ hours per week on document processing.",
    image: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=100&h=100&fit=crop&crop=face"
  },
  {
    id: 6,
    name: "EMMA",
    location: "SYDNEY, AU",
    title: "PERFECT QUALITY!",
    content: "Converting PDFs to PowerPoint used to take forever. Now it's done in seconds with perfect formatting!",
    image: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=100&h=100&fit=crop&crop=face"
  }
]

export function TestimonialsCarousel() {
  return (
    <div className="py-12 -mx-6 lg:-mx-0">
      {/* Header */}
      <div className="text-center mb-8 px-6 lg:px-0">
        <h2 className="text-primary font-bold text-xl mb-1">CUSTOMER FEEDBACK</h2>
      </div>

      {/* Edge-to-Edge Conveyor Belt */}
      <div className="relative overflow-hidden w-screen -ml-[50vw] left-1/2">
        {/* Gradient overlays for edge fade effect */}
        <div className="absolute left-0 top-0 w-20 h-full bg-gradient-to-r from-background to-transparent z-10 pointer-events-none"></div>
        <div className="absolute right-0 top-0 w-20 h-full bg-gradient-to-l from-background to-transparent z-10 pointer-events-none"></div>

        {/* Continuous scrolling testimonials */}
        <div className="flex animate-scroll-left">
          {/* First set of testimonials */}
          {testimonials.map((testimonial) => (
            <div
              key={`first-${testimonial.id}`}
              className="flex-shrink-0 w-80 mx-4 p-6 rounded-lg bg-card/30 backdrop-blur-sm border border-border/20"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-primary text-sm">{testimonial.name}</div>
                  <div className="text-xs text-muted-foreground">{testimonial.location}</div>
                </div>
                <Quote className="w-4 h-4 text-primary/60 flex-shrink-0" />
              </div>

              <h3 className="font-bold text-sm mb-3 text-foreground">
                {testimonial.title}
              </h3>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {testimonial.content}
              </p>
            </div>
          ))}

          {/* Duplicate set for seamless loop */}
          {testimonials.map((testimonial) => (
            <div
              key={`second-${testimonial.id}`}
              className="flex-shrink-0 w-80 mx-4 p-6 rounded-lg bg-card/30 backdrop-blur-sm border border-border/20"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="w-12 h-12 rounded-full overflow-hidden flex-shrink-0">
                  <img
                    src={testimonial.image}
                    alt={testimonial.name}
                    className="w-full h-full object-cover"
                  />
                </div>
                <div className="flex-1">
                  <div className="font-bold text-primary text-sm">{testimonial.name}</div>
                  <div className="text-xs text-muted-foreground">{testimonial.location}</div>
                </div>
                <Quote className="w-4 h-4 text-primary/60 flex-shrink-0" />
              </div>

              <h3 className="font-bold text-sm mb-3 text-foreground">
                {testimonial.title}
              </h3>

              <p className="text-sm text-muted-foreground leading-relaxed">
                {testimonial.content}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Stats Row */}
      <div className="px-6 lg:px-0">
        <div className="grid grid-cols-3 gap-6 max-w-lg mx-auto mt-12 pt-8 border-t border-border/30">
          <div className="text-center">
            <div className="font-bold text-2xl text-primary mb-1">2.2s</div>
            <div className="text-xs text-muted-foreground">Average Speed</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-2xl text-primary mb-1">96%</div>
            <div className="text-xs text-muted-foreground">OCR Accuracy</div>
          </div>
          <div className="text-center">
            <div className="font-bold text-2xl text-primary mb-1">256-bit</div>
            <div className="text-xs text-muted-foreground">Encryption</div>
          </div>
        </div>
      </div>
    </div>
  )
}