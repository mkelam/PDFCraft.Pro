# BMAD Configuration Management Protocol (BCMP)
## Preventing API Endpoint Configuration Drift

### Problem Statement
**Root Cause**: Frontend API_BASE_URL hardcoded to `localhost:3010` while backend runs on `3001`
**Impact**: "Failed to fetch" errors, broken functionality, development time loss
**Classification**: Configuration Drift Anti-Pattern

---

## Protocol Implementation

### 1. CENTRALIZED CONFIGURATION PROTOCOL

#### 1.1 Shared Configuration File
```typescript
// config/shared.config.ts
export const SHARED_CONFIG = {
  development: {
    BACKEND_PORT: 3001,
    FRONTEND_PORT: 3000,
    API_BASE_URL: 'http://localhost:3001',
    CORS_ORIGINS: ['http://localhost:3000']
  },
  production: {
    BACKEND_PORT: 8080,
    FRONTEND_PORT: 80,
    API_BASE_URL: 'https://api.pdflab.pro',
    CORS_ORIGINS: ['https://pdflab.pro']
  }
}
```

#### 1.2 Environment-Based Auto-Detection
```typescript
// lib/config.ts
const detectEnvironment = (): 'development' | 'production' => {
  return process.env.NODE_ENV === 'production' ? 'production' : 'development'
}

export const CONFIG = SHARED_CONFIG[detectEnvironment()]
```

### 2. SERVICE DISCOVERY PROTOCOL

#### 2.1 Health Check Integration
```typescript
// lib/api.ts
class APIConfig {
  private static async discoverBackend(): Promise<string> {
    const possiblePorts = [3001, 3010, 8080, 8000]

    for (const port of possiblePorts) {
      try {
        const url = `http://localhost:${port}`
        const response = await fetch(`${url}/health`, { timeout: 2000 })
        if (response.ok) {
          console.log(`✅ Backend discovered at ${url}`)
          return url
        }
      } catch (error) {
        continue
      }
    }

    throw new Error('Backend service not found - check if backend is running')
  }

  static async getApiBaseUrl(): Promise<string> {
    if (process.env.NEXT_PUBLIC_API_URL) {
      return process.env.NEXT_PUBLIC_API_URL
    }

    return await this.discoverBackend()
  }
}
```

### 3. DEVELOPMENT ENVIRONMENT STANDARDIZATION

#### 3.1 Port Convention Protocol
```yaml
# .bmad/port-allocation.yml
services:
  frontend: 3000
  backend: 3001
  database: 3306
  redis: 6379
  test-server: 3002

reserved_ports:
  - 3000-3010  # Development services
  - 8000-8080  # Production proxies
```

#### 3.2 Docker Compose Standardization
```yaml
# docker-compose.dev.yml
version: '3.8'
services:
  frontend:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_API_URL=http://backend:3001

  backend:
    build: ./backend
    ports:
      - "3001:3001"
    environment:
      - PORT=3001
      - CORS_ORIGIN=http://frontend:3000
```

### 4. VALIDATION PROTOCOL

#### 4.1 Startup Connectivity Validation
```typescript
// scripts/validate-environment.ts
export class EnvironmentValidator {
  static async validateConnectivity(): Promise<void> {
    console.log('🔍 BMAD Environment Validation...')

    // 1. Check backend availability
    const backendUrl = await APIConfig.getApiBaseUrl()
    const healthResponse = await fetch(`${backendUrl}/health`)

    if (!healthResponse.ok) {
      throw new Error(`❌ Backend health check failed: ${backendUrl}`)
    }

    // 2. Validate CORS configuration
    const corsTest = await fetch(`${backendUrl}/health`, {
      method: 'OPTIONS',
      headers: { 'Origin': 'http://localhost:3000' }
    })

    if (!corsTest.ok) {
      throw new Error('❌ CORS configuration invalid')
    }

    console.log('✅ Environment validation passed')
  }
}
```

#### 4.2 Pre-Build Validation Hook
```json
// package.json
{
  "scripts": {
    "predev": "tsx scripts/validate-environment.ts",
    "dev": "next dev",
    "prebuild": "tsx scripts/validate-environment.ts"
  }
}
```

### 5. CONFIGURATION MONITORING PROTOCOL

#### 5.1 Runtime Configuration Drift Detection
```typescript
// lib/config-monitor.ts
export class ConfigurationMonitor {
  private static lastKnownConfig: string = ''

