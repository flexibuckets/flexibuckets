const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Path to version.txt
const versionFile = path.join(__dirname, '..', 'version.txt');

// Read current version
function getCurrentVersion() {
    try {
        return fs.readFileSync(versionFile, 'utf8').trim();
    } catch (error) {
        console.error('Error reading version file:', error);
        process.exit(1);
    }
}

// Save new version
function saveVersion(version) {
    try {
        fs.writeFileSync(versionFile, version);
        console.log(`Version updated to: ${version}`);
    } catch (error) {
        console.error('Error saving version:', error);
        process.exit(1);
    }
}

// Bump version functions
function bumpMajor(version) {
    const [major, minor, patch] = version.split('.');
    return `${parseInt(major) + 1}.0.0`;
}

function bumpMinor(version) {
    const [major, minor, patch] = version.split('.');
    return `${major}.${parseInt(minor) + 1}.0`;
}

function bumpPatch(version) {
    const [major, minor, patch] = version.split('.');
    return `${major}.${minor}.${parseInt(patch) + 1}`;
}

// Main function
function main() {
    const args = process.argv.slice(2);
    if (args.length < 1) {
        console.log('Usage: node bump-version.js [major|minor|patch] [--commit]');
        console.log('');
        console.log('Options:');
        console.log('  --commit    Auto-commit and push the version bump');
        console.log('');
        console.log(`Current version: ${getCurrentVersion()}`);
        process.exit(1);
    }

    const type = args[0].toLowerCase();
    const shouldCommit = args.includes('--commit');
    const currentVersion = getCurrentVersion();

    let newVersion;
    switch (type) {
        case 'major':
            newVersion = bumpMajor(currentVersion);
            break;
        case 'minor':
            newVersion = bumpMinor(currentVersion);
            break;
        case 'patch':
            newVersion = bumpPatch(currentVersion);
            break;
        default:
            console.log('Invalid version type. Use: major, minor, or patch');
            process.exit(1);
    }

    saveVersion(newVersion);
    console.log(`\n${currentVersion} → ${newVersion}\n`);

    if (shouldCommit) {
        try {
            console.log('Committing version bump...');
            execSync('git add version.txt', { stdio: 'inherit' });
            execSync(`git commit -m "chore: bump version to ${newVersion}"`, { stdio: 'inherit' });
            execSync('git push origin main', { stdio: 'inherit' });
            console.log(`\n✅ Version ${newVersion} pushed! CI will build and create a release.`);
        } catch (error) {
            console.error('Error committing:', error.message);
            process.exit(1);
        }
    } else {
        console.log('Run with --commit to auto-push, or manually commit version.txt');
    }
}

main();
