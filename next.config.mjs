/** @type {import('next').NextConfig} */
import BundleAnalyzer from "@next/bundle-analyzer";

const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  webpack(config, { isServer }) {
    if (isServer) {
      config.module.rules.push({
        test: /\.node$/,
        use: "node-loader",
      });

      config.externals = config.externals || [];
      config.externals.push({
        "sshcrypto.node": "commonjs sshcrypto.node",
      });

      config.resolve.extensions.push(".node");
    }

    return config;
  },
  headers() {
    return [
      {
        source: "/sitemap.xml",
        headers: [
          {
            key: "Content-Type",
            value: "application/xml",
          },
        ],
      },
    ];
  },
  pageExtensions: ["ts", "tsx", "mdx"],
};
const withBundleAnalyzer = BundleAnalyzer({
  enabled: process.env.ANALYZE === "true",
});

export default withBundleAnalyzer(nextConfig);