  static startMonitoring(): void {
    setInterval(async () => {
      try {
        const currentConfig = JSON.stringify(CONFIG)

        if (this.lastKnownConfig && this.lastKnownConfig !== currentConfig) {
          console.warn('⚠️ Configuration drift detected!')
          console.log('Previous:', this.lastKnownConfig)
          console.log('Current:', currentConfig)
        }

        this.lastKnownConfig = currentConfig
      } catch (error) {
        console.error('Configuration monitoring error:', error)
      }
    }, 30000) // Check every 30 seconds
  }
}
```

### 6. DEVELOPMENT WORKFLOW PROTOCOL

#### 6.1 Standardized Development Scripts
```bash
#!/bin/bash
# scripts/start-dev.sh

echo "🚀 Starting BMAD Development Environment..."

# 1. Validate ports are available
echo "📋 Checking port availability..."
if lsof -Pi :3000 -sTCP:LISTEN -t >/dev/null ; then
    echo "❌ Port 3000 is already in use"
    exit 1
fi

if lsof -Pi :3001 -sTCP:LISTEN -t >/dev/null ; then
    echo "❌ Port 3001 is already in use"
    exit 1
fi

# 2. Start backend first
echo "🔧 Starting backend on port 3001..."
cd backend && PORT=3001 npm run dev &
BACKEND_PID=$!

# 3. Wait for backend health check
echo "⏳ Waiting for backend to be ready..."
while ! curl -s http://localhost:3001/health > /dev/null; do
    sleep 1
done

# 4. Start frontend
echo "🎨 Starting frontend on port 3000..."
cd .. && npm run dev &
FRONTEND_PID=$!

echo "✅ Development environment started successfully!"
echo "Frontend: http://localhost:3000"
echo "Backend:  http://localhost:3001"
echo "Backend PID: $BACKEND_PID"
echo "Frontend PID: $FRONTEND_PID"
```

### 7. IMPLEMENTATION CHECKLIST

#### Phase 1: Immediate (1 hour)
- [ ] Create shared configuration file
- [ ] Update API configuration to use shared config
- [ ] Add environment validation script
- [ ] Update development scripts

#### Phase 2: Short-term (1 day)
- [ ] Implement service discovery
- [ ] Add Docker compose standardization
- [ ] Create port allocation documentation
- [ ] Add pre-build validation hooks

#### Phase 3: Long-term (1 week)
- [ ] Configuration monitoring system
- [ ] Automated environment setup
- [ ] Integration with CI/CD pipeline
- [ ] Configuration audit logging

### 8. ENFORCEMENT PROTOCOL

#### 8.1 Code Review Checklist
- [ ] No hardcoded URLs in frontend code
- [ ] Environment variables properly configured
- [ ] Health checks validate connectivity
- [ ] Docker compose ports match shared config

#### 8.2 Automated Validation
```yaml
# .github/workflows/config-validation.yml
name: BMAD Configuration Validation
on: [push, pull_request]
jobs:
  validate-config:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - run: npm install
      - run: npm run validate-environment
      - run: npm run test-connectivity
```

### 9. RECOVERY PROTOCOL

#### When Configuration Drift Occurs:
1. **Immediate Action**: Check shared configuration file
2. **Validation**: Run environment validation script
3. **Correction**: Update misconfigured components
4. **Verification**: Run connectivity tests
5. **Documentation**: Update incident log

### 10. SUCCESS METRICS

- **Zero** hardcoded API URLs in production code
- **100%** environment validation pass rate
- **< 30 seconds** development environment startup
- **Zero** configuration-related production incidents

---

## Implementation Priority: CRITICAL
**Status**: Ready for immediate implementation
**Effort**: 4 hours total (across all phases)
**Impact**: Eliminates entire class of configuration bugs

*This protocol prevents configuration drift permanently and scales across all BMAD projects.*