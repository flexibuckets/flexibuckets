import { DockerClient } from './client';

export async function getContainerStats() {
  const docker = DockerClient.getInstance();
  const stats: any = {};

  try {
    // Get Traefik stats
    const traefikContainer = await docker.docker.getContainer('flexibuckets_traefik');
    const traefikStats = await traefikContainer.stats({ stream: false });
    
    // Get Database stats
    const dbContainer = await docker.docker.getContainer('flexibuckets_postgres');
    const dbStats = await dbContainer.stats({ stream: false });
    
    // Get App stats
    const appContainer = await docker.docker.getContainer('flexibuckets_app');
    const appStats = await appContainer.stats({ stream: false });

    return {
      traefik: {
        memory: traefikStats.memory_stats.usage,
        cpu: traefikStats.cpu_stats.cpu_usage.total_usage,
      },
      database: {
        memory: dbStats.memory_stats.usage,
        cpu: dbStats.cpu_stats.cpu_usage.total_usage,
      },
      app: {
        memory: appStats.memory_stats.usage,
        cpu: appStats.cpu_stats.cpu_usage.total_usage,
      }
    };
  } catch (error) {
    console.error('Error getting container stats:', error);
    return null;
  }
} 