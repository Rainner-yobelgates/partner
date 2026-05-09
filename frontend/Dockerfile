# --- STAGE 1: Build (Pake Node) ---
FROM node:lts-alpine AS build-stage
WORKDIR /app

# Ambil ARG dari luar
ARG VITE_API_BASE_URL

# Set jadi ENV supaya bisa dibaca oleh Vite pas 'npm run build'
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY . .
RUN npm install

# Sekarang Vite bakal dapet nilainya pas build
RUN npm run build

# --- STAGE 2: Production (Pake Nginx) ---
FROM nginx:stable-alpine AS production-stage
COPY --from=build-stage /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
