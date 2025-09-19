# Use Node.js 18 LTS Alpine image for smaller size
FROM node:18-alpine

# Install LibreOffice and other dependencies
RUN apk update && apk add --no-cache \
    libreoffice \
    font-liberation \
    font-noto \
    font-noto-cjk \
    font-noto-extra \
    ttf-dejavu \
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

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy source code
COPY . .

# Build the application
RUN npm run build

# Create necessary directories
RUN mkdir -p /app/logs /app/uploads /app/temp && \
    chown -R pdfcraft:pdfcraft /app

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001
ENV UPLOAD_DIR=/app/uploads
ENV TEMP_DIR=/app/temp
ENV LOG_DIR=/app/logs
ENV LIBREOFFICE_PATH=/usr/bin/libreoffice
ENV LIBREOFFICE_AVAILABLE=true

# Expose port
EXPOSE 3001

# Switch to non-root user
USER pdfcraft

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Start the application
CMD ["npm", "start"]