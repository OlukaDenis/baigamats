#!/usr/bin/env node

/**
 * Baigamats Swift Android Build Script
 * Builds APKs and App Bundles (AAB) for different flavors and environments.
 *
 * Usage:
 *   node scripts/build-android.js --app <sacco|horeca|all> --env <dev|staging|prod> --type <apk|bundle|all>
 *
 * Examples:
 *   node scripts/build-android.js --app horeca --env prod --type apk
 *   node scripts/build-android.js --app sacco --env prod --type bundle
 *   node scripts/build-android.js --app all --env prod --type apk
 */

const { spawnSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const rootDir = path.resolve(__dirname, '..');
const androidDir = path.join(rootDir, 'android');
const versionsPath = path.join(rootDir, 'app.versions.json');

// Parse CLI arguments
const args = process.argv.slice(2);
function getArg(flag, alias, defaultValue) {
  const index = args.findIndex(a => a === flag || a === alias);
  if (index !== -1 && args[index + 1] && !args[index + 1].startsWith('-')) {
    return args[index + 1].toLowerCase();
  }
  const inline = args.find(a => a.startsWith(`${flag}=`) || (alias && a.startsWith(`${alias}=`)));
  if (inline) {
    return inline.split('=')[1].toLowerCase();
  }
  return defaultValue;
}

const targetApp = getArg('--app', '-a', 'horeca'); // 'sacco', 'horeca', 'all'
const targetEnv = getArg('--env', '-e', 'prod');   // 'dev', 'staging', 'prod'
const targetType = getArg('--type', '-t', 'apk');  // 'apk', 'bundle', 'aab', 'all'
const shouldClean = args.includes('--clean') || args.includes('-c');

// Validate inputs
const validApps = ['sacco', 'horeca', 'all'];
const validEnvs = ['dev', 'staging', 'prod'];
const validTypes = ['apk', 'bundle', 'aab', 'all'];

if (!validApps.includes(targetApp)) {
  console.error(`Invalid --app argument "${targetApp}". Allowed: ${validApps.join(', ')}`);
  process.exit(1);
}
if (!validEnvs.includes(targetEnv)) {
  console.error(`Invalid --env argument "${targetEnv}". Allowed: ${validEnvs.join(', ')}`);
  process.exit(1);
}
if (!validTypes.includes(targetType)) {
  console.error(`Invalid --type argument "${targetType}". Allowed: ${validTypes.join(', ')}`);
  process.exit(1);
}

// Load versions
let versions = {};
if (fs.existsSync(versionsPath)) {
  try {
    versions = JSON.parse(fs.readFileSync(versionsPath, 'utf8'));
  } catch (err) {
    console.warn('Warning: Could not parse app.versions.json:', err.message);
  }
}

// Capitalization helper
function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// Determine tasks to run
const apps = targetApp === 'all' ? ['sacco', 'horeca'] : [targetApp];
const types = (targetType === 'all')
  ? ['apk', 'bundle']
  : (targetType === 'aab' ? ['bundle'] : [targetType]);

const tasks = [];
for (const app of apps) {
  for (const type of types) {
    const buildType = targetEnv === 'dev' ? 'Debug' : 'Release';
    const taskPrefix = type === 'apk' ? 'assemble' : 'bundle';
    const taskName = `${taskPrefix}${capitalize(app)}${capitalize(targetEnv)}${buildType}`;
    const ver = versions[app]?.[targetEnv] || { versionCode: 1, versionName: '1.0.0' };

    tasks.push({
      app,
      env: targetEnv,
      type,
      buildType,
      taskName,
      versionCode: ver.versionCode,
      versionName: ver.versionName,
    });
  }
}

console.log('\n======================================================');
console.log('             Baigamats Swift Build Tool               ');
console.log('======================================================');
tasks.forEach(t => {
  console.log(`• [${t.app.toUpperCase()}] ${t.type.toUpperCase()} | Env: ${t.env} (${t.buildType}) | Ver: ${t.versionName} (${t.versionCode})`);
  console.log(`  Gradle task: ${t.taskName}`);
});
console.log('======================================================\n');

// Determine gradle executable
const isWindows = process.platform === 'win32';
const gradleCmd = isWindows ? 'gradlew.bat' : './gradlew';
const fullGradlePath = path.join(androidDir, gradleCmd);

if (!fs.existsSync(fullGradlePath)) {
  console.error(`Error: Gradle wrapper not found at ${fullGradlePath}`);
  process.exit(1);
}

// Clean if requested
if (shouldClean) {
  console.log('Cleaning previous build artifacts...');
  const cleanResult = spawnSync(fullGradlePath, ['clean'], {
    cwd: androidDir,
    stdio: 'inherit',
    shell: isWindows,
  });
  if (cleanResult.status !== 0) {
    console.error('Clean failed.');
    process.exit(cleanResult.status || 1);
  }
}

// Execute tasks
const startTime = Date.now();
for (const t of tasks) {
  console.log(`\n>>> Building ${t.app.toUpperCase()} ${t.type.toUpperCase()} (${t.env} ${t.buildType})...`);
  console.log(`Executing: ${gradleCmd} ${t.taskName}\n`);

  const buildResult = spawnSync(fullGradlePath, [t.taskName], {
    cwd: androidDir,
    stdio: 'inherit',
    shell: isWindows,
  });

  if (buildResult.status !== 0) {
    console.error(`\nBuild failed for task: ${t.taskName} (Exit code: ${buildResult.status})`);
    process.exit(buildResult.status || 1);
  }
}

const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\n======================================================`);
console.log(` BUILD SUCCESSFUL in ${elapsedSec}s!`);
console.log(`======================================================`);

// Locate and print output files
console.log('\nGenerated Artifacts:');
tasks.forEach(t => {
  const flavorPath = `${t.app}${capitalize(t.env)}${t.buildType}`;
  if (t.type === 'apk') {
    const apkDir = path.join(androidDir, 'app', 'build', 'outputs', 'apk', t.app, t.env, t.buildType.toLowerCase());
    const fallbackDir = path.join(androidDir, 'app', 'build', 'outputs', 'apk');
    printOutputs(apkDir, fallbackDir, '.apk', `${t.app} (${t.env})`);
  } else {
    const bundleDir = path.join(androidDir, 'app', 'build', 'outputs', 'bundle', flavorPath);
    const fallbackDir = path.join(androidDir, 'app', 'build', 'outputs', 'bundle');
    printOutputs(bundleDir, fallbackDir, '.aab', `${t.app} (${t.env})`);
  }
});
console.log('======================================================\n');

function printOutputs(targetDir, fallbackDir, extension, label) {
  let searchDir = fs.existsSync(targetDir) ? targetDir : (fs.existsSync(fallbackDir) ? fallbackDir : null);
  if (!searchDir) {
    console.log(`  [${label}] Check android/app/build/outputs/ for outputs`);
    return;
  }

  function findFiles(dir) {
    let results = [];
    try {
      const list = fs.readdirSync(dir);
      list.forEach(file => {
        const full = path.join(dir, file);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          results = results.concat(findFiles(full));
        } else if (file.endsWith(extension)) {
          results.push({ path: full, size: (stat.size / (1024 * 1024)).toFixed(2) + ' MB' });
        }
      });
    } catch {
      // ignore
    }
    return results;
  }

  const files = findFiles(searchDir);
  if (files.length > 0) {
    files.forEach(f => {
      const rel = path.relative(rootDir, f.path);
      console.log(`  ✓ [${label}] ${rel} (${f.size})`);
    });
  } else {
    console.log(`  [${label}] Output folder: ${path.relative(rootDir, searchDir)}`);
  }
}
