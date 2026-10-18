import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guards for issue #938: `tests/run-tests.js` must fail loudly (non-zero
 * exit, no success line) when a test module throws synchronously or
 * rejects asynchronously, and must discover `tests/*.test.js` files rather
 * than relying on a hardcoded list that can drift from what's on disk.
 */
describe('tests/run-tests.js smoke runner', () => {
	const runnerPath = join(__dirname, 'run-tests.js');

	function runAgainst(fixtureDir: string) {
		try {
			const stdout = execFileSync('node', [runnerPath], {
				env: { ...process.env, SMOKE_TESTS_DIR: fixtureDir },
				encoding: 'utf8',
			});
			return { status: 0, stdout };
		} catch (error) {
			const err = error as { status: number | null; stdout: string };
			return { status: err.status ?? 1, stdout: err.stdout ?? '' };
		}
	}

	function withFixtureDir(files: Record<string, string>, run: (dir: string) => void) {
		const dir = mkdtempSync(join(tmpdir(), 'run-tests-fixture-'));
		try {
			for (const [name, contents] of Object.entries(files)) {
				writeFileSync(join(dir, name), contents, 'utf8');
			}
			run(dir);
		} finally {
			rmSync(dir, { recursive: true, force: true });
		}
	}

	it('exits non-zero and omits the success line when a module throws synchronously', () => {
		withFixtureDir(
			{
				'broken.test.js': "throw new Error('synchronous failure');",
			},
			(dir) => {
				const { status, stdout } = runAgainst(dir);
				expect(status).not.toBe(0);
				expect(stdout).not.toMatch(/All smoke tests passed\./);
			},
		);
	});

	it('exits non-zero and omits the success line when a module rejects asynchronously', () => {
		withFixtureDir(
			{
				'broken-async.test.js':
					"module.exports = (async () => { throw new Error('async failure'); })();",
			},
			(dir) => {
				const { status, stdout } = runAgainst(dir);
				expect(status).not.toBe(0);
				expect(stdout).not.toMatch(/All smoke tests passed\./);
			},
		);
	});

	it('exits zero and prints the success line when every module passes', () => {
		withFixtureDir(
			{
				'ok.test.js': "console.log('ok.test.js passed');",
			},
			(dir) => {
				const { status, stdout } = runAgainst(dir);
				expect(status).toBe(0);
				expect(stdout).toMatch(/All smoke tests passed\./);
			},
		);
	});

	it('discovers every *.test.js file in the directory instead of a hardcoded list', () => {
		withFixtureDir(
			{
				'first.test.js': "console.log('first');",
				'second.test.js': "console.log('second');",
				'not-a-test.js': "throw new Error('must not run');",
			},
			(dir) => {
				const { status, stdout } = runAgainst(dir);
				expect(status).toBe(0);
				expect(stdout).toMatch(/All smoke tests passed\./);
			},
		);
	});
});
