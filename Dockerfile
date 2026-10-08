FROM node:22-alpine

# Install glibc compatibility libraries so Cloudflare workerd binary executes cleanly on Alpine musl
RUN apk add --no-cache libc6-compat gcompat

WORKDIR /app

# Enable Corepack and prepare pnpm
RUN corepack enable && corepack prepare pnpm@latest --activate

# Copy workspace & package configuration files
COPY package.json pnpm-lock.yaml* pnpm-workspace.yaml* ./

# Configure pnpm to be resilient against slow/throttled network connections
RUN pnpm config set fetch-timeout 1200000 && \
    pnpm config set fetch-retries 10 && \
    pnpm config set fetch-retry-maxtimeout 600000

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Expose Vinext server port
EXPOSE 3000

# Run development server with host 0.0.0.0 bound to port 3000
CMD ["pnpm", "dev", "--host", "0.0.0.0", "--port", "3000"]
