# Frontend Dockerfile
FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Expose port
EXPOSE 3000

# Start Next.js in development mode
# Next.js 15 will bind to 0.0.0.0 by default in Docker
CMD ["sh", "-c", "npm run dev -- -H 0.0.0.0"]

