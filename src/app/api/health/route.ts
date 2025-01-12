import { NextResponse } from 'next/server'
import { prisma } from "@/lib/prisma"
import { getContainerStats } from '@/lib/docker/stats'
import { exec } from 'child_process'
import { promisify } from 'util'

const execAsync = promisify(exec)

interface HealthStatus {
  status: string;
  timestamp: string;
  version: string;
  services: {
    database: {
      status: string;
      latency: number;
      metrics: {
        memory: number;
        cpu: number;
      } | null;
    };
    traefik: {
      status: string;
      metrics: {
        memory: number;
        cpu: number;
      } | null;
    };
    app: {
      status: string;
      metrics: {
        memory: {
          total: number;
          used: number;
          free: number;
        };
        uptime: number;
      };
    };
  };
  system: {
    uptime: number;
    memory: {
      total: number;
      used: number;
      free: number;
    };
    disk: {
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

async function getSystemMetrics() {
  try {
    // Get system memory info
    const { stdout: memInfo } = await execAsync('free -b');
    const memLines = memInfo.split('\n');
    const memValues = memLines[1].split(/\s+/);
    
    // Get disk usage
    const { stdout: dfOutput } = await execAsync('df -B1 / | tail -n 1');
    const [, total, used, available] = dfOutput.split(/\s+/);

    return {
      uptime: process.uptime(),
      memory: {
        total: parseInt(memValues[1]),
        used: parseInt(memValues[2]),
        free: parseInt(memValues[3])
      },
      disk: {
        total: parseInt(total),
        used: parseInt(used),
        free: parseInt(available)
      }
    };
  } catch (error) {
    console.error('Error getting system metrics:', error);
    return null;
  }
}

export async function GET() {
  try {
    const [dbStatus, systemMetrics, containerStats] = await Promise.all([
      checkDatabaseConnection(),
      getSystemMetrics(),
      getContainerStats()
    ]);

    const healthStatus: HealthStatus = {
      status: dbStatus.status === 'healthy' ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      version: process.env.APP_VERSION || '1.0.0',
      services: {
        database: {
          ...dbStatus,
          metrics: containerStats?.database || null
        },
        traefik: {
          status: containerStats?.traefik ? 'healthy' : 'unhealthy',
          metrics: containerStats?.traefik || null
        },
        app: {
          status: 'healthy',
          metrics: {
            memory: systemMetrics?.memory || { total: 0, used: 0, free: 0 },
            uptime: systemMetrics?.uptime || 0
          }
        }
      },
      system: systemMetrics || {
        uptime: 0,
        memory: { total: 0, used: 0, free: 0 },
        disk: { total: 0, used: 0, free: 0 }
      }
    };

    return NextResponse.json(healthStatus, {
      status: healthStatus.status === 'healthy' ? 200 : 503,
      headers: {
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('Health check failed:', error);
    return NextResponse.json({ error: 'Health check failed' }, { status: 500 });
  }
}