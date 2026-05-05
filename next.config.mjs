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
      // AWS S3 — imágenes de listings y avatares de usuarios
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
