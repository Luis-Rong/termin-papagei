import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Für den Hetzner-Server (Dockerfile): .next/standalone enthält nur die
  // Dateien, die der Server wirklich braucht — ohne node_modules daneben.
  output: "standalone",
  // postcss (kommt über sanitize-html) lässt Next.js sonst als externes Paket
  // neben dem Server liegen. Fest eingebaut läuft es überall gleich — auch
  // auf Cloudflare Workers.
  transpilePackages: ["postcss"],
};

export default nextConfig;
