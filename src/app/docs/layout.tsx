import { RootProvider } from "fumadocs-ui/provider";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import type { ReactNode } from "react";
import { docsOptions } from "./layout.config";
import DocsNavbar from "./docs-navbar";

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <RootProvider>
      <DocsLayout
        {...docsOptions}
        nav={{
          component: <DocsNavbar />,
        }}
      >
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
