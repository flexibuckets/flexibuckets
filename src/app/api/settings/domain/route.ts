import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { DockerClient } from '@/lib/docker/client';
import yaml from 'yaml';
import fs from 'fs/promises';

const TRAEFIK_CONFIG_PATH = '/etc/traefik/dynamic/config.yml';

const domainSchema = z.object({
  domain: z.string().regex(/^(?!:\/\/)([a-zA-Z0-9-_]+\.)*[a-zA-Z0-9][a-zA-Z0-9-_]+\.[a-zA-Z]{2,11}?$/)
});

export async function GET() {
  try {
    const settings = await prisma.settings.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    // SSL is managed automatically by Traefik's Let's Encrypt integration
    const ssl = settings?.domain ? { managed: true, provider: 'letsencrypt' } : null;

    return NextResponse.json({
      domain: settings?.domain || '',
      ssl,
      status: settings?.domain ? 'configured' : 'pending'
    });
  } catch (error) {
    console.error('Error getting domain settings:', error);
    return NextResponse.json(
      { error: 'Failed to get domain settings' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { domain } = domainSchema.parse(body);

    // Update database
    await prisma.settings.upsert({            
      where: { id: 'current' },
      update: { domain },
      create: { id: 'current', domain }
    });

    // In local/self-host mode, skip Traefik configuration (no reverse proxy)
    if (process.env.DEPLOYMENT_MODE !== 'local') {
      // Update Traefik configuration
      const config = {
        http: {
          middlewares: {
            authheader: {
              headers: {
                customRequestHeaders: {
                  'X-Forwarded-Proto': 'https'
                },
                customResponseHeaders: {
                  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
                  'X-Frame-Options': 'DENY',
                  'X-Content-Type-Options': 'nosniff'
                }
              }
            },
            secureHeaders: {
              headers: {
                sslRedirect: true,
                forceSTSHeader: true,
                stsSeconds: 31536000,
                stsIncludeSubdomains: true
              }
            }
          },
          routers: {
            app: {
              rule: `Host(\`${domain}\`)`,
              service: 'app',
              tls: {
                certResolver: 'letsencrypt'
              },
              entryPoints: ['websecure'],
              middlewares: ['authheader', 'secureHeaders']
            }
          },
          services: {
            app: {
              loadBalancer: {
                servers: [{ url: 'http://app:3000' }],
                passHostHeader: true
              }
            }
          }
        }
      };

      try {
        await fs.writeFile(TRAEFIK_CONFIG_PATH, yaml.stringify(config));
        // Restart Traefik via Docker API (no CLI binary needed)
        const dockerClient = DockerClient.getInstance();
        await dockerClient.docker.getContainer('flexibuckets_traefik').restart();
      } catch (error) {
        console.error('Error updating Traefik configuration:', error);
        // Continue even if Traefik update fails
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Domain settings updated successfully'
    });
  } catch (error) {
    console.error('Error updating domain:', error);
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid domain format' },
        { status: 400 }
      );
    }
    return NextResponse.json(
      { error: 'Failed to update domain settings' },
      { status: 500 }
    );
  }
}
