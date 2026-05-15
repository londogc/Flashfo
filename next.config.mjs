/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: false,

  // ── Security headers ──────────────────────────────────────────────────
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          // Prevent clickjacking
          { key: 'X-Frame-Options',           value: 'DENY' },
          // Prevent MIME-type sniffing
          { key: 'X-Content-Type-Options',     value: 'nosniff' },
          // Don't leak referrer on cross-origin requests
          { key: 'Referrer-Policy',            value: 'strict-origin-when-cross-origin' },
          // Disable browser features Flashfo doesn't use
          { key: 'Permissions-Policy',         value: 'camera=(), microphone=(), geolocation=(), interest-cohort=()' },
          // Basic XSS protection for older browsers
          { key: 'X-XSS-Protection',           value: '1; mode=block' },
          // Force HTTPS for 1 year
          { key: 'Strict-Transport-Security',  value: 'max-age=31536000; includeSubDomains' },
        ],
      },
    ]
  },

  // ── Image domains ─────────────────────────────────────────────────────
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**.supabase.co' },
      { protocol: 'https', hostname: '**.supabase.in' },
    ],
  },
}

export default nextConfig
