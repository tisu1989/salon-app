# ---- builder: install deps, generate Prisma client, compile TS -> dist ----
FROM node:20-alpine AS builder
WORKDIR /app

# node:20-alpine ships with no OpenSSL at all, so Prisma's engine can't detect a
# version to target and silently generates one that crashes at runtime ("Could
# not parse schema engine response"). Installing it is what makes `prisma
# generate` below actually detect openssl3 and produce a working engine binary.
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate
RUN npm run build

# ---- runtime ----
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production

# The query engine needs libssl present here too, not just at generate time.
RUN apk add --no-cache openssl

# Keeping devDependencies (not `npm ci --omit=dev`) is deliberate: the "migrate"
# service in docker-compose.yml runs `npx prisma migrate deploy` at container
# start, and the Prisma CLI is a devDependency. A leaner prod-only image is a
# reasonable follow-up later, not worth the split-build complexity yet.
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY package*.json ./

EXPOSE 4000
CMD ["node", "dist/server.js"]
