import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // O client do Prisma é gerado em src/generated/prisma (fora do node_modules) e
  // o binário nativo do query engine não é detectado pelo tracing: sem isto, a
  // Vercel publica as funções sem ele e toda consulta ao banco falha.
  outputFileTracingIncludes: {
    "/**": ["src/generated/prisma/*.node"],
  },
};

export default nextConfig;
