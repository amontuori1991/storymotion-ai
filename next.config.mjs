/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@remotion/bundler', '@remotion/renderer', '@ffmpeg-installer/ffmpeg', '@rspack/core', 'esbuild'],
  outputFileTracingIncludes: {
    '/api/render-film': ['./remotion/**/*', './lib/render-types.ts']
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb'
    }
  }
};

export default nextConfig;
