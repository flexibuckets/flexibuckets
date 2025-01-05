import { NextResponse } from 'next/server';
import { z } from 'zod';

const domainSchema = z.object({
  domain: z.string().regex(/^(?!:\/\/)([a-zA-Z0-9-_]+\.)*[a-zA-Z0-9][a-zA-Z0-9-_]+\.[a-zA-Z]{2,11}?$/)
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { domain } = domainSchema.parse(body);

      
    return NextResponse.json({
      success: true,
      message: 'Domain format is valid'
    });
  } catch (error) {
    console.error('Error validating domain:', error);
    return NextResponse.json(
      { error: 'Invalid domain format' },
      { status: 400 }
    );
  }
}