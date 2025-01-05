import { NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { z } from 'zod';

const execAsync = promisify(exec);

const domainSchema = z.object({
  domain: z.string().regex(/^(?!:\/\/)([a-zA-Z0-9-_]+\.)*[a-zA-Z0-9][a-zA-Z0-9-_]+\.[a-zA-Z]{2,11}?$/)
});



export async function POST(req: Request) {
    try {
      const body = await req.json();
      const { domain } = domainSchema.parse(body);
  
      // Check DNS configuration
      const dnsCheck = await execAsync(`dig +short ${domain}`);
      const serverIp = process.env.SERVER_IP;
  
      if (!dnsCheck.stdout.includes(serverIp!)) {
        return NextResponse.json({
          success: false,
          message: 'DNS records are not properly configured'
        }, { status: 400 });
      }
  
      return NextResponse.json({
        success: true,
        message: 'Domain is properly configured'
      });
    } catch (error) {
      console.error('Error validating domain:', error);
      return NextResponse.json(
        { error: 'Failed to validate domain' },
        { status: 500 }
      );
    }
  }