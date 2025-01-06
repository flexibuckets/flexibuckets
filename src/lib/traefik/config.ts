import fs from 'fs/promises';
import path from 'path';

export class TraefikManager {
  private static instance: TraefikManager;
  private configPath: string;

  private constructor() {
    if (typeof window !== 'undefined') {
      throw new Error('TraefikManager cannot be instantiated on the client side');
    }
    this.configPath = process.env.TRAEFIK_CONFIG_PATH || '/etc/traefik/config';
  }

  public static getInstance(): TraefikManager {
    if (!TraefikManager.instance) {
      TraefikManager.instance = new TraefikManager();
    }
    return TraefikManager.instance;
  }

  async configureDomain(domain: string, service: string, port: number) {
    const config = {
      http: {
        routers: {
          [`${service}-router`]: {
            rule: `Host(\`${domain}\`)`,
            service: service,
            tls: {
              certResolver: 'letsencrypt'
            }
          }
        },
        services: {
          [service]: {
            loadBalancer: {
              servers: [{ url: `http://localhost:${port}` }]
            }
          }
        }
      }
    };

    await fs.writeFile(
      path.join(this.configPath, `${service}.yml`),
      JSON.stringify(config, null, 2)
    );
  }
}