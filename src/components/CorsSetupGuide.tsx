"use client";

import React from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import CopyButton from "./ui/copy-button";

const applicationUrl =
  process.env.NEXT_PUBLIC_APP_URL || "https://flexibuckets.com";

const corsConfigs = {
  tebi: `<?xml version='1.0' encoding='UTF-8'?>
<CORSConfiguration xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
    <CORSRule>
        <AllowedOrigin>${applicationUrl}</AllowedOrigin>
        <AllowedMethod>HEAD</AllowedMethod>
        <AllowedMethod>GET</AllowedMethod>
        <AllowedMethod>POST</AllowedMethod>
        <AllowedMethod>PUT</AllowedMethod>
        <AllowedHeader>*</AllowedHeader>
        <ExposeHeader>ETag</ExposeHeader>
        <MaxAgeSeconds>3000</MaxAgeSeconds>
    </CORSRule>
</CORSConfiguration>`,
  cloudflareR2: `[
  {
    "AllowedOrigins": [
      "${applicationUrl}"
    ],
    "AllowedMethods": [
      "GET",
      "POST",
      "PUT",
      "DELETE"
    ],
    "AllowedHeaders": [
      "Authorization",
      "Content-Type",
      "x-amz-date",
      "x-amz-content-sha256",
      "x-amz-security-token",
      "x-amz-user-agent"
    ],
    "ExposeHeaders": [
      "ETag",
      "x-amz-request-id",
      "x-amz-id-2"
    ],
    "MaxAgeSeconds": 3000
  }
]`,
  minio: `For MinIO, add CORS * (wildcard) using your hosting solution.`,
  wasabi: `Wasabi works by default. No additional CORS configuration is needed.`,
  idriveE2: `IDrive e2 works by default. No additional CORS configuration is needed.`,
  backblaze: `Backblaze works by default. No additional CORS configuration is needed.`,
};

interface CorsTabContentProps {
  title: string;
  description: string;
  content: string;
  copyable?: boolean;
}

const CorsTabContent: React.FC<CorsTabContentProps> = ({
  title,
  description,
  content,
  copyable = false,
}) => (
  <Card>
    <CardHeader>
      <CardTitle>{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent>
      {copyable ? (
        <>
          <pre className="bg-muted p-4 rounded-md overflow-x-auto">
            <code>{content}</code>
          </pre>
          <div className="mt-4">
            <CopyButton text={content} withLabel={true} />
          </div>
        </>
      ) : (
        <p>{content}</p>
      )}
    </CardContent>
  </Card>
);

export const CorsSetupGuide: React.FC = () => {
  return (
    <main className="py-12">
      <Card className="w-full max-w-4xl mx-auto">
        <CardHeader>
          <CardTitle>CORS Setup Guide</CardTitle>
          <CardDescription>
            Learn how to set up CORS for various S3-compatible storage providers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="flyo">
            <TabsList className="flex flex-wrap">
              <TabsTrigger value="flyo">Flyo.iox</TabsTrigger>
              <TabsTrigger value="tebi">Tebi</TabsTrigger>
              <TabsTrigger value="cloudflareR2">Cloudflare R2</TabsTrigger>
              <TabsTrigger value="minio">MinIO</TabsTrigger>
              <TabsTrigger value="wasabi">Wasabi</TabsTrigger>
              <TabsTrigger value="idriveE2">IDrive e2</TabsTrigger>
              <TabsTrigger value="backblaze">Backblaze</TabsTrigger>
            </TabsList>
            <TabsContent value="flyo">
              <Card>
                <CardHeader>
                  <CardTitle>
                    Flyo.iox Tigris Dev Object Storage CORS Configuration
                  </CardTitle>
                  <CardDescription>
                    Use these settings for Flyo.iox Tigris Dev Object Storage
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Setting</TableHead>
                        <TableHead>Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell>Origins</TableCell>
                        <TableCell>{applicationUrl}</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Allowed Methods</TableCell>
                        <TableCell>* (All methods)</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Allowed Headers</TableCell>
                        <TableCell>* (All headers)</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Expose Headers</TableCell>
                        <TableCell>* (All headers)</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell>Access Control Max Age</TableCell>
                        <TableCell>80000 seconds</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                  <div className="mt-4 space-y-2">
                    <p>
                      To set up CORS for your Flyo.iox Tigris Dev object
                      storage:
                    </p>
                    <ol className="list-decimal list-inside space-y-1">
                      <li>
                        Navigate to your Flyo.iox Tigris Dev object storage
                        configuration page
                      </li>
                      <li>Look for the CORS Rule Options section</li>
                      <li>Enter the values as shown in the table above</li>
                      <li>
                        Make sure to select all the necessary HTTP methods (or
                        use * for all)
                      </li>
                      <li>
                        Click the &qout;Add Rule&qout; button to save your CORS
                        configuration
                      </li>
                    </ol>
                    <p className="text-sm text-muted-foreground mt-4">
                      Note: Adjust the origin URL ({applicationUrl}) to match
                      your application&apos;s domain if different.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            <TabsContent value="tebi">
              <CorsTabContent
                title="Tebi CORS Configuration"
                description="Use this XML configuration for Tebi"
                content={corsConfigs.tebi}
                copyable={true}
              />
            </TabsContent>
            <TabsContent value="cloudflareR2">
              <CorsTabContent
                title="Cloudflare R2 CORS Configuration"
                description="Use this JSON configuration for Cloudflare R2"
                content={corsConfigs.cloudflareR2}
                copyable={true}
              />
            </TabsContent>
            <TabsContent value="minio">
              <CorsTabContent
                title="MinIO CORS Configuration"
                description="For MinIO, add CORS * (wildcard)"
                content={corsConfigs.minio}
              />
            </TabsContent>
            <TabsContent value="wasabi">
              <CorsTabContent
                title="Wasabi CORS Configuration"
                description={corsConfigs.wasabi}
                content={corsConfigs.wasabi}
              />
            </TabsContent>
            <TabsContent value="idriveE2">
              <CorsTabContent
                title="IDrive e2 CORS Configuration"
                description={corsConfigs.idriveE2}
                content={corsConfigs.idriveE2}
              />
            </TabsContent>
            <TabsContent value="backblaze">
              <CorsTabContent
                title="Backblaze CORS Configuration"
                description={corsConfigs.backblaze}
                content={corsConfigs.backblaze}
              />
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
};
