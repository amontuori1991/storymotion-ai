/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@remotion/bundler', '@remotion/renderer', '@ffmpeg-installer/ffmpeg', '@rspack/core', 'esbuild'],
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb'
    }
  }
};

export default nextConfig;
