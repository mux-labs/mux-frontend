import { describe, expect, it } from "vitest";
import { MAX_NICKNAME_LENGTH, normalizeNickname } from "./sanitize-nickname";

describe("normalizeNickname", () => {
	it("strips control characters", () => {
		expect(normalizeNickname("ali\u0000ce\u0007")).toBe("alice");
		expect(normalizeNickname("a\u001Fb\u007Fc")).toBe("abc");
	});

	it("trims surrounding whitespace", () => {
		expect(normalizeNickname("   alice   ")).toBe("alice");
		expect(normalizeNickname("\t\n alice \r\n")).toBe("alice");
	});

	it("HTML-escapes & < > \" '", () => {
		expect(normalizeNickname("a&b")).toBe("a&amp;b");
		expect(normalizeNickname("<script>")).toBe("&lt;script&gt;");
		expect(normalizeNickname('say "hi"')).toBe("say &quot;hi&quot;");
		expect(normalizeNickname("it's")).toBe("it&#39;s");
	});

	it("enforces MAX_NICKNAME_LENGTH on the escaped result", () => {
		// Each '<' escapes to '&lt;' (4 chars), so the escaped value is longer
		// than the raw input. The cap must apply post-escaping.
		const raw = "<".repeat(MAX_NICKNAME_LENGTH);
		const result = normalizeNickname(raw);
		expect(result.length).toBeLessThanOrEqual(MAX_NICKNAME_LENGTH);
		expect(result).toBe("&lt;".repeat(Math.floor(MAX_NICKNAME_LENGTH / 4)));
	});

	it("does not exceed the cap for plain input at the limit", () => {
		const raw = "a".repeat(MAX_NICKNAME_LENGTH + 10);
		const result = normalizeNickname(raw);
		expect(result.length).toBeLessThanOrEqual(MAX_NICKNAME_LENGTH);
		expect(result).toBe("a".repeat(MAX_NICKNAME_LENGTH));
	});
});
