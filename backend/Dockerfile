# Use Node.js 20 LTS Alpine image for smaller size
FROM node:20-alpine

# Install minimal runtime dependencies
# Note: Using CloudConvert for PDF conversions, so LibreOffice not needed
# Cairo dependencies needed for canvas package (legacy services)
RUN apk update && apk add --no-cache \
    python3 \
    py3-pip \
    make \
    g++ \
    cairo-dev \
    jpeg-dev \
    pango-dev \
    giflib-dev \
    pixman-dev \
    curl \
    bash \
    && rm -rf /var/cache/apk/*

# Create app directory
WORKDIR /app

# Create non-root user for security
RUN addgroup -g 1001 -S pdfcraft && \
    adduser -S pdfcraft -u 1001 -G pdfcraft

# Copy package files
COPY package*.json ./

# Install ALL dependencies (including devDependencies for ts-node and types)
RUN npm ci && npm cache clean --force

# Copy source code
COPY . .

# No build step needed - we'll use ts-node at runtime like local development

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads /app/temp && \
    chown -R pdfcraft:pdfcraft /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV UPLOAD_DIR=/app/uploads
ENV TEMP_DIR=/app/temp
ENV LOG_DIR=/app/logs
ENV LIBREOFFICE_AVAILABLE=false

# Expose port
EXPOSE 3001

# Switch to non-root user
USER pdfcraft

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the application with ts-node (same as local development)
CMD ["npx", "ts-node", "--transpile-only", "src/server.ts"]