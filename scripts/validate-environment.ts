#!/usr/bin/env tsx

/**
 * BMAD Environment Validation Script
 * Prevents configuration drift by validating service connectivity
 * Run before development/build to catch issues early
 */

import { CONFIG, validateConfig } from '../config/shared.config'

interface ValidationResult {
  service: string
  status: 'pass' | 'fail' | 'warning'
  message: string
  details?: any
}

class EnvironmentValidator {
  private results: ValidationResult[] = []

  private addResult(service: string, status: 'pass' | 'fail' | 'warning', message: string, details?: any): void {
    this.results.push({ service, status, message, details })
  }

  /**
   * Validate shared configuration integrity
   */
  private validateSharedConfig(): void {
    try {
      validateConfig(CONFIG)
      this.addResult('Config', 'pass', 'Shared configuration validated successfully')
    } catch (error) {
      this.addResult('Config', 'fail', `Configuration validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Check if backend service is available
   */
  private async validateBackendConnectivity(): Promise<void> {
    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Timeout after 5 seconds')), 5000)
      )

      const fetchPromise = fetch(`${CONFIG.API_BASE_URL}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(5000)
      })

      const response = await Promise.race([fetchPromise, timeoutPromise]) as Response

      if (!response.ok) {
        this.addResult('Backend', 'fail', `Backend health check failed: HTTP ${response.status}`, {
          url: `${CONFIG.API_BASE_URL}/health`,
          status: response.status
        })
        return
      }

      const healthData = await response.json()

      this.addResult('Backend', 'pass', `Backend service available at ${CONFIG.API_BASE_URL}`, {
        health: healthData.status,
        services: healthData.services
      })

    } catch (error) {
      this.addResult('Backend', 'fail', `Backend service unavailable: ${error instanceof Error ? error.message : 'Unknown error'}`, {
        url: `${CONFIG.API_BASE_URL}/health`,
        expectedPort: CONFIG.BACKEND_PORT
      })
    }
  }

  /**
   * Validate CORS configuration
   */
  private async validateCorsConfiguration(): Promise<void> {
    try {
      const frontendOrigin = `http://localhost:${CONFIG.FRONTEND_PORT}`

      const response = await fetch(`${CONFIG.API_BASE_URL}/health`, {
        method: 'OPTIONS',
        headers: {
          'Origin': frontendOrigin,
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type'
        }
      })

      const corsHeader = response.headers.get('Access-Control-Allow-Origin')

      if (corsHeader === frontendOrigin || corsHeader === '*') {
        this.addResult('CORS', 'pass', `CORS configured correctly for ${frontendOrigin}`)
      } else {
        this.addResult('CORS', 'warning', `CORS may not be configured for ${frontendOrigin}`, {
          received: corsHeader,
          expected: frontendOrigin,
          configuredOrigins: CONFIG.CORS_ORIGINS
        })
      }

    } catch (error) {
      this.addResult('CORS', 'fail', `CORS validation failed: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }

  /**
   * Check port availability
   */
  private async validatePortAvailability(): Promise<void> {
    const ports = [
      { port: CONFIG.FRONTEND_PORT, service: 'Frontend' },
      { port: CONFIG.BACKEND_PORT, service: 'Backend' }
    ]

    for (const { port, service } of ports) {
      try {
        const response = await fetch(`http://localhost:${port}/health`, {
          signal: AbortSignal.timeout(2000)
        })

        if (response.ok) {
          this.addResult('Ports', 'pass', `${service} service responding on port ${port}`)
        } else {
          this.addResult('Ports', 'warning', `${service} port ${port} responding but with non-200 status`)
        }
      } catch (error) {
        this.addResult('Ports', 'warning', `${service} port ${port} not responding (service may not be started)`)
      }
    }
  }

  /**
   * Run all validations
   */
  async validate(): Promise<boolean> {
    console.log('🔍 BMAD Environment Validation Starting...')
    console.log('=' .repeat(50))

    // Validate configuration first
    this.validateSharedConfig()

    // Only proceed with network checks if config is valid
    const configValid = this.results.every(r => r.service !== 'Config' || r.status !== 'fail')

    if (configValid) {
      await Promise.all([
        this.validateBackendConnectivity(),
        this.validateCorsConfiguration(),
        this.validatePortAvailability()
      ])
    }

    return this.reportResults()
  }

  /**
   * Report validation results
   */
  private reportResults(): boolean {
    const passed = this.results.filter(r => r.status === 'pass').length
    const warnings = this.results.filter(r => r.status === 'warning').length
    const failed = this.results.filter(r => r.status === 'fail').length

    console.log('\n📊 Validation Results:')
    console.log('-' .repeat(30))

    // Group results by status
    const statusGroups = {
      pass: this.results.filter(r => r.status === 'pass'),
      warning: this.results.filter(r => r.status === 'warning'),
      fail: this.results.filter(r => r.status === 'fail')
    }

    // Display results
    for (const result of statusGroups.pass) {
      console.log(`✅ ${result.service}: ${result.message}`)
    }

    for (const result of statusGroups.warning) {
      console.log(`⚠️  ${result.service}: ${result.message}`)
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`)
      }
    }

    for (const result of statusGroups.fail) {
      console.log(`❌ ${result.service}: ${result.message}`)
      if (result.details) {
        console.log(`   Details: ${JSON.stringify(result.details, null, 2)}`)
      }
    }

    console.log('\n' + '=' .repeat(50))
    console.log(`📈 Summary: ${passed} passed, ${warnings} warnings, ${failed} failed`)

    if (failed > 0) {
      console.log('❌ Environment validation FAILED - fix critical issues before proceeding')
      return false
    }

    if (warnings > 0) {
      console.log('⚠️  Environment validation PASSED with warnings - review recommendations')
    } else {
      console.log('✅ Environment validation PASSED - all systems ready!')
    }

    return true
  }
}

/**
 * Main execution
 */
async function main(): Promise<void> {
  const validator = new EnvironmentValidator()
  const success = await validator.validate()

  if (!success) {
    process.exit(1)
  }

  console.log('\n🎉 BMAD Environment Validation Complete!')
}

// Run validation if script is executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Validation script failed:', error)
    process.exit(1)
  })
}

export { EnvironmentValidator }