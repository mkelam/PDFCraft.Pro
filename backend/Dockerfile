# ============================================
# PDFCraft.Pro Backend - Production Dockerfile
# Multi-stage build for optimal image size and performance
# ============================================

# ============================================
# Stage 1: Builder
# Compiles TypeScript and prepares production artifacts
# ============================================
FROM node:20-alpine AS builder

WORKDIR /app

# Install build dependencies (needed for native modules)
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev

# Copy package files
COPY package*.json ./

# Install ALL dependencies (needed for build)
RUN npm ci

# Copy source code
COPY . .

# Build TypeScript to JavaScript
RUN npm run build

# ============================================
# Stage 2: Production
# Minimal runtime environment with only production dependencies
# ============================================
FROM node:20-alpine AS production

# Install runtime dependencies only
RUN apk add --no-cache \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman \
    curl \
    bash \
    dumb-init

# Create non-root user for security
RUN addgroup -g 1001 -S pdfcraft && \
    adduser -S pdfcraft -u 1001 -G pdfcraft

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install ONLY production dependencies (no devDependencies)
RUN npm ci --only=production && npm cache clean --force

# Copy compiled code from builder stage
COPY --from=builder --chown=pdfcraft:pdfcraft /app/dist ./dist

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads /app/temp && \
    chown -R pdfcraft:pdfcraft /app

# Set environment variables
ENV NODE_ENV=production \
    PORT=3001 \
    UPLOAD_DIR=/app/uploads \
    TEMP_DIR=/app/temp \
    LOG_DIR=/app/logs \
    LIBREOFFICE_AVAILABLE=false

# Expose port
EXPOSE 3001

# Switch to non-root user
USER pdfcraft

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:3001/health || exit 1

# Use dumb-init to handle signals properly (graceful shutdown)
CMD ["dumb-init", "node", "dist/server.js"]