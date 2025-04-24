import Docker from 'dockerode';
import { platform } from 'os';

export class DockerClient {
  private static instance: DockerClient;
  public docker: Docker;

  private constructor() {
    if (typeof window !== 'undefined') {
      throw new Error('DockerClient cannot be instantiated on the client side');
    }

    // Handle different Docker socket configurations based on OS
    const isWindows = platform() === 'win32';
    const config = isWindows
      ? {
          socketPath: '//./pipe/docker_engine',
        }
      : {
          socketPath: '/var/run/docker.sock',
        };

    this.docker = new Docker(config);
  }

  public static getInstance(): DockerClient {
    if (!DockerClient.instance) {
      DockerClient.instance = new DockerClient();
    }
    return DockerClient.instance;
  }

  // Keep existing methods but update to use new ContainerInfo type
  public async removeContainer(id: string, force: boolean = true) {
    const container = this.docker.getContainer(id);
    await container.remove({ force });
  }

  public async startContainer(id: string) {
    const container = this.docker.getContainer(id);
    await container.start();
  }

  public async stopContainer(id: string) {
    const container = this.docker.getContainer(id);
    await container.stop();
  }
}
