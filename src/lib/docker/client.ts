import Docker from 'dockerode';
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
  public docker: Docker;

  private constructor() {
    if (typeof window !== 'undefined') {
      throw new Error('DockerTraefikManager cannot be instantiated on the client side');
    }

    const isWindows = platform() === 'win32';
    this.docker = new Docker(isWindows ? { socketPath: '//./pipe/docker_engine' } : { socketPath: '/var/run/docker.sock' });
  }

  public static getInstance(): DockerTraefikManager {
    if (!DockerTraefikManager.instance) {
      DockerTraefikManager.instance = new DockerTraefikManager();
    }
    return DockerTraefikManager.instance;
  }

  private generateLabels(config: TraefikConfig): Record<string, string> {
    const baseLabels = {
      'traefik.enable': 'true',
      [`traefik.http.routers.${config.service}.rule`]: `Host(\`${config.domain}\`)`,
      [`traefik.http.services.${config.service}.loadbalancer.server.port`]: config.port.toString(),
    };

    // Add SSL configuration if enabled
    if (config.enableSsl) {
      Object.assign(baseLabels, {
        [`traefik.http.routers.${config.service}.entrypoints`]: 'websecure',
        [`traefik.http.routers.${config.service}.tls`]: 'true',
        [`traefik.http.routers.${config.service}.tls.certresolver`]: 'letsencrypt',
        // HTTP to HTTPS redirect
        [`traefik.http.routers.${config.service}-http.rule`]: `Host(\`${config.domain}\`)`,
        [`traefik.http.routers.${config.service}-http.entrypoints`]: 'web',
        [`traefik.http.middlewares.${config.service}-https-redirect.redirectscheme.scheme`]: 'https',
        [`traefik.http.routers.${config.service}-http.middlewares`]: `${config.service}-https-redirect`,
      });
    }

    // Add middlewares if specified
    if (config.middlewares?.length) {
      baseLabels[`traefik.http.routers.${config.service}.middlewares`] = 
        config.middlewares.join(',');
    }

    // Add custom headers if specified
    if (config.customHeaders) {
      Object.entries(config.customHeaders).forEach(([key, value]) => {
        baseLabels[`traefik.http.middlewares.${config.service}-headers.headers.customresponseheaders.${key}`] = value;
      });
      // Add headers middleware to the chain
      const existingMiddlewares = baseLabels[`traefik.http.routers.${config.service}.middlewares`];
      baseLabels[`traefik.http.routers.${config.service}.middlewares`] = 
        existingMiddlewares ? `${existingMiddlewares},${config.service}-headers` : `${config.service}-headers`;
    }

    return baseLabels;
  }

  public async updateContainerTraefikConfig(
    containerId: string, 
    config: TraefikConfig
  ): Promise<void> {
    try {
      const container = this.docker.getContainer(containerId);
      const containerInfo = await container.inspect();

      // Generate new labels
      const newLabels = this.generateLabels(config);

      // Merge with existing config to preserve other settings
      const existingConfig = containerInfo.Config || {};
      const existingLabels = existingConfig.Labels || {};
      const mergedLabels = { ...existingLabels, ...newLabels };

      // Create new container config
      const newConfig = {
        ...existingConfig,
        Labels: mergedLabels,
      };

      // Stop the container
      await container.stop();

      // Create new container with updated config
      await container.update({ Labels: mergedLabels });

      // Start the container
      await container.start();

      // Verify Traefik picked up the new config
      await this.verifyTraefikConfig(config.domain);

    } catch (error) {
      console.error('Failed to update Traefik configuration:', error);
      throw new Error(`Failed to update Traefik configuration`);
    }
  }

  private async verifyTraefikConfig(domain: string): Promise<void> {
    // Get Traefik container
    const traefikContainer = await this.docker.getContainer('flexibuckets_traefik');
    
    // Check Traefik logs for configuration reload
    const logs = await traefikContainer.logs({
      tail: 50,
      stdout: true,
      stderr: true,
    });

    const logsString = logs.toString();
    if (!logsString.includes(`Host(\`${domain}\`)`)) {
      throw new Error('Traefik configuration verification failed');
    }
  }

  public async getContainerTraefikConfig(containerId: string): Promise<TraefikConfig | null> {
    try {
      const container = this.docker.getContainer(containerId);
      const info = await container.inspect();
      const labels = info.Config.Labels || {};

      // Extract domain from router rule
      const routerRule = Object.entries(labels).find(([key, value]) => 
        key.includes('.rule') && value.includes('Host')
      );

      if (!routerRule) return null;

      const domain = routerRule[1].match(/Host\(`(.+)`\)/)?.[1];
      if (!domain) return null;

      return {
        domain,
        service: this.extractServiceName(labels),
        port: parseInt(this.extractPort(labels)),
        enableSsl: this.hasSSLEnabled(labels),
        middlewares: this.extractMiddlewares(labels),
        customHeaders: this.extractCustomHeaders(labels),
      };
    } catch (error) {
      console.error('Failed to get Traefik configuration:', error);
      return null;
    }
  }

  private extractServiceName(labels: Record<string, string>): string {
    // Implementation for extracting service name from labels
    const serviceKey = Object.keys(labels).find(key => key.includes('.services.') && key.includes('.loadbalancer'));
    return serviceKey ? serviceKey.split('.')[3] : 'default';
  }

  private extractPort(labels: Record<string, string>): string {
    // Implementation for extracting port from labels
    const portLabel = Object.entries(labels).find(([key]) => key.includes('.server.port'));
    return portLabel ? portLabel[1] : '80';
  }

  private hasSSLEnabled(labels: Record<string, string>): boolean {
    return Object.keys(labels).some(key => key.includes('.tls.certresolver'));
  }

  private extractMiddlewares(labels: Record<string, string>): string[] {
    const middlewaresLabel = Object.entries(labels).find(([key]) => key.includes('.middlewares') && !key.includes('.middleware.'));
    return middlewaresLabel ? middlewaresLabel[1].split(',') : [];
  }

  private extractCustomHeaders(labels: Record<string, string>): Record<string, string> {
    const headers: Record<string, string> = {};
    Object.entries(labels).forEach(([key, value]) => {
      if (key.includes('.customresponseheaders.')) {
        const headerName = key.split('.customresponseheaders.')[1];
        headers[headerName] = value;
      }
    });
    return headers;
  }
}