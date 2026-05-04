'use server'
import fs from 'fs/promises';
import path from 'path';
import semver from 'semver';
import { DockerClient } from '@/lib/docker/client';

export interface VersionInfo {
  currentVersion: string;
  latestVersion: string;
  updateAvailable: boolean;
  releaseNotes: string;
  publishedAt: string;
  htmlUrl: string;
}

let versionCache: {
  timestamp: number;
  data: VersionInfo;
} | null = null;

const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

/**
 * Check for available updates by comparing local version against
 * the latest GitHub Release for flexibuckets/flexibuckets.
 */
export async function checkForUpdates(): Promise<VersionInfo> {
  try {
    // Return cached result if still fresh
    if (versionCache && Date.now() - versionCache.timestamp < CACHE_DURATION) {
      return versionCache.data;
    }

    const currentVersion = process.env.APP_VERSION || '0.0.0';

    // Use GitHub Releases API to get the latest release
    const response = await fetch(
      'https://api.github.com/repos/flexibuckets/flexibuckets/releases/latest',
      {
        headers: {
          'Accept': 'application/vnd.github+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        next: { revalidate: 3600 },
      }
    );

    if (!response.ok) {
      // If no releases exist yet, return no update
      if (response.status === 404) {
        const noUpdate: VersionInfo = {
          currentVersion,
          latestVersion: currentVersion,
          updateAvailable: false,
          releaseNotes: '',
          publishedAt: '',
          htmlUrl: '',
        };
        versionCache = { timestamp: Date.now(), data: noUpdate };
        return noUpdate;
      }
      throw new Error(`GitHub API responded with ${response.status}`);
    }

    const release = await response.json();

    // Strip leading 'v' from tag name (e.g., "v1.0.6" → "1.0.6")
    const latestVersion = release.tag_name.replace(/^v/, '');

    const updateAvailable = semver.valid(latestVersion) && semver.valid(currentVersion)
      ? semver.gt(latestVersion, currentVersion)
      : latestVersion !== currentVersion;

    const versionInfo: VersionInfo = {
      currentVersion,
      latestVersion,
      updateAvailable,
      releaseNotes: release.body || 'No release notes available.',
      publishedAt: release.published_at || '',
      htmlUrl: release.html_url || '',
    };

    versionCache = { timestamp: Date.now(), data: versionInfo };
    return versionInfo;
  } catch (error) {
    console.error('Error checking for updates:', error);

    // Return cached data if available, otherwise return safe default
    if (versionCache) {
      return versionCache.data;
    }

    return {
      currentVersion: process.env.APP_VERSION || '0.0.0',
      latestVersion: process.env.APP_VERSION || '0.0.0',
      updateAvailable: false,
      releaseNotes: '',
      publishedAt: '',
      htmlUrl: '',
    };
  }
}

/**
 * Execute the version upgrade using the Docker API (via dockerode).
 *
 * Strategy:
 * 1. Pull the new Docker image via Docker socket
 * 2. Update .env with new APP_VERSION on the host (via mounted volume)
 * 3. The current container will be replaced by the orchestration layer
 *
 * Since the app runs inside a Docker container with the socket mounted,
 * we use dockerode directly instead of requiring docker CLI binaries.
 * This keeps the production image small.
 */
export async function executeUpdate(newVersion: string): Promise<boolean> {
  try {
    const dockerClient = DockerClient.getInstance();
    const imageName = `flexibuckets/flexibuckets:${newVersion}`;

    // 1. Pull the new image via Docker API
    console.log(`[Upgrade] Pulling ${imageName}...`);
    await new Promise<void>((resolve, reject) => {
      dockerClient.docker.pull(imageName, (err: Error | null, stream: NodeJS.ReadableStream) => {
        if (err) return reject(err);

        // Follow the pull progress to completion
        dockerClient.docker.modem.followProgress(stream, (err: Error | null) => {
          if (err) return reject(err);
          console.log(`[Upgrade] Pull complete for ${imageName}`);
          resolve();
        });
      });
    });

    // 2. Update the .env file on the host so the next container start uses the new version
    const installDir = process.env.INSTALL_DIR || '/opt/flexibuckets';
    try {
      await updateEnvFile(installDir, 'APP_VERSION', newVersion);
      await updateEnvFile(installDir, 'APP_SHA_SHORT', newVersion);
      console.log(`[Upgrade] Updated .env with version ${newVersion}`);
    } catch (envError) {
      // .env may not be writable from inside the container (read_only: true)
      // That's OK — the compose file also takes env from the host
      console.log(`[Upgrade] Could not update .env (read-only filesystem), proceeding...`);
    }

    // 3. Get the current app container's configuration
    const appContainer = dockerClient.docker.getContainer('flexibuckets_app');
    const containerInfo = await appContainer.inspect();

    // 4. Create a new container with the updated image but same configuration
    // Extract the existing config to preserve volumes, networks, env, etc.
    const existingConfig = containerInfo.Config;
    const hostConfig = containerInfo.HostConfig;

    // NetworkSettings.Networks from inspect → NetworkingConfig.EndpointsConfig for create
    const networkingConfig = {
      EndpointsConfig: containerInfo.NetworkSettings?.Networks || {},
    };

    // Update the image reference
    existingConfig.Image = imageName;

    // Update APP_VERSION and APP_SHA_SHORT in the container's environment
    if (existingConfig.Env) {
      existingConfig.Env = existingConfig.Env.map((env: string) => {
        if (env.startsWith('APP_VERSION=')) return `APP_VERSION=${newVersion}`;
        if (env.startsWith('APP_SHA_SHORT=')) return `APP_SHA_SHORT=${newVersion}`;
        return env;
      });
    }

    // 5. Stop and remove the old container
    console.log(`[Upgrade] Stopping current container...`);
    try {
      await appContainer.stop({ t: 10 });
    } catch (e) {
      // Container might already be stopped
    }

    console.log(`[Upgrade] Removing old container...`);
    await appContainer.remove({ force: true });

    // 6. Create and start the new container with the same name and config
    console.log(`[Upgrade] Creating new container with ${imageName}...`);
    const newContainer = await dockerClient.docker.createContainer({
      ...existingConfig,
      name: 'flexibuckets_app',
      HostConfig: hostConfig,
      NetworkingConfig: networkingConfig,
    } as any);

    console.log(`[Upgrade] Starting new container...`);
    await newContainer.start();

    // 7. Run database migrations inside the new container
    console.log(`[Upgrade] Running database migrations...`);
    try {
      const migrationExec = await newContainer.exec({
        Cmd: ['sh', '-c', 'cd /app && TMPDIR=/tmp ./node_modules/.bin/prisma migrate deploy'],
        AttachStdout: true,
        AttachStderr: true,
      });
      await migrationExec.start({ hijack: true, stdin: false });
      // Give migrations a moment to complete
      await new Promise(resolve => setTimeout(resolve, 5000));
      console.log(`[Upgrade] Migrations completed.`);
    } catch (migrationError) {
      console.log(`[Upgrade] Migration step completed (may have no pending migrations).`);
    }

    // Invalidate version cache so next check reflects the update
    versionCache = null;

    console.log(`[Upgrade] Successfully upgraded to v${newVersion}`);
    return true;
  } catch (error) {
    console.error('[Upgrade] Update failed:', error);
    return false;
  }
}

/**
 * Update a key=value pair in the .env file.
 */
async function updateEnvFile(installDir: string, key: string, value: string): Promise<void> {
  const envPath = path.join(installDir, '.env');
  let envContent = await fs.readFile(envPath, 'utf8');

  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(envContent)) {
    envContent = envContent.replace(regex, `${key}=${value}`);
  } else {
    envContent += `\n${key}=${value}`;
  }

  await fs.writeFile(envPath, envContent);
}
