/** @type {import('next').NextConfig} */
const nextConfig = {
  // Ensure images from unsplash work
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },
  // Transpile ogl and three for proper bundling
  transpilePackages: ['ogl', 'three', 'postprocessing'],
};

export default nextConfig;
