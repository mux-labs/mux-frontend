import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

const workspace = readFileSync(
	join(process.cwd(), "pnpm-workspace.yaml"),
	"utf8",
);

describe("pnpm-workspace boundaries", () => {
	it("only includes the root package", () => {
		const packages = workspace
			.split("packages:")[1]
			?.split(/\n\S/)[0]
			.split("\n")
			.map((l) => l.trim())
			.filter((l) => l.startsWith("-"));
		expect(packages).toEqual(["- ."]);
	});

	it("does not allow sharp build scripts", () => {
		expect(workspace).toMatch(/sharp: false/);
	});
});
