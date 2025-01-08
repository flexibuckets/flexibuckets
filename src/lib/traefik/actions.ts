'use server'

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { DockerTraefikManager } from '@/lib/docker/client';

// Simplified schema for domain configuration
const DomainConfigSchema = z.object({
  domain: z.string().min(1),
  enableSsl: z.boolean().default(true),
});

export type DomainConfigInput = z.infer<typeof DomainConfigSchema>;

export async function configureDomain(input: DomainConfigInput) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    throw new Error('Unauthorized - Admin access required');
  }

  try {
    const validated = DomainConfigSchema.parse(input);
    
    // Domain validation
    const domainRegex = /^(?!-)[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
    if (!domainRegex.test(validated.domain)) {
      throw new Error('Invalid domain format');
    }

    // Get Docker Traefik manager instance
    const traefikManager = DockerTraefikManager.getInstance();

    // Configure app container with Traefik
    const config = {
      domain: validated.domain,
      service: 'flexibuckets-app',
      port: 3000,
      enableSsl: validated.enableSsl,
      middlewares: ['auth', 'compress'],
      customHeaders: {
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'X-Frame-Options': 'DENY',
        'X-Content-Type-Options': 'nosniff',
      },
    };

    // Update container configuration
    await traefikManager.updateContainerTraefikConfig('flexibuckets_app', config);

    // Update database settings
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

    revalidatePath('/dashboard/settings');
    return { success: true, domain: validated.domain };
  } catch (error: any) {
    console.error('Failed to configure domain:', error);
    throw new Error(`Failed to configure domain: ${error.message}`);
  }
}

export async function getCurrentDomain() {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    throw new Error('Unauthorized - Admin access required');
  }

  try {
    const traefikManager = DockerTraefikManager.getInstance();
    const config = await traefikManager.getContainerTraefikConfig('flexibuckets_app');
    
    if (!config) {
      const settings = await prisma.settings.findFirst({
        where: { id: "default" }
      });
      return settings?.domain || null;
    }

    return config.domain;
  } catch (error: any) {
    console.error('Failed to get current domain:', error);
    throw new Error('Failed to get current domain configuration');
  }
}