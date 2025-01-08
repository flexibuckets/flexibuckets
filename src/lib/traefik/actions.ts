'use server'

import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { DockerTraefikManager } from '@/lib/docker/client';

const DomainConfigSchema = z.object({
  domain: z.string().min(1).refine(
    (domain) => /^(?!-)[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/.test(domain),
    { message: "Invalid domain format" }
  ),
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
    
    const dockerTraefikManager = DockerTraefikManager.getInstance();

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

    await dockerTraefikManager.updateContainerTraefikConfig('flexibuckets_app', config);

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
    const dockerTraefikManager = DockerTraefikManager.getInstance();
    const config = await dockerTraefikManager.getContainerTraefikConfig('flexibuckets_app');
    
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
