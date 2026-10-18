const fs = require("node:fs");
const path = require("node:path");

// #938: discover `tests/*.test.js` files instead of a hardcoded list that can
// drift from what's actually on disk. `SMOKE_TESTS_DIR` lets tests of this
// runner point it at a fixture directory instead of the real `tests/` dir.
const testsDir = process.env.SMOKE_TESTS_DIR
	? path.resolve(process.env.SMOKE_TESTS_DIR)
	: __dirname;

const testFiles = fs
	.readdirSync(testsDir)
	.filter((file) => file.endsWith(".test.js"))
	.sort();

(async () => {
	const failures = [];

	for (const file of testFiles) {
		const fullPath = path.resolve(testsDir, file);
		try {
			// `require` throws synchronously for modules whose top-level code
			// throws (e.g. session.test.js's inline asserts).
			const module = require(fullPath);
			if (typeof module === "function") {
				await module();
			} else if (module && typeof module.then === "function") {
				await module;
			}
		} catch (error) {
			failures.push({ file, error });
			console.error(`FAIL ${file}`);
			console.error(error && error.stack ? error.stack : error);
		}
	}

	if (failures.length > 0) {
		console.error(
			`${failures.length}/${testFiles.length} smoke test module(s) failed: ${failures
				.map((f) => f.file)
				.join(", ")}`,
		);
		process.exitCode = 1;
		return;
	}

	console.log("All smoke tests passed.");
})();
