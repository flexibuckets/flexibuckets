'use server'
import { prisma } from "./prisma";
import { DockerClient } from "@/lib/docker/client";
import fs from 'fs/promises';
import path from 'path';
import semver from 'semver';

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

    const currentVersion = process.env.APP_VERSION || '0.0.0';
    const currentShaShort = process.env.APP_SHA_SHORT || '000000';

    const [versionResponse, commitResponse] = await Promise.all([
      fetch('https://raw.githubusercontent.com/flexibuckets/flexibuckets/main/version.txt'),
      fetch('https://api.github.com/repos/flexibuckets/flexibuckets/commits/main')
    ]);

    if (!versionResponse.ok || !commitResponse.ok) {
      throw new Error('Failed to fetch version information');
    }

    const latestVersion = (await versionResponse.text()).trim();
    const commitData = await commitResponse.json();
    const latestShaShort = commitData.sha.substring(0, 6);

    const isNewer = semver.gt(latestVersion, currentVersion);
    
    if (!isNewer && latestShaShort === currentShaShort) {
      versionCache = { timestamp: Date.now(), data: null };
      return null;
    }

    const migrationsResponse = await fetch(
      'https://raw.githubusercontent.com/flexibuckets/flexibuckets/main/prisma/migrations/migration_manifest.json'
    );
    
    const migrations = await migrationsResponse.json();
    const requiredMigrations = migrations.some((migration: any) => 
      semver.gt(migration.version, currentVersion)
    );

    const changelogResponse = await fetch(
      'https://raw.githubusercontent.com/flexibuckets/flexibuckets/main/CHANGELOG.md'
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

export async function executeUpdate(newVersion: string): Promise<boolean> {
  try {
    await updateEnvFile('APP_VERSION', newVersion);
    
    const dockerClient = DockerClient.getInstance();
    const appContainer = await dockerClient.docker.getContainer('flexibuckets_app');

    // Pull the new image
    await dockerClient.docker.pull(`flexibuckets/flexibuckets:${newVersion}`);

    // Stop the current container
    await appContainer.stop();

    // Remove the old container
    await appContainer.remove();

    // Create and start a new container with the updated image
    const container = await dockerClient.docker.createContainer({
      Image: `flexibuckets/flexibuckets:${newVersion}`,
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

