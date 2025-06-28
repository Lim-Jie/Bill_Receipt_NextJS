/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/api/backend/:path*',
        destination: `${process.env.NEXT_PUBLIC_BACKEND_API}/:path*`,
      },
      // {
      //   source: '/api/development/:path*',
      //   destination: `${process.env.NEXT_PUBLIC_DEPVELOPMENT_API}/:path*`,
      // },
    ];
  },
};

export default nextConfig;

