/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: "standalone",
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "*.r2.cloudflarestorage.com",
      },
      {
        protocol: "https",
        hostname: "*.amazonaws.com",
      },
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
