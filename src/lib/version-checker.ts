import { prisma } from "./prisma";

interface Version {
  version: string;
  requiredMigrations: boolean;
  changeLog: string;
  dockerImage: string;
}

// Cache the version check results
let versionCache: {
  timestamp: number;
  data: Version | null;
} | null = null;

const CACHE_DURATION = 1000 * 60 * 60; // 1 hour

export async function checkForUpdates(): Promise<Version | null> {
  try {
    // Check cache first
    if (versionCache && Date.now() - versionCache.timestamp < CACHE_DURATION) {
      return versionCache.data;
    }

    // Fetch the latest version from GitHub API (public endpoint)
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
      // Handle rate limiting
      if (response.status === 403) {
        console.warn('GitHub API rate limit reached. Using cached data if available.');
        return versionCache?.data || null;
      }
      throw new Error('Failed to fetch version info');
    }

    const data = await response.json();
    const latestVersion = data.sha.substring(0, 6);
    
    // Get current version from .env or similar config
    const currentVersion = process.env.APP_VERSION || '000000';

    if (latestVersion === currentVersion) {
      versionCache = {
        timestamp: Date.now(),
        data: null
      };
      return null;
    }

    // Check for migrations using the raw GitHub content URL (no auth needed)
    const migrationsResponse = await fetch(
      `https://raw.githubusercontent.com/flexibuckets/flexibuckets/main/prisma/migrations/migration_manifest.json`
    );
    
    const migrations = await migrationsResponse.json();
    const requiredMigrations = migrations.some((migration: any) => 
      migration.version > currentVersion
    );

    // Fetch changelog from raw GitHub content
    const changelogResponse = await fetch(
      `https://raw.githubusercontent.com/flexibuckets/flexibuckets/main/CHANGELOG.md`
    );
    const changeLog = await changelogResponse.text();

    const versionInfo = {
      version: latestVersion,
      requiredMigrations,
      changeLog,
      dockerImage: `flexibuckets/flexibuckets:${latestVersion}`
    };

    // Update cache
    versionCache = {
      timestamp: Date.now(),
      data: versionInfo
    };

    return versionInfo;
  } catch (error) {
    console.error('Error checking for updates:', error);
    // Return cached data if available when there's an error
    return versionCache?.data || null;
  }
}

// Function to execute update
export async function executeUpdate(newVersion: string): Promise<boolean> {
    try {
      // Update version in .env file first
      await updateEnvFile('APP_VERSION', newVersion);
      
      // Use docker-compose commands
      const commands = [
        // Pull new images
        'docker-compose pull',
        
        // Run migrations if needed
        ...(await checkMigrationsNeeded() ? [
          'docker-compose run --rm app npx prisma generate',
          'docker-compose run --rm app npx prisma migrate deploy'
        ] : []),
        
        // Recreate containers with new version
        'docker-compose up -d --force-recreate app'
      ];
  
      for (const command of commands) {
        await executeCommand(command);
      }
      
      return true;
    } catch (error) {
      console.error('Update failed:', error);
      return false;
    }
  }
  
  async function executeCommand(command: string): Promise<void> {
    const { exec } = require('child_process');
    return new Promise((resolve, reject) => {
      exec(command, {
        env: {
          ...process.env,
          PATH: process.env.PATH,
          DOCKER_HOST: 'unix:///var/run/docker.sock'
        }
      }, (error: Error | null, stdout: string, stderr: string) => {
        if (error) {
          console.error(`Command failed: ${command}`);
          console.error(`stdout: ${stdout}`);
          console.error(`stderr: ${stderr}`);
          reject(error);
          return;
        }
        resolve();
      });
    });
  }
  
async function updateEnvFile(key: string, value: string): Promise<void> {
  const fs = require('fs');
  const envPath = '.env';
  
  const envContent = fs.readFileSync(envPath, 'utf8');
  const updatedContent = envContent.replace(
    new RegExp(`${key}=.*`),
    `${key}=${value}`
  );
  
  fs.writeFileSync(envPath, updatedContent);
}

async function checkMigrationsNeeded(): Promise<boolean> {
  try {
    const status = await prisma.$executeRaw`SELECT 1`;
    return false;
  } catch (error) {
    return true;
  }
}