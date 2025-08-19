# Stage 1: Build the React client
FROM node:18-alpine AS builder

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
COPY tsconfig.json ./

# Install dependencies
RUN npm install

# Copy source files
COPY public/ ./public
COPY src/ ./src

# Build the React app
RUN npm run build

# Stage 2: Setup the server
FROM node:18-alpine

WORKDIR /app

# Copy package files first for better layer caching
COPY package*.json ./
COPY server.js ./
COPY electron-builder.yml ./

# Install production dependencies and serve
RUN npm install --production
RUN npm install -g serve

# Copy built client from builder stage
COPY --from=builder /app/build ./build

# Create directory for user data
RUN mkdir -p /app/userData

# Expose server port
EXPOSE 13001

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD wget --no-verbose --tries=1 --spider http://localhost:13001/api/health || exit 1

# Start command
CMD ["node", "server.js"]
