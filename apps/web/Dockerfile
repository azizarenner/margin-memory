FROM node:22-slim AS build
WORKDIR /app
RUN npm install -g pnpm@11.25.0
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV API_INTERNAL_URL=http://api:8000
RUN pnpm build
USER node
EXPOSE 3000
CMD ["pnpm", "start"]
