'use server'
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
 * Execute the version upgrade using a sidecar updater container.
 * 
 * Strategy:
 * 1. Pull the new Docker image via Docker socket
 * 2. Spawn a temporary "updater" container (docker:cli) that:
 *    a. Waits for the HTTP response to reach the client
 *    b. Updates .env with the new version
 *    c. Runs `docker compose up -d --no-deps app` to recreate the app container
 *    d. Runs database migrations in the new container
 *    e. Auto-removes itself
 * 
 * This avoids the fatal flaw of the previous approach: the app container
 * was trying to stop ITSELF, which killed the upgrade process mid-flight.
 * The sidecar handles the swap from outside.
 */
export async function executeUpdate(newVersion: string): Promise<boolean> {
  try {
    const dockerClient = DockerClient.getInstance();
    const imageName = `flexibuckets/flexibuckets:${newVersion}`;
    const installDir = process.env.INSTALL_DIR || '/opt/flexibuckets';

    // 1. Pull the new app image
    console.log(`[Upgrade] Pulling ${imageName}...`);
    await pullImage(dockerClient, imageName);
    console.log(`[Upgrade] Pull complete for ${imageName}`);

    // 2. Pull the docker:cli image for the updater sidecar
    console.log(`[Upgrade] Pulling updater image (docker:cli)...`);
    await pullImage(dockerClient, 'docker:cli');
    console.log(`[Upgrade] Updater image ready`);

    // 3. Remove any leftover updater container from a previous attempt
    try {
      const existing = dockerClient.docker.getContainer('flexibuckets_updater');
      await existing.remove({ force: true });
    } catch (e) {
      // No leftover container — that's expected
    }

    // 4. Create the updater sidecar container
    // It will wait, update .env, recreate the app container, run migrations, then self-remove
    const updateScript = [
      'set -e',
      'echo "[Updater] Waiting for HTTP response to reach client..."',
      'sleep 5',
      '',
      '# Update .env with new version',
      'cd /flexibuckets',
      `sed -i "s/^APP_SHA_SHORT=.*/APP_SHA_SHORT=${newVersion}/" .env`,
      `sed -i "s/^APP_VERSION=.*/APP_VERSION=${newVersion}/" .env`,
      `echo "[Updater] Updated .env to version ${newVersion}"`,
      '',
      '# Recreate the app container with the new image',
      'echo "[Updater] Recreating app container..."',
      'docker compose up -d --no-deps app',
      '',
      '# Wait for the new container to be healthy',
      'echo "[Updater] Waiting for new container to start..."',
      'sleep 15',
      '',
      '# Run database migrations',
      'echo "[Updater] Running database migrations..."',
      `docker exec flexibuckets_app sh -c 'cd /app && TMPDIR=/tmp ./node_modules/.bin/prisma migrate deploy' || echo "[Updater] Migration step done (may have no pending migrations)"`,
      '',
      `echo "[Updater] Upgrade to v${newVersion} complete!"`,
    ].join('\n');

    console.log(`[Upgrade] Creating updater sidecar...`);
    const updater = await dockerClient.docker.createContainer({
      Image: 'docker:cli',
      name: 'flexibuckets_updater',
      Cmd: ['sh', '-c', updateScript],
      HostConfig: {
        Binds: [
          '/var/run/docker.sock:/var/run/docker.sock',
          `${installDir}:/flexibuckets:rw`,
        ],
        AutoRemove: true,
      },
    } as any);

    // 5. Start the updater — it runs in the background
    console.log(`[Upgrade] Starting updater sidecar...`);
    await updater.start();

    // Invalidate version cache
    versionCache = null;

    console.log(`[Upgrade] Updater launched — app will restart in ~5 seconds`);
    return true;
  } catch (error) {
    console.error('[Upgrade] Update failed:', error);
    return false;
  }
}

/**
 * Pull a Docker image and wait for completion.
 */
function pullImage(dockerClient: DockerClient, imageName: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    dockerClient.docker.pull(imageName, (err: Error | null, stream: NodeJS.ReadableStream) => {
      if (err) return reject(err);
      dockerClient.docker.modem.followProgress(stream, (err: Error | null) => {
        if (err) return reject(err);
        resolve();
      });
    });
  });
}
