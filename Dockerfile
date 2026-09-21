FROM node:22-alpine AS build

WORKDIR /app
COPY package*.json ./
RUN npm install --include=dev

COPY apps/web/package*.json ./apps/web/
RUN npm install --include=dev --prefix apps/web

COPY . .
RUN npm run build:all
RUN npm run build --prefix apps/web

FROM node:22-alpine AS runtime

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3400

COPY --from=build /app/package*.json ./
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/dist ./dist
COPY --from=build /app/apps/web/package*.json ./apps/web/
COPY --from=build /app/apps/web/node_modules ./apps/web/node_modules
COPY --from=build /app/apps/web/.next ./apps/web/.next
COPY --from=build /app/apps/web/out ./apps/web/out
COPY --from=build /app/apps/web/public ./apps/web/public
COPY --from=build /app/apps/web/next.config.mjs ./apps/web/next.config.mjs
COPY start.sh ./start.sh
RUN chmod +x ./start.sh

EXPOSE 3400

ENTRYPOINT ["/app/start.sh"]