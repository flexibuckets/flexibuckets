import { exec } from 'child_process';
import { promisify } from 'util';
import os from 'os';

const execAsync = promisify(exec);

export async function getSystemMetrics() {
  try {
    const metrics = {
      memory: {
        total: os.totalmem(),
        free: os.freemem(),
        used: os.totalmem() - os.freemem()
      },
      uptime: os.uptime(),
      loadavg: os.loadavg(),
      cpus: os.cpus().length
    };

    return {
      status: 'healthy',
      metrics
    };
  } catch (error) {
    console.error('Error getting system metrics:', error);
    return {
      status: 'unhealthy',
      error: 'Failed to get system metrics'
    };
  }
}