# syntax=docker/dockerfile:1
# --- Build the Vite SPA -----------------------------------------------------
FROM node:20-alpine AS build
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Vite inlines these at BUILD time. On Railway, define them as service
# variables — Railway passes them into the Docker build as args automatically
# (they must be declared here as ARG to be picked up).
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_PUBLISHABLE_KEY
ARG VITE_SUPABASE_PROJECT_ID
ARG VITE_STRIPE_PUBLISHABLE_KEY
ARG VITE_PAYMENT_PROVIDER
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID \
    VITE_STRIPE_PUBLISHABLE_KEY=$VITE_STRIPE_PUBLISHABLE_KEY \
    VITE_PAYMENT_PROVIDER=$VITE_PAYMENT_PROVIDER

RUN npm run build

# --- Serve the static build with SPA fallback -------------------------------
FROM caddy:2-alpine
COPY --from=build /app/dist /srv
COPY Caddyfile /etc/caddy/Caddyfile
# Caddy's base image already runs: caddy run --config /etc/caddy/Caddyfile
