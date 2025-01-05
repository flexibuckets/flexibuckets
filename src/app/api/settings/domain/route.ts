import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { exec } from 'child_process';
import { promisify } from 'util';
import yaml from 'yaml';
import fs from 'fs/promises';

const execAsync = promisify(exec);
const TRAEFIK_CONFIG_PATH = '/etc/traefik/dynamic/config.yml';

const domainSchema = z.object({
  domain: z.string().regex(/^(?!:\/\/)([a-zA-Z0-9-_]+\.)*[a-zA-Z0-9][a-zA-Z0-9-_]+\.[a-zA-Z]{2,11}?$/)
});

export async function GET() {
  try {
    const settings = await prisma.domainSettings.findFirst({
      orderBy: { createdAt: 'desc' }
    });

    let ssl = null;
    if (settings?.domain) {
      try {
        const certInfo = await execAsync('certbot certificates');
        const expiryMatch = certInfo.stdout.match(/Expiry Date: (.*?) /);
        if (expiryMatch) {
          ssl = { expiresAt: new Date(expiryMatch[1]).toISOString() };
        }
      } catch (error) {
        console.error('Error checking SSL certificate:', error);
      }
    }

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
    await prisma.domainSettings.upsert({
      where: { id: 'current' },
      update: { domain },
      create: { id: 'current', domain }
    });

    // Update Traefik configuration
    const config = {
      http: {
        middlewares: {
          authheader: {
            headers: {
              customRequestHeaders: {
                'X-Forwarded-Proto': 'https'
              }
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
            middlewares: ['authheader']
          }
        },
        services: {
          app: {
            loadBalancer: {
              servers: [{ url: 'http://app:3000' }]
            }
          }
        }
      }
    };

    try {
      await fs.writeFile(TRAEFIK_CONFIG_PATH, yaml.stringify(config));
      await execAsync('docker compose restart traefik');
    } catch (error) {
      console.error('Error updating Traefik configuration:', error);
      // Continue even if Traefik update fails
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
