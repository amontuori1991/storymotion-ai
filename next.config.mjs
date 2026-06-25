/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@remotion/bundler', '@remotion/renderer', '@ffmpeg-installer/ffmpeg', '@rspack/core', 'esbuild'],
  outputFileTracingIncludes: {
    '/api/render-film': [
      './remotion/**/*',
      './lib/render-types.ts',
      './node_modules/@remotion/compositor-linux-x64-gnu/remotion',
      './node_modules/@remotion/compositor-linux-x64-gnu/package.json',
      './node_modules/@ffmpeg-installer/ffmpeg/index.js',
      './node_modules/@ffmpeg-installer/ffmpeg/package.json',
      './node_modules/@ffmpeg-installer/linux-x64/ffmpeg',
      './node_modules/@ffmpeg-installer/linux-x64/package.json',
      './node_modules/@sparticuz/chromium-min/build/**/*',
      './node_modules/@sparticuz/chromium-min/package.json'
    ]
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb'
    }
  }
};

export default nextConfig;
