"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Check, Zap, Shield, Infinity } from "lucide-react"
import { Navigation } from "@/components/Navigation"

const pricingPlans = [
  {
    name: "Starter",
    price: "Free",
    description: "Perfect for occasional PDF tasks",
    icon: <Zap className="w-6 h-6" />,
    features: [
      "5 conversions per month",
      "Basic file formats",
      "Standard processing speed",
      "Email support",
      "10MB file size limit",
    ],
    buttonText: "Get Started",
    buttonVariant: "outline" as const,
    popular: false,
  },
  {
    name: "Professional",
    price: "$9.99",
    period: "/month",
    description: "Ideal for professionals and small teams",
    icon: <Shield className="w-6 h-6" />,
    features: [
      "Unlimited conversions",
      "All file formats",
      "Priority processing",
      "Priority support",
      "100MB file size limit",
      "Batch processing",
      "API access",
    ],
    buttonText: "Start Free Trial",
    buttonVariant: "default" as const,
    popular: true,
  },
  {
    name: "Enterprise",
    price: "$29.99",
    period: "/month",
    description: "Advanced features for large organizations",
    icon: <Infinity className="w-6 h-6" />,
    features: [
      "Everything in Professional",
      "Custom integrations",
      "Dedicated support",
      "SLA guarantee",
      "1GB file size limit",
      "White-label options",
      "Advanced analytics",
      "Team management",
    ],
    buttonText: "Contact Sales",
    buttonVariant: "outline" as const,
    popular: false,
  },
]

export default function PricingPage() {
  return (
    <div className="min-h-screen">
      <Navigation />

      <div className="pt-32 pb-12 px-6">
        <div className="container mx-auto max-w-7xl">
          {/* Header */}
          <div className="text-center mb-16">
            <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">Choose Your Plan</h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Transform your PDF workflow with our powerful conversion tools. Start free and upgrade as you grow.
            </p>
          </div>

          {/* Pricing cards */}
          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {pricingPlans.map((plan, index) => (
              <Card
                key={plan.name}
                className={`glass-strong border-border/50 relative transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:shadow-primary/10 ${
                  plan.popular ? "ring-2 ring-primary/50" : ""
                }`}
              >
                {plan.popular && (
                  <Badge className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground px-4 py-1">
                    Most Popular
                  </Badge>
                )}

                <CardHeader className="text-center pb-8">
                  <div className="flex justify-center mb-4">
                    <div className="p-3 rounded-full bg-primary/10 text-primary">{plan.icon}</div>
                  </div>
                  <CardTitle className="text-2xl font-bold text-foreground">{plan.name}</CardTitle>
                  <CardDescription className="text-muted-foreground">{plan.description}</CardDescription>
                  <div className="mt-4">
                    <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                    {plan.period && <span className="text-muted-foreground">{plan.period}</span>}
                  </div>
                </CardHeader>

                <CardContent className="space-y-6">
                  <ul className="space-y-3">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                        <span className="text-foreground">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    variant={plan.buttonVariant}
                    className={`w-full py-2.5 font-medium transition-all duration-200 ${
                      plan.buttonVariant === "default"
                        ? "bg-primary hover:bg-primary/90 text-primary-foreground hover:shadow-lg hover:shadow-primary/20"
                        : "glass-subtle border-primary/50 text-primary hover:bg-primary/10"
                    }`}
                  >
                    {plan.buttonText}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* FAQ Section */}
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl font-bold text-center text-foreground mb-8">Frequently Asked Questions</h2>

            <div className="space-y-6">
              <Card className="glass-subtle border-border/40">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">Can I change my plan anytime?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Yes, you can upgrade or downgrade your plan at any time. Changes take effect immediately, and we'll
                    prorate any billing adjustments.
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-subtle border-border/40">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">Is there a free trial for paid plans?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    Yes, we offer a 14-day free trial for the Professional plan. No credit card required to start.
                  </p>
                </CardContent>
              </Card>

              <Card className="glass-subtle border-border/40">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground">What file formats do you support?</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground">
                    We support all major document formats including PDF, Word, Excel, PowerPoint, images (JPG, PNG,
                    TIFF), and many more. Professional and Enterprise plans include access to all formats.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* CTA Section */}
          <div className="text-center mt-16">
            <Card className="glass-strong border-border/50 max-w-2xl mx-auto">
              <CardContent className="p-8">
                <h3 className="text-2xl font-bold text-foreground mb-4">Ready to get started?</h3>
                <p className="text-muted-foreground mb-6">
                  Join thousands of professionals who trust PDF Craft Pro for their document conversion needs.
                </p>
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  <Button
                    size="lg"
                    className="bg-primary hover:bg-primary/90 text-primary-foreground font-medium transition-all duration-200 hover:shadow-lg hover:shadow-primary/20"
                  >
                    Start Free Trial
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    className="glass-subtle border-primary/50 text-primary hover:bg-primary/10 bg-transparent"
                  >
                    Contact Sales
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
