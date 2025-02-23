'use server'

import { DockerClient } from '@/lib/docker/client';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import fs from 'fs/promises';
import path from 'path';
import { prisma } from '@/lib/prisma';
import yaml from 'js-yaml';

const dockerClient = DockerClient.getInstance();

const TRAEFIK_CONFIG_DIR = process.env.TRAEFIK_CONFIG_DIR || '/etc/traefik';

const DomainConfigSchema = z.object({
  domain: z.string()
    .min(1, "Domain is required")
    .regex(
      /^(?!-)[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/,
      "Invalid domain format"
    ),
  enableSsl: z.boolean().default(true)
});

export type DomainConfigInput = z.infer<typeof DomainConfigSchema>;

async function ensureDirectoryExists(dirPath: string) {
  try {
    await fs.access(dirPath);
  } catch {
    await fs.mkdir(dirPath, { recursive: true });
  }
}

export async function configureDomain(input: DomainConfigInput) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    throw new Error('Unauthorized - Admin access required');
  }

  try {
    const validated = DomainConfigSchema.parse(input);
    
    // Update database first
    await prisma.settings.upsert({
      where: { id: "default" },
      create: {
        id: "default",
        domain: validated.domain,
        allowSignups: false
      },
      update: {
        domain: validated.domain
      }
    });

    // Update Traefik configuration
    const configPath = path.join(TRAEFIK_CONFIG_DIR, 'dynamic', 'website.yml');
    await ensureDirectoryExists(path.dirname(configPath));

    const routeConfig = {
      http: {
        routers: {
          website: {
            rule: `Host(\`${validated.domain}\`)`,
            service: "website-service",
            tls: {
              certResolver: "letsencrypt"
            },
            entryPoints: ["websecure"]
          }
        },
        services: {
          "website-service": {
            loadBalancer: {
              servers: [{
                url: "http://app:3000"
              }]
            }
          }
        }
      }
    };

    const yamlStr = yaml.dump(routeConfig);
    await fs.writeFile(configPath, yamlStr);

    // Restart Traefik to apply changes
    try {
      await dockerClient.docker.getContainer('flexibuckets_traefik').restart();
    } catch (error) {
      console.error('Failed to restart Traefik:', error);
      throw new Error('Failed to apply domain configuration. Please check server logs.');
    }

    revalidatePath('/dashboard/settings');
    return { success: true, domain: validated.domain };
  } catch (error) {
    console.error('Failed to configure domain:', error);
    if (error instanceof z.ZodError) {
      throw new Error('Invalid domain format');
    }
    throw error;
  }
}

export async function getCurrentDomain() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    throw new Error('Unauthorized - Admin access required');
  }

  try {
    const settings = await prisma.settings.findFirst({
      where: { id: "default" },
      select: { domain: true }
    });
    
    return settings?.domain || '';
  } catch (error) {
    console.error('Error getting current domain:', error);
    throw new Error('Failed to get current domain configuration');
  }
}