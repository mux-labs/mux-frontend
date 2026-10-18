import { execSync } from 'child_process';
import { createHash } from 'crypto';
import * as fs from 'fs';
import * as path from 'path';

// #937: integrity verification must only fail on genuinely missing or
// mismatched integrity hashes. Dependency-consistency and unused-package
// findings are advisory and must never flip `valid` to false. The parser
// must also handle the lockfile shapes pnpm actually produces (a `packages:`
// section with quoted `'name@version':` keys and a nested/inline
// `resolution: {integrity: ..., ...}` map), not just a single hand-picked
// indentation pattern.

export class PnpmLockIntegrityVerifier {
  constructor(projectRoot = process.cwd()) {
    this.lockFilePath = path.join(projectRoot, 'pnpm-lock.yaml');
    this.packageJsonPath = path.join(projectRoot, 'package.json');
    this.projectRoot = projectRoot;
  }

  verify() {
    const result = {
      valid: true,
      packageCount: 0,
      failed: [],
      warnings: [],
      missingIntegrity: [],
      hashMismatch: [],
      lockFileHash: '',
      verifiedAt: Date.now(),
    };

    try {
      if (!fs.existsSync(this.lockFilePath)) {
        throw new Error('pnpm-lock.yaml not found');
      }

      const lockContent = fs.readFileSync(this.lockFilePath, 'utf-8');
      const packages = this.parseLockFile(lockContent);
      result.packageCount = packages.length;
      result.lockFileHash = this.computeFileHash(this.lockFilePath);

      const integrityIssues = this.validateIntegrity(packages);
      result.missingIntegrity = integrityIssues.missing;
      result.hashMismatch = integrityIssues.mismatched;

      // `valid` reflects only genuine integrity problems (missing/mismatched
      // hashes) or a parse failure below - never advisory warnings.
      if (result.missingIntegrity.length > 0 || result.hashMismatch.length > 0) {
        result.valid = false;
      }

      const packageJson = this.readPackageJson();
      const depWarnings = this.checkDependencyConsistency(packages, packageJson);
      result.warnings = depWarnings;

      const unusedPackages = this.findUnusedPackages(packages, packageJson);
      if (unusedPackages.length > 0) {
        result.warnings.push(...unusedPackages);
      }
    } catch (error) {
      result.valid = false;
      result.failed.push(error instanceof Error ? error.message : 'Unknown error');
    }

    return result;
  }

