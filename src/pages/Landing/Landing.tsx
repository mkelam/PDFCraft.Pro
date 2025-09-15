import React from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Zap, Shield, Globe, ChevronDown } from 'lucide-react'

const Landing: React.FC = () => {
  const features = [
    {
      icon: Zap,
      title: '10x Faster',
      description: 'Process PDFs in under 6 seconds. Adobe takes 45+ seconds.'
    },
    {
      icon: Shield,
      title: 'Enterprise Secure',
      description: 'SOC 2 compliant with end-to-end encryption.'
    },
    {
      icon: Globe,
      title: 'Global Scale',
      description: 'Distributed infrastructure serving 50M+ requests monthly.'
    }
  ]

  const stats = [
    { value: '50M+', label: 'API Calls Monthly' },
    { value: '99.9%', label: 'Uptime SLA' },
    { value: '<100ms', label: 'Response Time' },
    { value: '10K+', label: 'Developers' }
  ]

  return (
    <div className="min-h-screen bg-[var(--color-bg-primary)] text-[var(--color-text-primary)]">
      {/* Navigation */}
      <nav className="border-b border-[var(--color-border-primary)]">
        <div className="premium-container">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-white rounded-md flex items-center justify-center">
                <span className="text-black font-bold text-sm">P</span>
              </div>
              <span className="text-xl font-semibold">PDF</span>
            </div>

            {/* Navigation Links */}
            <div className="hidden md:flex items-center space-x-8">
              <a href="/developers" className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors">
                Developers
              </a>
              <a href="/performance" className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors">
                Performance
              </a>
              <a href="/pricing" className="text-[var(--color-text-tertiary)] hover:text-[var(--color-text-primary)] transition-colors">
                Pricing
              </a>
            </div>

            {/* CTA */}
            <div className="flex items-center space-x-4">
              <a href="/login" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
                Sign In
              </a>
              <a
                href="/dashboard"
                className="premium-button premium-button-primary"
              >
                Get Started
                <ArrowRight className="w-4 h-4 ml-2" />
              </a>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="premium-section">
        <div className="premium-container text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="max-w-4xl mx-auto"
          >
            {/* Badge */}
            <div className="inline-flex items-center px-4 py-2 rounded-full bg-[var(--color-bg-tertiary)] border border-[var(--color-border-primary)] mb-8">
              <span className="text-[var(--color-text-tertiary)] text-sm">
                Trusted by 10,000+ developers worldwide
              </span>
            </div>

            {/* Main Headline */}
            <h1 className="text-display text-6xl md:text-7xl lg:text-8xl mb-6 tracking-tight">
              PDF Processing
              <br />
              <span className="text-[var(--color-text-secondary)]">Reimagined</span>
            </h1>

            {/* Subheadline */}
            <p className="text-body text-xl md:text-2xl text-[var(--color-text-tertiary)] mb-12 max-w-2xl mx-auto leading-relaxed">
              The fastest PDF API in the world. Process documents 10x faster than Adobe
              with enterprise-grade security and global scale.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
              <a
                href="/dashboard"
                className="premium-button premium-button-primary text-base px-8 py-4"
              >
                Start Building
                <ArrowRight className="w-5 h-5 ml-2" />
              </a>
              <a
                href="/developers"
                className="premium-button premium-button-secondary text-base px-8 py-4"
              >
                View Documentation
              </a>
            </div>

            {/* Performance Indicator */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-flex items-center space-x-8 p-6 rounded-2xl bg-[var(--color-bg-secondary)] border border-[var(--color-border-primary)]"
            >
              <div className="text-center">
                <div className="text-3xl font-bold text-white mb-1">6s</div>
                <div className="text-sm text-[var(--color-text-tertiary)]">Our API</div>
              </div>
              <div className="text-[var(--color-text-tertiary)]">vs</div>
              <div className="text-center">
                <div className="text-3xl font-bold text-[var(--color-text-tertiary)] mb-1">45s</div>
                <div className="text-sm text-[var(--color-text-tertiary)]">Adobe</div>
              </div>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="premium-section border-t border-[var(--color-border-primary)]">
        <div className="premium-container">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="text-3xl md:text-4xl font-bold text-white mb-2">
                  {stat.value}
                </div>
                <div className="text-[var(--color-text-tertiary)] text-sm">
                  {stat.label}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="premium-section">
        <div className="premium-container">
          <div className="text-center mb-20">
            <h2 className="text-display text-4xl md:text-5xl mb-6">
              Built for Scale
            </h2>
            <p className="text-body text-xl text-[var(--color-text-tertiary)] max-w-2xl mx-auto">
              Enterprise-grade infrastructure designed for mission-critical applications.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, index) => {
              const Icon = feature.icon
              return (
                <motion.div
                  key={feature.title}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.6, delay: index * 0.1 }}
                  className="premium-card text-center"
                >
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center mx-auto mb-6">
                    <Icon className="w-6 h-6 text-black" />
                  </div>
                  <h3 className="text-xl font-semibold mb-4 text-white">
                    {feature.title}
                  </h3>
                  <p className="text-[var(--color-text-tertiary)] leading-relaxed">
                    {feature.description}
                  </p>
                </motion.div>
              )
            })}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="premium-section border-t border-[var(--color-border-primary)]">
        <div className="premium-container text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-display text-4xl md:text-5xl mb-6">
              Ready to Build?
            </h2>
            <p className="text-body text-xl text-[var(--color-text-tertiary)] mb-8">
              Join thousands of developers using the fastest PDF API in production.
            </p>
            <a
              href="/dashboard"
              className="premium-button premium-button-primary text-lg px-10 py-5 inline-flex items-center"
            >
              Start Free Trial
              <ArrowRight className="w-5 h-5 ml-2" />
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-[var(--color-border-primary)] py-12">
        <div className="premium-container">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-3 mb-4 md:mb-0">
              <div className="w-6 h-6 bg-white rounded flex items-center justify-center">
                <span className="text-black font-bold text-xs">P</span>
              </div>
              <span className="text-lg font-semibold">PDF</span>
            </div>
            <div className="text-[var(--color-text-tertiary)] text-sm">
              © 2024 PDF API. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing