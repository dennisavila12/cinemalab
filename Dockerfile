# Imagen para publicar CinemaLab (Render, Railway, Fly.io, un VPS…)
# 1) Compila el motor Rust, la web y la API · 2) Imagen final solo con Node.js

FROM node:22-bookworm AS construir
RUN curl -sSf https://sh.rustup.rs | sh -s -- -y --profile minimal
ENV PATH="/root/.cargo/bin:${PATH}"
RUN corepack enable
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile && pnpm build

FROM node:22-bookworm-slim
WORKDIR /app
ENV NODE_ENV=production PORT=3000 HOST=0.0.0.0
COPY --from=construir /app /app
EXPOSE 3000
CMD ["node", "apps/api/dist/servidor.js"]
