import Docker from 'dockerode';
import fs from 'fs/promises';
import path from 'path';
import { platform } from 'os';

export interface TraefikConfig {
  domain: string;
  service: string;
  port: number;
  enableSsl?: boolean;
  middlewares?: string[];
  customHeaders?: Record<string, string>;
}

export class DockerTraefikManager {
  private static instance: DockerTraefikManager;
  private docker: Docker;
  private traefikConfigPath: string;

  private constructor() {
    if (typeof window !== 'undefined') {
      throw new Error('DockerTraefikManager cannot be instantiated on the client side');
    }

    const isWindows = platform() === 'win32';
    this.docker = new Docker(isWindows ? { socketPath: '//./pipe/docker_engine' } : { socketPath: '/var/run/docker.sock' });
    this.traefikConfigPath = process.env.TRAEFIK_CONFIG_PATH || '/etc/traefik/dynamic';
  }

  public static getInstance(): DockerTraefikManager {
    if (!DockerTraefikManager.instance) {
      DockerTraefikManager.instance = new DockerTraefikManager();
    }
    return DockerTraefikManager.instance;
  }

  private generateTraefikConfig(config: TraefikConfig): object {
    const traefikConfig: any = {
      http: {
        routers: {
          [config.service]: {
            rule: `Host(\`${config.domain}\`)`,
            service: config.service,
            entrypoints: config.enableSsl ? ['websecure'] : ['web'],
          }
        },
        services: {
          [config.service]: {
            loadBalancer: {
              servers: [{ url: `http://localhost:${config.port}` }]
            }
          }
        },
        middlewares: {}
      }
    };

    if (config.enableSsl) {
      traefikConfig.http.routers[config.service].tls = {
        certResolver: 'letsencrypt'
      };
    }

    if (config.middlewares && config.middlewares.length > 0) {
      traefikConfig.http.routers[config.service].middlewares = config.middlewares;
    }

    if (config.customHeaders) {
      const headerMiddlewareName = `${config.service}-headers`;
      traefikConfig.http.middlewares[headerMiddlewareName] = {
        headers: {
          customResponseHeaders: config.customHeaders
        }
      };
      traefikConfig.http.routers[config.service].middlewares = 
        traefikConfig.http.routers[config.service].middlewares 
          ? [...traefikConfig.http.routers[config.service].middlewares, headerMiddlewareName]
          : [headerMiddlewareName];
    }

    return traefikConfig;
  }

  public async updateContainerTraefikConfig(containerId: string, config: TraefikConfig): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      const traefikConfig = this.generateTraefikConfig(config);

      // Write Traefik configuration to file
      const configFilePath = path.join(this.traefikConfigPath, `${config.service}.yml`);
      await fs.writeFile(configFilePath, JSON.stringify(traefikConfig, null, 2));

      // Update container labels
      const containerInfo = await container.inspect();
      const existingLabels = containerInfo.Config.Labels || {};
      const newLabels = {
        ...existingLabels,
        'traefik.enable': 'true',
        [`traefik.http.routers.${config.service}.rule`]: `Host(\`${config.domain}\`)`,
        [`traefik.http.services.${config.service}.loadbalancer.server.port`]: config.port.toString(),
      };

      await container.update({ Labels: newLabels });

      // Restart the container to apply changes
      await container.restart();

      console.log(`Updated Traefik configuration for container ${containerId}`);
    } catch (error: any) {
      console.error('Failed to update Traefik configuration:', error);
      throw new Error(`Failed to update Traefik configuration: ${error.message}`);
    }
  }

  public async getContainerTraefikConfig(containerId: string): Promise<TraefikConfig | null> {
    try {
      const container = this.docker.getContainer(containerId);
      const containerInfo = await container.inspect();
      const labels = containerInfo.Config.Labels || {};

      const domain = labels[`traefik.http.routers.${containerId}.rule`]?.match(/Host$$`(.+)`$$/)?.[1];
      const port = parseInt(labels[`traefik.http.services.${containerId}.loadbalancer.server.port`] || '80');

      if (!domain) {
        return null;
      }

      return {
        domain,
        service: containerId,
        port,
        enableSsl: labels[`traefik.http.routers.${containerId}.tls`] === 'true',
      };
    } catch (error: any) {
      console.error('Failed to get container Traefik configuration:', error);
      return null;
    }
  }
}

