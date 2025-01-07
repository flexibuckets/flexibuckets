'use server'

import { DockerClient } from '@/lib/docker/client';
import { auth } from '@/auth';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import fs, { mkdir, writeFile } from 'fs/promises';
import path, { join } from 'path';
import { prisma } from '@/lib/prisma';
import yaml from 'js-yaml';

const dockerClient = DockerClient.getInstance();

// Simplified schema for just domain configuration
const DomainConfigSchema = z.object({
  domain: z.string().min(1),
  enableSsl: z.boolean().default(false),
});

export type DomainConfigInput = z.infer<typeof DomainConfigSchema>;

const TRAEFIK_CONFIG_DIR = process.env.TRAEFIK_CONFIG_DIR || '/etc/traefik';


async function writeTraefikConfig(filename: string, content: string) {
  // Get the dynamic configuration directory from environment
  const dynamicDir = process.env.TRAEFIK_DYNAMIC_DIR || '/etc/traefik/dynamic';
  const configPath = join(dynamicDir, filename);
  try {
    // Use node:fs/promises writeFile
    await writeFile(configPath, content, {
        mode: 0o664,  // rw-rw-r--
        flag: 'w'
    });
    
    return true;
} catch (error: any) {
    // Detailed error logging
    console.error('Failed to write Traefik config:', {
        path: configPath,
        error: error.message,
        code: error.code,
        uid: process.getuid?.(),
        gid: process.getgid?.()
    });
    
    throw new Error(
        `Failed to write Traefik configuration: ${error.message}. ` +
        `Please check system permissions and logs.`
    );
}
}


async function ensureDirectoryExists(dirPath: string) {
  try {
    await fs.access(dirPath);
  } catch {
    try {
      await fs.mkdir(dirPath, { recursive: true, mode: 0o755 });
    } catch (error: any) {
      if (error.code === 'EACCES') {
        throw new Error(`Permission denied: Cannot create directory ${dirPath}. Please ensure proper permissions are set.`);
      }
      throw error;
    }
  }
}

export async function configureDomain(input: DomainConfigInput) {
  const session = await auth();
  if (!session?.user?.isAdmin) {
    throw new Error('Unauthorized - Admin access required');
  }

  const serverIp = process.env.SERVER_IP;
  if (!serverIp) {
    throw new Error('Server IP not configured. Please check your environment variables.');
  }

  try {
    // Ensure the Traefik config directory exists and has proper permissions
    const configDir = '/etc/traefik/dynamic';
    try {
      await fs.access(configDir);
    } catch {
      await fs.mkdir(configDir, { recursive: true });
      await fs.chmod(configDir, 0o770);
    }

    const validated = DomainConfigSchema.parse(input);
    
    // Updated domain validation regex to handle subdomains
    const domainRegex = /^(?!-)[A-Za-z0-9-]+(?:\.[A-Za-z0-9-]+)*\.[A-Za-z]{2,}$/;
    if (!domainRegex.test(validated.domain)) {
      throw new Error('Invalid domain format. Please enter a valid domain name (e.g., example.com or sub.example.com)');
    }

    const configPath = path.join(TRAEFIK_CONFIG_DIR, 'dynamic', 'website.yml');
    await ensureDirectoryExists(path.dirname(configPath));

    const routeConfig = {
      http: {
        middlewares: {
          auth: {
            forwardAuth: {
              address: "http://app:3000/api/auth",
              trustForwardHeader: true,
              authResponseHeaders: [
                "Set-Cookie",
                "Authorization",
                "X-Auth-Token"
              ]
            }
          },
          headers: {
            headers: {
              customRequestHeaders: {
                "X-Forwarded-Proto": "https"
              },
              customResponseHeaders: {
                "Set-Cookie": "Path=/; Secure; HttpOnly; SameSite=Lax"
              }
            }
          }
        },
        routers: {
          website: {
            rule: `Host(\`${validated.domain}\`)`,
            service: "website-service",
            tls: {
              certResolver: "letsencrypt"
            },
            entryPoints: ["websecure"],
            middlewares: ["auth", "headers"]
          },
          "website-http": {
            rule: `Host(\`${validated.domain}\`)`,
            service: "website-service",
            entryPoints: ["web"]
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
    await writeTraefikConfig('website.yml', yamlStr);


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

    // Restart Traefik to apply changes
    const traefikContainer = dockerClient.docker.getContainer('flexibuckets_traefik');
    await traefikContainer.restart();

    revalidatePath('/dashboard/settings');
    return { success: true, domain: validated.domain };
  } catch (error: any) {
    console.error('Failed to configure domain:', error);
    if (error.code === 'EACCES') {
      throw new Error(`Permission denied: Cannot write to configuration file. Please check container permissions.`);
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
      where: { id: "default" }
    });
    return settings?.domain || null;
  } catch (error: any) {
    console.error('Failed to get current domain:', error);
    throw new Error('Failed to get current domain configuration');
  }
}