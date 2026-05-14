/** @type {import('next').NextConfig} */
import BundleAnalyzer from "@next/bundle-analyzer";
import { createMDX } from "fumadocs-mdx/next";

const nextConfig = {
  output: "standalone",
  reactStrictMode: true,
  env: {
    NEXT_PUBLIC_APP_VERSION: process.env.APP_VERSION || '0.0.0',
  },
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

const withMDX = createMDX();

export default withBundleAnalyzer(withMDX(nextConfig));
