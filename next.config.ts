import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // postcss (kommt über sanitize-html) lässt Next.js sonst als externes Paket
  // neben dem Server liegen. Fest eingebaut läuft es überall gleich — auch
  // auf Cloudflare Workers.
  transpilePackages: ["postcss"],
};

export default nextConfig;
