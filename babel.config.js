const fs = require('fs');
const path = require('path');

// Populate process.env from appropriate .env file if present
const lifecycle = process.env.npm_lifecycle_event || '';
let defaultEnv = '.env';
if (lifecycle.includes('horeca:staging')) defaultEnv = '.env.horeca.staging';
else if (lifecycle.includes('horeca:release')) defaultEnv = '.env.horeca.prod';
else if (lifecycle.includes('horeca')) defaultEnv = '.env.horeca.dev';
else if (lifecycle.includes('sacco:staging')) defaultEnv = '.env.sacco.staging';
else if (lifecycle.includes('sacco:release')) defaultEnv = '.env.sacco.prod';
else if (lifecycle.includes('sacco')) defaultEnv = '.env.sacco.dev';

const envFileName = process.env.ENVFILE || (fs.existsSync(path.resolve(__dirname, defaultEnv)) ? defaultEnv : '.env');
const envFilePath = path.resolve(__dirname, envFileName);
if (fs.existsSync(envFilePath)) {
  const envContent = fs.readFileSync(envFilePath, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#')) {
      const eqIdx = trimmed.indexOf('=');
      if (eqIdx > 0) {
        const key = trimmed.slice(0, eqIdx).trim();
        const val = trimmed.slice(eqIdx + 1).trim();
        process.env[key] = val;
      }
    }
  });
}

function inlineEnvPlugin({ types: t }) {
  return {
    name: 'transform-inline-custom-env',
    visitor: {
      MemberExpression(p) {
        if (
          p.node.object &&
          p.node.object.type === 'MemberExpression' &&
          p.node.object.object &&
          p.node.object.object.name === 'process' &&
          p.node.object.property &&
          p.node.object.property.name === 'env'
        ) {
          const key = p.node.property.name || p.node.property.value;
          if (key && process.env[key] !== undefined) {
            p.replaceWith(t.valueToNode(process.env[key]));
          }
        }
      },
    },
  };
}

function pathAliasPlugin() {
  const aliases = {
    '@shared': path.resolve(__dirname, 'src/shared'),
    '@sacco': path.resolve(__dirname, 'src/apps/sacco'),
    '@horeca': path.resolve(__dirname, 'src/apps/horeca'),
  };

  function rewriteSource(p, state) {
    if (!p.node.source) return;
    const source = p.node.source.value;
    const currentFile = state.file.opts.filename;
    if (!currentFile) return;

    for (const [prefix, targetDir] of Object.entries(aliases)) {
      if (source === prefix || source.startsWith(prefix + '/')) {
        const relSub = source === prefix ? '' : source.slice(prefix.length + 1);
        const absTarget = relSub ? path.join(targetDir, relSub) : targetDir;
        let relToTarget = path.relative(path.dirname(currentFile), absTarget).replace(/\\/g, '/');
        if (!relToTarget.startsWith('.')) {
          relToTarget = './' + relToTarget;
        }
        p.node.source.value = relToTarget;
        break;
      }
    }
  }

  return {
    name: 'custom-path-alias-resolver',
    visitor: {
      ImportDeclaration: rewriteSource,
      ExportNamedDeclaration: rewriteSource,
      ExportAllDeclaration: rewriteSource,
    },
  };
}

module.exports = {
  presets: [
    ['module:@react-native/babel-preset', { jsxImportSource: 'nativewind' }],
    // Also registers react-native-reanimated/plugin (→ react-native-worklets/plugin),
    // so it must not be added again below.
    'nativewind/babel',
  ],
  plugins: [
    ['@babel/plugin-proposal-decorators', { version: 'legacy' }],
    '@babel/plugin-transform-export-namespace-from',
    inlineEnvPlugin,
    pathAliasPlugin,
  ],
};
