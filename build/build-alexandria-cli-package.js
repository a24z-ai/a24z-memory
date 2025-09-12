#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';

// Build script for @a24z/alexandria-cli package
async function buildAlexandriaCLIPackage() {
  console.log('Building @a24z/alexandria-cli package...');
  
  // Copy package-alexandria-cli.json to dist as package.json
  const packageJson = JSON.parse(fs.readFileSync('package-alexandria-cli.json', 'utf8'));
  
  // Ensure dist directory exists
  if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist', { recursive: true });
  }
  
  // Write package.json to dist for publishing
  fs.writeFileSync(
    path.join('dist', 'package.json'),
    JSON.stringify(packageJson, null, 2)
  );
  
  // Copy README if it exists
  if (fs.existsSync('README.md')) {
    fs.copyFileSync('README.md', path.join('dist', 'README.md'));
  }
  
  // Copy LICENSE
  if (fs.existsSync('LICENSE')) {
    fs.copyFileSync('LICENSE', path.join('dist', 'LICENSE'));
  }
  
  // Copy templates directory
  if (fs.existsSync('templates')) {
    fs.cpSync('templates', path.join('dist', 'templates'), { recursive: true });
  }
  
  console.log('✅ @a24z/alexandria-cli package prepared in dist/');
  console.log('To publish: cd dist && npm publish');
}

buildAlexandriaCLIPackage().catch(console.error);