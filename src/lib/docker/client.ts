import Docker from 'dockerode';
import {  platform } from 'os';


export interface ContainerInfo {
  id: string;
  name: string;
  status: string;
  accessUrl: string;
  network: string;
  container_id: string;
  ports: {
    [key: string]: number;
  };
  state: string;
}

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
          socketPath: '//./pipe/docker_engine'
        }
      : {
          socketPath: '/var/run/docker.sock'
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

  public async getContainerLogs(id: string, tail: number = 100) {
    const container = this.docker.getContainer(id);
    const logs = await container.logs({
      stdout: true,
      stderr: true,
      tail
    });
    return logs.toString();
  }
}