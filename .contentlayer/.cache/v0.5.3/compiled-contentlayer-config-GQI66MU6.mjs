// contentlayer.config.ts
import { defineDocumentType, makeSource } from "contentlayer2/source-files";
import * as path from "path";
var Doc = defineDocumentType(() => ({
  name: "Doc",
  filePathPattern: `**/*.mdx`,
  contentType: "mdx",
  fields: {
    title: {
      type: "string",
      required: true
    },
    description: {
      type: "string",
      required: false
    },
    published: {
      type: "boolean",
      required: false,
      default: true
    },
    section: {
      type: "string",
      required: true
    },
    order: {
      type: "number",
      required: true,
      default: 999
    }
  },
  computedFields: {
    slug: {
      type: "string",
      resolve: (doc) => `/${doc._raw.flattenedPath}`
    },
    slugAsParams: {
      type: "string",
      resolve: (doc) => doc._raw.flattenedPath.split("/").slice(1).join("/")
    },
    // Add a path segments field to help with hierarchy
    pathSegments: {
      type: "json",
      resolve: (doc) => {
        return doc._raw.flattenedPath.split("/").map((segment) => ({
          title: segment.replace(/-/g, " "),
          segment
        }));
      }
    }
  }
}));
var contentlayer_config_default = makeSource({
  contentDirPath: path.join("src", "content"),
  documentTypes: [Doc],
  disableImportAliasWarning: true
});
export {
  Doc,
  contentlayer_config_default as default
};
//# sourceMappingURL=compiled-contentlayer-config-GQI66MU6.mjs.map
