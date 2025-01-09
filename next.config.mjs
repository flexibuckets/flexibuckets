/** @type {import('next').NextConfig} */
import BundleAnalyzer from '@next/bundle-analyzer';

const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  
  headers() {
    return [
      {
        source: '/sitemap.xml',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/xml'
          }
        ]
      }
    ]
  },
  pageExtensions: ['ts', 'tsx', 'mdx'],
};
const withBundleAnalyzer = BundleAnalyzer({
  enabled: process.env.ANALYZE === 'true',
});

export default withBundleAnalyzer(nextConfig);
