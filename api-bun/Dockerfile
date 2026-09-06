FROM oven/bun:1.3.2 AS dependencies
WORKDIR /app
COPY package.json bun.lock ./
RUN bun install --frozen-lockfile --production

FROM oven/bun:1.3.2
WORKDIR /app
ENV NODE_ENV=production
COPY --from=dependencies --chown=bun:bun /app/node_modules ./node_modules
COPY --chown=bun:bun package.json bun.lock ./
COPY --chown=bun:bun src ./src
COPY --chown=bun:bun drizzle ./drizzle
USER bun
EXPOSE 3100
CMD ["bun", "run", "start"]
