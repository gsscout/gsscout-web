/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,

  // 🔥 ESLint'i build sırasında tamamen kapatıyoruz
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
