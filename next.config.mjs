/** @type {import('next').NextConfig} */
const securityHeaders = [
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "X-Frame-Options",
    value: "SAMEORIGIN",
  },
];

const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
  images: {
    remotePatterns: [
      // Cloudflare R2 — endpoint interno (uploads vía SDK)
      { protocol: "https", hostname: "*.r2.cloudflarestorage.com" },
      // Cloudflare R2 — URL pública r2.dev (cuando public access está habilitado)
      { protocol: "https", hostname: "*.r2.dev" },
      // Dominio personalizado configurado en R2 / CDN
      ...(process.env.R2_PUBLIC_HOSTNAME
        ? [{ protocol: "https", hostname: process.env.R2_PUBLIC_HOSTNAME }]
        : []),
      // AWS S3 / SES assets
      { protocol: "https", hostname: "*.amazonaws.com" },
      { protocol: "https", hostname: "*.s3.amazonaws.com" },
    ],
  },
  // Módulos opcionales que no deben incluirse en el bundle del servidor
  webpack: (config, { isServer }) => {
    if (isServer) {
      // nodemailer es opcional — solo se usa si SMTP_HOST está configurado
      config.externals = [...(config.externals || []), "nodemailer"];
    }
    return config;
  },
};

export default nextConfig;
