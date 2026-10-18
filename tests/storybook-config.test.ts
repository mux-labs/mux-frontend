import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import config from "../.storybook/main";

const rootDir = process.cwd();
const packageJson = JSON.parse(
	readFileSync(join(rootDir, "package.json"), "utf8"),
) as { devDependencies?: Record<string, string> };
const devDependencies = packageJson.devDependencies ?? {};

const addonPackageName = (addon: string): string => {
	const parts = addon.split("/");
	if (addon.startsWith("@")) {
		return parts.slice(0, 2).join("/");
	}
	return parts[0];
};

describe("storybook config", () => {
	it("declares a stories glob rooted at ../src/", () => {
		expect(Array.isArray(config.stories)).toBe(true);
		const stories = config.stories as string[];
		expect(stories.some((glob) => glob.startsWith("../src/"))).toBe(true);
	});

	it("declares the expected addon set", () => {
		expect(config.addons).toEqual([
			"@storybook/addon-essentials",
			"@storybook/addon-interactions",
			"@storybook/addon-a11y",
		]);
	});

	it("declares every addon as a devDependency", () => {
		const addons = config.addons as string[];
		for (const addon of addons) {
			expect(typeof addon).toBe("string");
			const name = addonPackageName(addon);
			expect(devDependencies).toHaveProperty(name);
		}
	});

	it("uses the @storybook/nextjs framework", () => {
		expect(typeof config.framework).toBe("object");
		const framework = config.framework as { name: string };
		expect(framework.name).toBe("@storybook/nextjs");
		expect(devDependencies).toHaveProperty("@storybook/nextjs");
	});

	it("enables autodocs via the tag setting", () => {
		expect(config.docs?.autodocs).toBe("tag");
	});

	it("covers every story under src/stories with the stories glob", () => {
		const stories = config.stories as string[];
		const prefixes = stories.map((glob) => glob.split("*")[0]);
		const storiesDir = join(rootDir, "src", "stories");
		const files = readdirSync(storiesDir).filter((file) =>
			file.endsWith(".stories.tsx"),
		);
		expect(files.length).toBeGreaterThan(0);
		for (const file of files) {
			const relative = `../src/stories/${file}`;
			expect(prefixes.some((prefix) => relative.startsWith(prefix))).toBe(true);
		}
	});
});
