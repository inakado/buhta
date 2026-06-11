FROM node:24-bookworm-slim AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"
WORKDIR /app

RUN apt-get update \
	&& apt-get install -y --no-install-recommends ca-certificates openssl \
	&& rm -rf /var/lib/apt/lists/* \
	&& corepack enable

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/shared/package.json packages/shared/package.json

RUN pnpm install --frozen-lockfile

FROM deps AS build

COPY apps/api apps/api
COPY packages/shared packages/shared

RUN pnpm --filter @buhta/shared build
RUN pnpm --filter @buhta/api build

FROM base AS runtime

ENV NODE_ENV=production
ENV API_PORT=3000

COPY --from=deps /app /app
COPY --from=build /app/apps/api /app/apps/api
COPY --from=build /app/packages/shared /app/packages/shared

EXPOSE 3000

CMD ["pnpm", "--filter", "@buhta/api", "start"]
