/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    // აიგნორირებს Lint-ის შეცდომებს აწყობისას
    ignoreDuringBuilds: true,
  },
  typescript: {
    // აიგნორირებს TypeScript-ის შეცდომებს აწყობისას
    ignoreBuildErrors: true,
  },
  images: {
    // აიგნორირებს სურათების ოპტიმიზაციის მკაცრ წესებს
    unoptimized: true,
  }
};

export default nextConfig;