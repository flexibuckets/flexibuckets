import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { promises as fs } from 'fs';
import { z } from 'zod';

const execAsync = promisify(exec);

const domainSchema = z.object({
  domain: z.string().regex(/^(?!:\/\/)([a-zA-Z0-9-_]+\.)*[a-zA-Z0-9][a-zA-Z0-9-_]+\.[a-zA-Z]{2,11}?$/)
});

export async function GET() {
  try {
    // Read current domain configuration
    const config = await fs.readFile('/etc/traefik/dynamic/config.yml', 'utf8');
    const domain = process.env.DOMAIN || '';
    const serverIp = process.env.SERVER_IP || '';

    // Check SSL certificate status
    let ssl = null;
    try {
      const certInfo = await execAsync('certbot certificates');
      const expiryMatch = certInfo.stdout.match(/Expiry Date: (.*?) /);
      if (expiryMatch) {
        ssl = {
          expiresAt: new Date(expiryMatch[1]).toISOString(),
        };
      }
    } catch (error) {
      console.error('Error checking SSL certificate:', error);
    }

    return NextResponse.json({
      domain,
      serverIp,
      ssl,
      status: domain ? 'configured' : 'pending'
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

    // Update Traefik configuration
    await updateTraefikConfig(domain);
    
    // Update environment variables
    await updateEnvFile(domain);
    
    // Restart Traefik to apply changes
    await execAsync('docker-compose restart traefik');

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

async function updateTraefikConfig(domain: string) {
  const configPath = '/etc/traefik/dynamic/config.yml';
  
  const config = `
http:
  routers:
    app:
      rule: "Host(\`${domain}\`)"
      service: app
      tls:
        certResolver: letsencrypt
      entryPoints:
        - websecure
  services:
    app:
      loadBalancer:
        servers:
          - url: "http://app:3000"
`;

  await fs.writeFile(configPath, config);
}

async function updateEnvFile(domain: string) {
  const envPath = '/opt/flexibuckets/.env';
  let envContent = await fs.readFile(envPath, 'utf8');
  
  // Update domain-related variables
  envContent = envContent.replace(/^DOMAIN=.*$/m, `DOMAIN=${domain}`);
  envContent = envContent.replace(
    /^NEXTAUTH_URL=.*$/m,
    `NEXTAUTH_URL=https://${domain}`
  );
  envContent = envContent.replace(
    /^NEXT_PUBLIC_APP_URL=.*$/m,
    `NEXT_PUBLIC_APP_URL=https://${domain}`
  );
  
  await fs.writeFile(envPath, envContent);
}
