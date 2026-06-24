FROM node:24-slim AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .

# Build-time arguments (from docker-compose or docker build)
ARG NEXT_PUBLIC_API_URL=/api
ARG BETTER_AUTH_SECRET=dev-build-secret
ARG BETTER_AUTH_URL=http://localhost:3000
ARG AUTH_DATABASE_URL=postgresql://postgres:dev@auth-db:5432/refuce_auth
ARG BACKEND_API_URL=http://backend:8000
ARG BACKEND_SHARED_SECRET=dev-shared-secret
ARG MICROSOFT_CLIENT_ID=
ARG MICROSOFT_CLIENT_SECRET=
ARG MICROSOFT_TENANT_ID=common

# Set as environment variables for build
ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV BETTER_AUTH_SECRET=$BETTER_AUTH_SECRET
ENV BETTER_AUTH_URL=$BETTER_AUTH_URL
ENV AUTH_DATABASE_URL=$AUTH_DATABASE_URL
ENV BACKEND_API_URL=$BACKEND_API_URL
ENV BACKEND_SHARED_SECRET=$BACKEND_SHARED_SECRET
ENV MICROSOFT_CLIENT_ID=$MICROSOFT_CLIENT_ID
ENV MICROSOFT_CLIENT_SECRET=$MICROSOFT_CLIENT_SECRET
ENV MICROSOFT_TENANT_ID=$MICROSOFT_TENANT_ID

RUN npm run build
RUN cp -r public .next/standalone/public && \
    cp -r .next/static .next/standalone/.next/static

FROM node:24-slim AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0
EXPOSE 3000
CMD ["node", "server.js"]
