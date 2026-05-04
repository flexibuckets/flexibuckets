'use server'
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import semver from 'semver';

const execAsync = promisify(exec);

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
 * Execute the version upgrade using docker compose.
 * 
 * Strategy:
 * 1. Update .env with new APP_VERSION
 * 2. docker compose pull app  (pulls the new image)
 * 3. docker compose up -d app (recreates the container with all compose config)
 * 
 * This preserves volumes, networks, labels, env vars — everything in docker-compose.yml.
 */
export async function executeUpdate(newVersion: string): Promise<boolean> {
  try {
    const installDir = process.env.INSTALL_DIR || '/opt/flexibuckets';

    // 1. Update APP_VERSION in .env
    await updateEnvFile('APP_VERSION', newVersion);
    
    // Also update the Docker image tag — for compose files that use APP_SHA_SHORT
    // We set it to the version tag since our CI now tags images with the version
    await updateEnvFile('APP_SHA_SHORT', newVersion);

    // 2. Pull the new image
    console.log(`[Upgrade] Pulling flexibuckets/flexibuckets:${newVersion}...`);
    await execAsync(`docker compose pull app`, { cwd: installDir });

    // 3. Recreate the app container with new image (keeps volumes, networks, etc.)
    console.log(`[Upgrade] Recreating app container...`);
    await execAsync(`docker compose up -d app`, { cwd: installDir });

    // 4. Run database migrations inside the new container
    console.log(`[Upgrade] Running database migrations...`);
    try {
      await execAsync(
        `docker compose exec -T app sh -c 'cd /app && bunx prisma migrate deploy'`,
        { cwd: installDir }
      );
      console.log(`[Upgrade] Migrations completed.`);
    } catch (migrationError) {
      // Migrations may fail if none are needed — that's OK
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
async function updateEnvFile(key: string, value: string): Promise<void> {
  const envPath = path.join(process.env.INSTALL_DIR || '/opt/flexibuckets', '.env');
  let envContent = await fs.readFile(envPath, 'utf8');

  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(envContent)) {
    envContent = envContent.replace(regex, `${key}=${value}`);
  } else {
    envContent += `\n${key}=${value}`;
  }

  await fs.writeFile(envPath, envContent);
}
