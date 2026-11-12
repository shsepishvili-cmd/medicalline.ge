import type { NextConfig } from "next";

// Photos uploaded from the admin panel are served from Supabase Storage.
function supabaseStorageHost() {
  try {
    const url = new URL(process.env.NEXT_PUBLIC_SUPABASE_URL || '')
    const protocol = url.protocol === 'http:' ? 'http' as const : 'https' as const
    return url.hostname ? [{ protocol, hostname: url.hostname, port: url.port, pathname: '/storage/v1/object/public/**' }] : []
  } catch {
    return []
  }
}


const nextConfig: NextConfig = {
  serverExternalPackages: ['pdf-parse', 'sharp'],
  compiler: {
    styledComponents: true,
  },
  async headers() {
    return [
      {
        source: '/invoice.html',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
          { key: 'Surrogate-Control', value: 'no-store' },
        ],
      },
      {
        source: '/invoice',
        headers: [
          { key: 'Cache-Control', value: 'no-store, no-cache, must-revalidate, proxy-revalidate' },
          { key: 'Pragma', value: 'no-cache' },
          { key: 'Expires', value: '0' },
          { key: 'Surrogate-Control', value: 'no-store' },
        ],
      },
    ]
  },
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'cdn.sanity.io' },
      ...supabaseStorageHost(),
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  // eslint აქ აღარ გვინდა, წავშალეთ
};

export default nextConfig;
