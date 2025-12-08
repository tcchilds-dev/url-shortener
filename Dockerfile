FROM node:24-alpine AS builder

RUN npm install -g pnpm

WORKDIR /app

COPY package.json pnpm-lock.yaml ./

# install dependencies
RUN pnpm install --frozen-lockfile

# copy source code
COPY . .

RUN pnpm run build


# --- STAGE 2: Production ---

FROM node:24-alpine AS runner

RUN npm install -g pnpm

WORKDIR /app

COPY --from=builder /app/package.json ./
COPY --from=builder /app/node_modules ./node_modules
copy --from=builder /app/dist ./dist

ENV NODE_ENV=production
CMD ["pnpm", "start:prod"]