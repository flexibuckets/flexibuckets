// app/api/health/route.ts
import { NextResponse } from 'next/server'
import { prisma } from "@/lib/prisma"

interface HealthStatus {
  status: string;
  timestamp: string;
  version: string;
  services: {
    database: {
      status: string;
      latency: number;
    };
  };
  system: {
    uptime: number;
    memory: {
      total: number;
      used: number;
      free: number;
    };
  };
}

async function checkDatabaseConnection(): Promise<{ status: string; latency: number }> {
  const start = Date.now();
  
  try {
    await prisma.$queryRaw`SELECT 1`
    const latency = Date.now() - start;
    
    return {
      status: 'healthy',
      latency
    };
  } catch (error) {
    return {
      status: 'unhealthy',
      latency: Date.now() - start
    };
  }
}

function getSystemMetrics() {
  if (typeof process === 'undefined') {
    return {
      uptime: 0,
      memory: {
        total: 0,
        used: 0,
        free: 0
      }
    };
  }

  const totalMemory = process.memoryUsage().heapTotal;
  const usedMemory = process.memoryUsage().heapUsed;

  return {
    uptime: process.uptime(),
    memory: {
      total: Math.round(totalMemory / 1024 / 1024),
      used: Math.round(usedMemory / 1024 / 1024),
      free: Math.round((totalMemory - usedMemory) / 1024 / 1024)
    }
  };
}

export async function GET() {
  try {
    const dbStatus = await checkDatabaseConnection();
    const systemMetrics = getSystemMetrics();

    const healthStatus: HealthStatus = {
      status: dbStatus.status === 'healthy' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      services: {
        database: dbStatus
      },
      system: systemMetrics
    };

    const headers = {
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0'
    };

    return NextResponse.json(healthStatus, { 
      status: healthStatus.status === 'healthy' ? 200 : 503,
      headers 
    });
  } catch (error) {
    console.error('Health check failed:', error);

    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed'
    }, { 
      status: 500,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  }
}