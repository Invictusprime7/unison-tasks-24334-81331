#!/usr/bin/env node

/**
 * Creates unison_tasks_review_bundle.zip with only important files
 * Cross-platform script that works on Windows, macOS, and Linux
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

// Files and directories to include
const includes = [
  'README*',
  'LICENSE*',
  'package.json',
  'package-lock.json',
  'pnpm-lock.yaml',
  'yarn.lock',
  'bun.lockb',
  'tsconfig*.json',
  'vite.config.*',
  'next.config.*',
  'tailwind.config.*',
  'postcss.config.*',
  'eslint*',
  '.eslintrc*',
  '.prettierrc*',
  'prettier*',
  '.env.example',
  'components.json',
  'supabase/**',
  'prisma/**',
  'drizzle.config.*',
  'src/**',
  'public/**',
  '.github/workflows/**',
  'api/**',
  'scripts/**',
  'preview-service/**',
];

// Directories to exclude
const excludes = [
  'node_modules',
  'dist',
  'build',
  '.next',
  '.vercel',
  'coverage',
  '.git',
  '.review_bundle',
];

const bundleDir = '.review_bundle';
const zipFile = 'unison_tasks_review_bundle.zip';

function cleanupBundleDir() {
  if (fs.existsSync(bundleDir)) {
    fs.rmSync(bundleDir, { recursive: true, force: true });
  }
  fs.mkdirSync(bundleDir, { recursive: true });
}

function shouldExclude(filePath) {
  const parts = filePath.split(path.sep);
  return excludes.some(exclude => parts.includes(exclude));
}

function matchesPattern(filePath, pattern) {
  // Normalize path separators for cross-platform compatibility
  const normalizedPath = filePath.replace(/\\/g, '/');
  
  // Convert glob pattern to regex
  let regexPattern = pattern
    .replace(/\./g, '\\.')
    .replace(/\*\*/g, '{{DOUBLESTAR}}')
    .replace(/\*/g, '[^/]+')
    .replace(/{{DOUBLESTAR}}/g, '.*');
  
  const regex = new RegExp(`^${regexPattern}$`);
  return regex.test(normalizedPath) || regex.test(path.basename(filePath));
}

function copyFiles(srcDir, destDir) {
  const items = fs.readdirSync(srcDir, { withFileTypes: true });
  
  for (const item of items) {
    const srcPath = path.join(srcDir, item.name);
    const relativePath = path.relative('.', srcPath);
    
    // Skip if should be excluded
    if (shouldExclude(relativePath)) {
      continue;
    }
    
    // Check if matches any include pattern
    const matchesInclude = includes.some(pattern => matchesPattern(relativePath, pattern));
    
    if (matchesInclude) {
      const destPath = path.join(destDir, relativePath);
      
      if (item.isDirectory()) {
        fs.mkdirSync(destPath, { recursive: true });
        copyFiles(srcPath, destDir);
      } else if (item.isFile()) {
        const destFileDir = path.dirname(destPath);
        fs.mkdirSync(destFileDir, { recursive: true });
        fs.copyFileSync(srcPath, destPath);
      }
    } else if (item.isDirectory()) {
      // Recursively check subdirectories
      copyFiles(srcPath, destDir);
    }
  }
}

function createZip() {
  // Remove existing zip file if it exists
  if (fs.existsSync(zipFile)) {
    fs.unlinkSync(zipFile);
  }
  
  try {
    // Try to use native zip command (works on Unix and Windows with Git Bash)
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      // On Windows, use PowerShell's Compress-Archive
      const psCommand = `Compress-Archive -Path "${bundleDir}/*" -DestinationPath "${zipFile}" -Force`;
      execSync(psCommand, { shell: 'powershell.exe', stdio: 'inherit' });
    } else {
      // On Unix-like systems, use zip command
      execSync(`cd "${bundleDir}" && zip -r "../${zipFile}" .`, { stdio: 'inherit' });
    }
    
    console.log(`Created: ${zipFile}`);
  } catch (error) {
    console.error('Error creating zip file:', error.message);
    
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      console.error('\nPlease ensure PowerShell is available on your system.');
    } else {
      console.error('\nPlease ensure zip utility is installed on your system.');
    }
    process.exit(1);
  }
}

function main() {
  try {
    console.log('Creating review bundle...');
    
    // Clean up and create bundle directory
    cleanupBundleDir();
    
    // Copy files matching patterns
    console.log('Copying files...');
    copyFiles('.', bundleDir);
    
    // Create zip file
    console.log('Creating zip archive...');
    createZip();
    
    // Clean up bundle directory
    fs.rmSync(bundleDir, { recursive: true, force: true });
    
    console.log('Done!');
  } catch (error) {
    console.error('Error creating review bundle:', error.message);
    process.exit(1);
  }
}

main();
