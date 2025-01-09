import { prisma } from "./prisma";
import { DockerClient } from "@/lib/docker/client";
import fs from 'fs/promises';
import path from 'path';

interface Version {
  version: string;
  shaShort: string;
  requiredMigrations: boolean;
  changeLog: string;
  dockerImage: string;
}

let versionCache: {
  timestamp: number;
  data: Version | null;
} | null = null;

const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export async function checkForUpdates(): Promise<Version | null> {
  try {
    if (versionCache && Date.now() - versionCache.timestamp < CACHE_DURATION) {
      return versionCache.data;
    }

    const response = await fetch(
      'https://api.github.com/repos/flexibuckets/flexibuckets/commits/main',
      {
        headers: {
          'Accept': 'application/vnd.github.v3+json',
          'User-Agent': 'FlexiBuckets-Self-Hosted'
        }
      }
    );
    
    if (!response.ok) {
      if (response.status === 403) {
        console.warn('GitHub API rate limit reached. Using cached data if available.');
        return versionCache?.data || null;
      }
      throw new Error('Failed to fetch version info');
    }

    const data = await response.json();
    const latestShaShort = data.sha.substring(0, 6);
    
    const versionResponse = await fetch(
      'https://raw.githubusercontent.com/flexibuckets/flexibuckets/main/version.txt'
    );
    const latestVersion = await versionResponse.text();

    const currentShaShort = process.env.APP_SHA_SHORT || '000000';
    const currentVersion = process.env.APP_VERSION || '0.0.0';

    if (latestShaShort === currentShaShort && latestVersion === currentVersion) {
      versionCache = { timestamp: Date.now(), data: null };
      return null;
    }

    const migrationsResponse = await fetch(
      `https://raw.githubusercontent.com/flexibuckets/flexibuckets/main/prisma/migrations/migration_manifest.json`
    );
    
    const migrations = await migrationsResponse.json();
    const requiredMigrations = migrations.some((migration: any) => 
      migration.version > currentVersion
    );

    const changelogResponse = await fetch(
      `https://raw.githubusercontent.com/flexibuckets/flexibuckets/main/CHANGELOG.md`
    );
    const changeLog = await changelogResponse.text();

    const versionInfo: Version = {
      version: latestVersion,
      shaShort: latestShaShort,
      requiredMigrations,
      changeLog,
      dockerImage: `flexibuckets/flexibuckets:${latestShaShort}`
    };

    versionCache = { timestamp: Date.now(), data: versionInfo };
    return versionInfo;
  } catch (error) {
    console.error('Error checking for updates:', error);
    return versionCache?.data || null;
  }
}

export async function executeUpdate(newVersion: string, newShaShort: string): Promise<boolean> {
  try {
    await updateEnvFile('APP_VERSION', newVersion);
    await updateEnvFile('APP_SHA_SHORT', newShaShort);
    
    const dockerClient = DockerClient.getInstance();
    const appContainer = await dockerClient.docker.getContainer('flexibuckets_app');

    // Pull the new image
    await dockerClient.docker.pull(`flexibuckets/flexibuckets:${newShaShort}`);

    // Stop the current container
    await appContainer.stop();

    // Remove the old container
    await appContainer.remove();

    // Create and start a new container with the updated image
    const container = await dockerClient.docker.createContainer({
      Image: `flexibuckets/flexibuckets:${newShaShort}`,
      name: 'flexibuckets_app',
      // Add other necessary container options here
    });

    await container.start();

    // Run migrations if needed
    if (await checkMigrationsNeeded()) {
      await runMigrations(container);
    }

    return true;
  } catch (error) {
    console.error('Update failed:', error);
    return false;
  }
}

async function updateEnvFile(key: string, value: string): Promise<void> {
  const envPath = path.join(process.cwd(), '.env');
  let envContent = await fs.readFile(envPath, 'utf8');
  
  const regex = new RegExp(`^${key}=.*$`, 'm');
  if (regex.test(envContent)) {
    envContent = envContent.replace(regex, `${key}=${value}`);
  } else {
    envContent += `\n${key}=${value}`;
  }
  
  await fs.writeFile(envPath, envContent);
}

async function checkMigrationsNeeded(): Promise<boolean> {
  try {
    await prisma.$executeRaw`SELECT 1`;
    return false;
  } catch (error) {
    return true;
  }
}

async function runMigrations(container: any): Promise<void> {
  await container.exec({
    Cmd: ['npx', 'prisma', 'migrate', 'deploy'],
    AttachStdout: true,
    AttachStderr: true
  });
}

