# Das Tool als Container für den Hetzner-Server (siehe deploy/README.md).
# Gebaut wird bei GitHub, nicht auf dem Server — dessen 1 GB RAM reicht zum
# Betrieb, aber nicht für `next build`.
#
# Das Image enthält keine Geheimnisse: Alle Umgebungsvariablen (auch die
# NEXT_PUBLIC_-Werte, die nur serverseitig gelesen werden) kommen erst beim
# Start aus deploy/.env auf dem Server.

FROM node:24-slim AS abhaengigkeiten
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-slim AS bau
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=abhaengigkeiten /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:24-slim AS laufzeit
WORKDIR /app
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    TZ=Europe/Berlin

COPY --from=bau --chown=node:node /app/public ./public
COPY --from=bau --chown=node:node /app/.next/standalone ./
COPY --from=bau --chown=node:node /app/.next/static ./.next/static

USER node
EXPOSE 3000
CMD ["node", "server.js"]
