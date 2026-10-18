import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { PnpmLockIntegrityVerifier } from '../scripts/verify-pnpm.js';

/**
 * Guards for issue #937: the hand-rolled lockfile parser only recognised a
 * single two/four-space indentation pattern, so real pnpm-lock.yaml layouts
 * (the `packages:` section's quoted `'name@version':` keys with a nested
 * `resolution: {integrity: ...}` map) made every package look like it was
 * missing its integrity hash. Advisory warnings (dependency
 * consistency/unused packages) were also treated as fatal, flipping `valid`
 * to false on otherwise-healthy lockfiles.
 */
describe('PnpmLockIntegrityVerifier', () => {
	let dir: string;

	afterEach(() => {
		if (dir) rmSync(dir, { recursive: true, force: true });
	});

	function makeProject(files: { 'pnpm-lock.yaml': string; 'package.json': string }, pkgDirs: string[] = []) {
		dir = mkdtempSync(join(tmpdir(), 'verify-pnpm-fixture-'));
		writeFileSync(join(dir, 'pnpm-lock.yaml'), files['pnpm-lock.yaml'], 'utf-8');
		writeFileSync(join(dir, 'package.json'), files['package.json'], 'utf-8');
		for (const name of pkgDirs) {
			const safeName = name.replace(/[^a-zA-Z0-9]/g, '_');
			mkdirSync(join(dir, 'node_modules', safeName), { recursive: true });
		}
		return dir;
	}

	it('does not flag a package with a real pnpm resolution block as missing integrity', () => {
		const lock = [
			"lockfileVersion: '9.0'",
			'',
			'importers:',
			'',
			'  .:',
			'    dependencies:',
			'      lodash:',
			'        specifier: ^4.17.21',
			'        version: 4.17.21',
			'',
			'packages:',
			'',
			"  lodash@4.17.21:",
			'    resolution: {integrity: sha512-v2kDEe57lecTulaDIuNTPy3Ry4/GYZhBMjAC1C9gxhNqR0FhZ+MYM4aXMKn4ae8NKY0CwGtc4oF3JQNJMCM1mg==}',
			'',
		].join('\n');
		const pkg = JSON.stringify({ name: 'fixture', dependencies: { lodash: '^4.17.21' } });

		const projectRoot = makeProject({ 'pnpm-lock.yaml': lock, 'package.json': pkg }, ['lodash']);
		const result = new PnpmLockIntegrityVerifier(projectRoot).verify();

		expect(result.missingIntegrity).not.toContain('lodash@4.17.21');
		expect(result.failed).toEqual([]);
	});

	it('does not fail valid when only advisory warnings are present', () => {
		const lock = [
			"lockfileVersion: '9.0'",
			'',
			'packages:',
			'',
			'  lodash@4.17.21:',
			'    resolution: {integrity: sha512-v2kDEe57lecTulaDIuNTPy3Ry4/GYZhBMjAC1C9gxhNqR0FhZ+MYM4aXMKn4ae8NKY0CwGtc4oF3JQNJMCM1mg==}',
			'',
			'  left-pad@1.3.0:',
			'    resolution: {integrity: sha512-XI5MPzVNApjAyhQzphX8BkmKsKUxD4LdyK24iZeQGinBiSIiVOl9j+1zIU1oClCfVvWMs9c3tnoy23FQGkZATg==}',
			'',
		].join('\n');
		// `left-pad` is in the lockfile but not package.json -> "unused package"
		// warning. This must not flip `valid` to false.
		const pkg = JSON.stringify({ name: 'fixture', dependencies: { lodash: '^4.17.21' } });

		const projectRoot = makeProject({ 'pnpm-lock.yaml': lock, 'package.json': pkg }, ['lodash', 'left-pad']);
		const result = new PnpmLockIntegrityVerifier(projectRoot).verify();

		expect(result.warnings.length).toBeGreaterThan(0);
		expect(result.valid).toBe(true);
	});

	it('still flags a package genuinely missing an integrity hash', () => {
		const lock = [
			"lockfileVersion: '9.0'",
			'',
			'packages:',
			'',
			'  sketchy-pkg@0.0.1:',
			"    resolution: {tarball: https://example.com/sketchy-pkg-0.0.1.tgz}",
			'',
		].join('\n');
		const pkg = JSON.stringify({ name: 'fixture', dependencies: { 'sketchy-pkg': '^0.0.1' } });

		const projectRoot = makeProject({ 'pnpm-lock.yaml': lock, 'package.json': pkg });
		const result = new PnpmLockIntegrityVerifier(projectRoot).verify();

		expect(result.missingIntegrity).toContain('sketchy-pkg@0.0.1');
		expect(result.valid).toBe(false);
	});
});
