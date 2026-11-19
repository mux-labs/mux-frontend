import { describe, expect, it } from 'vitest';
import { buildConnectSrcDirective } from './next.config.csp';

describe('buildConnectSrcDirective', () => {
	it('returns the joined connect-src directive string', () => {
		const directive = buildConnectSrcDirective([
			"'self'",
			'https://api.example.com',
			'https://rpc.example.com',
		]);

		expect(directive).toBe(
			"connect-src 'self' https://api.example.com https://rpc.example.com",
		);
	});

	it('prefixes the directive with connect-src and joins sources with spaces', () => {
		const directive = buildConnectSrcDirective(["'self'", 'https://a.test']);

		expect(directive.startsWith('connect-src ')).toBe(true);
		expect(directive).toBe("connect-src 'self' https://a.test");
		expect(directive).not.toContain(',');
	});

	it('fails when the function stops producing the joined directive', () => {
		const directive = buildConnectSrcDirective(["'self'", 'https://a.test']);

		// Regression guard: the emitted value must be the full directive string,
		// not the intermediate array or a bare source list.
		expect(directive).not.toEqual(["'self'", 'https://a.test']);
		expect(directive).not.toBe("'self' https://a.test");
	});
});
