import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { copyToClipboard } from "../copyToClipboard";

describe("copyToClipboard()", () => {
	beforeEach(() => {
		Object.assign(navigator, {
			clipboard: {
				writeText: vi.fn().mockResolvedValue(undefined),
			},
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("calls navigator.clipboard.writeText with the provided text", async () => {
		await copyToClipboard("hello world");
		expect(navigator.clipboard.writeText).toHaveBeenCalledWith("hello world");
	});

	it("returns a promise that resolves", async () => {
		await expect(copyToClipboard("test")).resolves.toBeUndefined();
	});

	it("propagates clipboard errors", async () => {
		vi.spyOn(navigator.clipboard, "writeText").mockRejectedValue(
			new Error("Permission denied"),
		);
		await expect(copyToClipboard("test")).rejects.toThrow("Permission denied");
	});
});
