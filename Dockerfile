# ============================================
# ⚠️ DEPRECATED - DO NOT USE
# ============================================
# This Dockerfile is LEGACY and should NOT be used.
# It attempts to combine frontend + backend in one image (anti-pattern).
#
# Use instead:
#   - backend/Dockerfile (for backend API)
#   - Dockerfile.frontend (for Next.js frontend)
#   - docker-compose.yml (orchestrates both services)
#
# Kept for reference only. Will be removed in future cleanup.
# ============================================

# PDFCraft.Pro Docker Configuration
# Multi-stage build for production optimization

# Build stage for backend
FROM node:18-alpine AS backend-builder

# Install system dependencies for PDF processing
RUN apk add --no-cache \
    libreoffice \
    ghostscript \
    imagemagick \
    poppler-utils \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    pangomm-dev \
    libjpeg-turbo-dev \
    freetype-dev \
    python3 \
    make \
    g++

WORKDIR /app/backend

# Copy backend package files
COPY backend/package*.json ./
RUN npm ci --only=production

# Copy backend source
COPY backend/ ./

# Build TypeScript
RUN npm run build

# Production stage
FROM node:18-alpine AS production

# Install runtime dependencies
RUN apk add --no-cache \
    libreoffice \
    ghostscript \
    imagemagick \
    poppler-utils \
    cairo \
    jpeg \
    pango \
    giflib \
    pixman \
    pangomm \
    libjpeg-turbo \
    freetype \
    dumb-init

# Create app user for security
RUN addgroup -g 1001 -S nodejs && \
    adduser -S pdfcraft -u 1001

# Set working directory
WORKDIR /app

# Copy built backend from builder stage
COPY --from=backend-builder --chown=pdfcraft:nodejs /app/backend/dist ./backend/dist
COPY --from=backend-builder --chown=pdfcraft:nodejs /app/backend/node_modules ./backend/node_modules
COPY --from=backend-builder --chown=pdfcraft:nodejs /app/backend/package.json ./backend/

# Copy frontend build (assuming it's already built)
COPY --chown=pdfcraft:nodejs .next ./.next
COPY --chown=pdfcraft:nodejs public ./public
COPY --chown=pdfcraft:nodejs package.json ./

# Create necessary directories
RUN mkdir -p /app/uploads /app/temp /app/logs && \
    chown -R pdfcraft:nodejs /app/uploads /app/temp /app/logs

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV UPLOAD_DIR=/app/uploads
ENV TEMP_DIR=/app/temp
ENV LOG_DIR=/app/logs

# Expose port
EXPOSE 3001

# Switch to non-root user
USER pdfcraft

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD node backend/dist/healthcheck.js || exit 1

# Start the application
CMD ["dumb-init", "node", "backend/dist/server.js"]