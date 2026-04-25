# --- STAGE 1: Build (Pake Node) ---
FROM node:lts-alpine AS build-stage
WORKDIR /app

# Install pnpm karena ada pnpm-lock.yaml

COPY . .
RUN npm install
RUN npm run build

# --- STAGE 2: Production (Pake Nginx) ---
FROM nginx:stable-alpine AS production-stage


COPY --from=build-stage /app/dist /usr/share/nginx/html

# Copy config nginx biar support SPA (Single Page Application)
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
