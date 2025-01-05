import { allDocs } from 'contentlayer/generated';
import { notFound } from 'next/navigation';
import { Mdx } from '@/components/mdx/mdx-components';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface DocsPageProps {
  params: {
    slug?: string[];
  };
}

async function getDocFromParams(slug?: string[]) {
  const slugPath = slug?.join('/') || '';
  const doc = allDocs.find((doc) => doc.slugAsParams === slugPath);
  return doc;
}

export async function generateStaticParams() {
  return allDocs.map((doc) => ({
    slug: doc.slugAsParams.split('/'),
  }));
}

export default async function DocsPage({ params }: DocsPageProps) {
  // If no slug is provided, show the docs index page
  if (!params.slug?.length) {
    const publishedDocs = allDocs.filter(doc => doc.published !== false);

    return (
      <div className="mx-auto max-w-5xl py-6 px-4 sm:px-6 lg:px-8">
        <h1 className="text-3xl font-extrabold text-foreground mb-6">FlexiBuckets Documentation</h1>
        <p className="text-xl text-muted-foreground mb-8">
          Welcome to the FlexiBuckets documentation. Here you'll find comprehensive guides and documentation to help you start working with FlexiBuckets as quickly as possible.
        </p>
        <div className="grid gap-6 sm:grid-cols-2">
          {publishedDocs.map((doc) => (
            <Card key={doc.slug}>
              <CardHeader>
                <CardTitle>
                  <Link href={doc.slug} className="hover:underline">
                    {doc.title}
                  </Link>
                </CardTitle>
                {doc.description && (
                  <CardDescription>{doc.description}</CardDescription>
                )}
              </CardHeader>
              <CardContent>
                <Link
                  href={doc.slug}
                  className="text-sm font-medium text-primary hover:underline"
                >
                  Read more
                </Link>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // If slug is provided, show the specific doc page
  const doc = await getDocFromParams(params.slug);

  if (!doc) {
    notFound();
  }

  return (
    <div className="mdx prose prose-slate dark:prose-invert max-w-3xl mx-auto py-8">
      <h1>{doc.title}</h1>
      <Mdx code={doc.body.code} />
    </div>
  );
}