import { source } from "@/lib/source";
import {
  DocsPage,
  DocsBody,
  DocsTitle,
  DocsDescription,
} from "fumadocs-ui/page";
import { Card, Cards } from "fumadocs-ui/components/card";

export default function DocsHomePage() {
  return (
    <DocsPage>
      <DocsTitle>FlexiBuckets Documentation</DocsTitle>
      <DocsDescription>
        Everything you need to manage your S3-compatible storage buckets.
      </DocsDescription>
      <DocsBody>
        <Cards>
          <Card
            title="Getting Started"
            description="Learn what FlexiBuckets is and get running in under 5 minutes"
            href="/docs/getting-started/introduction"
          />
          <Card
            title="Installation"
            description="Docker, manual, or from source — pick your method"
            href="/docs/installation/docker"
          />
          <Card
            title="Configuration"
            description="Environment variables, SSL, reverse proxy, and email setup"
            href="/docs/configuration/environment-variables"
          />
          <Card
            title="Guides"
            description="Adding buckets, file management, sharing, teams, and backups"
            href="/docs/guides/adding-buckets"
          />
          <Card
            title="API Reference"
            description="REST API endpoints for programmatic access"
            href="/docs/api/overview"
          />
        </Cards>
      </DocsBody>
    </DocsPage>
  );
}
