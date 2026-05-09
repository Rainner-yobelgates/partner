# --- STAGE 1: Build ---
FROM node:lts-alpine AS builder
WORKDIR /app

# Copy semua buat build
COPY . .
RUN npm install

# Generate Client (Pastiin npx prisma generate jalan di sini)
RUN npx prisma generate
RUN npm run build

# --- STAGE 2: Run ---
FROM node:lts-alpine
WORKDIR /app

# Library penting buat Prisma engine
RUN apk add --no-cache openssl libc6-compat

# Copy hasil build
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma

COPY --from=builder /app/prisma.config.ts ./ 
COPY --from=builder /app/generated ./generated 

COPY start.sh ./
RUN chmod +x start.sh

EXPOSE 3000
CMD ["./start.sh"]