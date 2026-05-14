import { defineDocs, defineConfig } from "fumadocs-mdx/config";

const { docs, meta } = defineDocs({
  dir: "content/docs",
});

export { docs, meta };

export default defineConfig({
  lastModifiedTime: "git",
  mdxOptions: {},
});
