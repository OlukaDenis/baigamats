const fs = require('fs');
const path = require('path');

const wmGradlePath = path.join(
  __dirname,
  '..',
  'node_modules',
  '@nozbe',
  'watermelondb',
  'native',
  'android',
  'build.gradle'
);

if (fs.existsSync(wmGradlePath)) {
  let content = fs.readFileSync(wmGradlePath, 'utf8');
  if (!content.includes('buildConfig = true')) {
    console.log('[patch-watermelondb] Patching WatermelonDB build.gradle to enable buildConfig = true');
    content = content.replace(
      /defaultConfig\s*\{[^}]*\}/s,
      match => `${match}\n\n    buildFeatures {\n        buildConfig = true\n    }`
    );
    fs.writeFileSync(wmGradlePath, content, 'utf8');
  } else {
    console.log('[patch-watermelondb] WatermelonDB build.gradle already patched.');
  }
}
