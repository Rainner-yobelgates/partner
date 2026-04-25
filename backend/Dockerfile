# --- STAGE 1: Build ---
FROM node:lts-alpine AS builder
WORKDIR /app


# Copy source code dan generate prisma
COPY . .
RUN npm install
RUN npx prisma generate
RUN npm run build

# --- STAGE 2: Run ---
FROM node:lts-alpine
WORKDIR /app


RUN apk add --no-cache openssl libc6-compat

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/prisma ./prisma
COPY start.sh ./

RUN chmod +x start.sh
EXPOSE 3000

CMD ["./start.sh"]