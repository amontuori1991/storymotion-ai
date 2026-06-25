/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@remotion/bundler', '@remotion/renderer', '@ffmpeg-installer/ffmpeg', '@rspack/core', 'esbuild'],
  outputFileTracingIncludes: {
    '/api/render-film': [
      './remotion/**/*',
      './lib/render-types.ts',
      './node_modules/@remotion/compositor-*/*',
      './node_modules/@remotion/renderer/**/*',
      './node_modules/@ffmpeg-installer/**/*'
    ]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb'
    }
  }
};

export default nextConfig;
