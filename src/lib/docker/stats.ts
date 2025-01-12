import { DockerClient } from './client';

export async function getContainerStats() {
  const docker = DockerClient.getInstance();

  try {
    // Get container stats
    const [traefikStats, dbStats, appStats] = await Promise.all([
      docker.docker.getContainer('flexibuckets_traefik').stats({ stream: false }),
      docker.docker.getContainer('flexibuckets_postgres').stats({ stream: false }),
      docker.docker.getContainer('flexibuckets_app').stats({ stream: false })
    ]);

    // Calculate CPU percentage for each container
    const calculateCPUPercent = (stats: any) => {
      const cpuDelta = stats.cpu_stats.cpu_usage.total_usage - stats.precpu_stats.cpu_usage.total_usage;
      const systemDelta = stats.cpu_stats.system_cpu_usage - stats.precpu_stats.system_cpu_usage;
      const cpuCount = stats.cpu_stats.online_cpus || 1;
      
      return (cpuDelta / systemDelta) * cpuCount * 100;
    };

    return {
      traefik: {
        memory: traefikStats.memory_stats.usage,
        memoryLimit: traefikStats.memory_stats.limit,
        cpu: calculateCPUPercent(traefikStats),
      },
      database: {
        memory: dbStats.memory_stats.usage,
        memoryLimit: dbStats.memory_stats.limit,
        cpu: calculateCPUPercent(dbStats),
      },
      app: {
        memory: appStats.memory_stats.usage,
        memoryLimit: appStats.memory_stats.limit,
        cpu: calculateCPUPercent(appStats),
      }
    };
  } catch (error) {
    console.error('Error getting container stats:', error);
    return null;
  }
} 