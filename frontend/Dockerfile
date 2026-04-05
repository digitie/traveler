FROM node:20-slim AS base

WORKDIR /app

COPY package.json ./
RUN npm install

COPY . .

FROM base AS dev
CMD ["npm", "run", "dev"]

FROM base AS builder
RUN npm run build

FROM node:20-slim AS production
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public
CMD ["node", "server.js"]