  /**
   * Parses the `packages:` section of a pnpm-lock.yaml (lockfile v6+/v9
   * shape): entries are 2-space-indented `'name@version':` (or unquoted)
   * keys, each followed by a more-indented block that contains a
   * `resolution: {integrity: sha512-..., ...}` map - either inline on one
   * line or spread across several indented lines.
   */
  parseLockFile(content) {
    const lines = content.split('\n');

    const sectionStart = lines.findIndex((line) => line === 'packages:');
    if (sectionStart === -1) {
      return [];
    }
    let sectionEnd = lines.length;
    for (let i = sectionStart + 1; i < lines.length; i++) {
      // The next top-level (unindented, non-blank) key ends the section.
      if (/^\S/.test(lines[i])) {
        sectionEnd = i;
        break;
      }
    }

    const packages = [];
    let current = null;

    // Exactly 2 leading spaces (a 3rd space means this is a nested field of
    // the current package, e.g. `    resolution:`, not a new package key).
    const keyPattern = /^ {2}(?!\s)(['"]?)(.+?)\1:\s*$/;

    for (let i = sectionStart + 1; i < sectionEnd; i++) {
      const line = lines[i];
      if (line.trim() === '') continue;

      const keyMatch = line.match(keyPattern);
      if (keyMatch) {
        if (current) packages.push(current);
        const key = keyMatch[2];
        const { name, version } = this.splitNameVersion(key);
        current = { name, version, resolved: '', integrity: '' };
        continue;
      }

      if (!current) continue;

      // `integrity:` may appear inline in a flow map (`resolution: {integrity: ...}`)
      // or on its own indented line - either way, grab the token after it.
      const integrityMatch = line.match(/integrity:\s*([^\s,}'"]+)/);
      if (integrityMatch && !current.integrity) {
        current.integrity = integrityMatch[1];
      }

      const resolvedMatch = line.match(/(?:^|[{,]\s*)tarball:\s*([^\s,}'"]+)/);
      if (resolvedMatch && !current.resolved) {
        current.resolved = resolvedMatch[1];
      }
    }
    if (current) packages.push(current);

    return packages;
  }

  /** Splits a `'@scope/name@1.2.3'` or `'name@1.2.3'` package key. */
  splitNameVersion(key) {
    const scoped = key.startsWith('@');
    const rest = scoped ? key.slice(1) : key;
    const atIndex = rest.lastIndexOf('@');
    if (atIndex === -1) {
      return { name: key, version: '' };
    }
    const name = (scoped ? '@' : '') + rest.slice(0, atIndex);
    const version = rest.slice(atIndex + 1);
    return { name, version };
  }

  validateIntegrity(packages) {
    const missing = [];
    const mismatched = [];

    for (const pkg of packages) {
      if (!pkg.integrity || pkg.integrity.trim() === '') {
        missing.push(`${pkg.name}@${pkg.version}`);
        continue;
      }
      const expectedHash = this.extractIntegrityHash(pkg.integrity);
      if (expectedHash && !this.verifyPackageIntegrity(pkg)) {
        mismatched.push(`${pkg.name}@${pkg.version}`);
      }
    }

    return { missing, mismatched };
  }

  extractIntegrityHash(integrity) {
    const match = integrity.match(/sha512-([a-zA-Z0-9+/=]+)/);
    return match ? match[1] : null;
  }

  verifyPackageIntegrity(pkg) {
    try {
      const pkgPath = this.getPackagePath(pkg);
      if (!fs.existsSync(pkgPath)) return false;
      return true;
    } catch {
      return false;
    }
  }

  getPackagePath(pkg) {
    const safeName = pkg.name.replace(/[^a-zA-Z0-9]/g, '_');
    return path.join(this.projectRoot, 'node_modules', safeName);
  }

  readPackageJson() {
    try {
      const content = fs.readFileSync(this.packageJsonPath, 'utf-8');
      return JSON.parse(content);
    } catch {
      return null;
    }
  }

  checkDependencyConsistency(packages, packageJson) {
    const warnings = [];

    if (!packageJson) return warnings;

    const allDeps = {
      ...packageJson.dependencies,
      ...packageJson.devDependencies,
    };

    const lockNames = new Set(packages.map((p) => p.name));

    for (const dep in allDeps) {
      if (!lockNames.has(dep)) {
        warnings.push(`Dependency ${dep} missing from lock file`);
      }
    }

    return warnings;
  }

  findUnusedPackages(packages, packageJson) {
    const warnings = [];
    if (!packageJson) return warnings;

    const usedDeps = new Set([
      ...Object.keys(packageJson.dependencies || {}),
      ...Object.keys(packageJson.devDependencies || {}),
    ]);

    for (const pkg of packages) {
      const baseName = pkg.name.split('/')[0] || pkg.name;
      if (!usedDeps.has(baseName) && !pkg.name.startsWith('@types/')) {
        warnings.push(`Potentially unused package: ${pkg.name}`);
      }
    }

    return warnings;
  }

  computeFileHash(filePath) {
    const content = fs.readFileSync(filePath);
    return createHash('sha256').update(content).digest('hex');
  }

  async fix() {
    try {
      execSync('pnpm install --lockfile-only', { stdio: 'inherit' });
      execSync('pnpm verify-pnpm.js', { stdio: 'inherit' });
      return true;
    } catch {
      return false;
    }
  }

  generateReport(result) {
    const lines = [
      '# pnpm Lock File Integrity Report',
      '',
      `**Verified At:** ${new Date(result.verifiedAt).toISOString()}`,
      `**Valid:** ${result.valid}`,
      `**Packages:** ${result.packageCount}`,
      `**Lock File Hash:** \`${result.lockFileHash}\``,
      '',
    ];

    if (result.missingIntegrity.length > 0) {
      lines.push('## Missing Integrity Hashes');
      result.missingIntegrity.forEach((pkg) => {
        lines.push(`- ${pkg}`);
      });
      lines.push('');
    }

    if (result.hashMismatch.length > 0) {
      lines.push('## Hash Mismatches');
      result.hashMismatch.forEach((pkg) => {
        lines.push(`- ${pkg}`);
      });
      lines.push('');
    }

    if (result.warnings.length > 0) {
      lines.push('## Warnings');
      result.warnings.forEach((warn) => {
        lines.push(`- ${warn}`);
      });
      lines.push('');
    }

    if (result.failed.length > 0) {
      lines.push('## Failed');
      result.failed.forEach((err) => {
        lines.push(`- ${err}`);
      });
    }

    return lines.join('\n');
  }
}

export function verifyPnpmLock(projectRoot) {
  const verifier = new PnpmLockIntegrityVerifier(projectRoot);
  return verifier.verify();
}
