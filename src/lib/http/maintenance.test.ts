import { describe, expect, it } from "vitest";
import {
	classifyServiceUnavailable,
	MAINTENANCE_HEADER,
	SERVICE_UNAVAILABLE_CODES,
} from "./maintenance";

type TableRow = [status: number, headers: Record<string, string>, expectedCode: string | null];

const rows: TableRow[] = [
	[503, { [MAINTENANCE_HEADER]: "true" }, SERVICE_UNAVAILABLE_CODES.MAINTENANCE],
	[503, { [MAINTENANCE_HEADER]: "1" }, SERVICE_UNAVAILABLE_CODES.MAINTENANCE],
	[500, { [MAINTENANCE_HEADER]: "true" }, null],
	[503, {}, SERVICE_UNAVAILABLE_CODES.DEPENDENCY_UNAVAILABLE],
	[200, {}, null],
];

describe.each(rows)(
	"classifyServiceUnavailable(%i, %o)",
	(status, headers, expectedCode) => {
		it(`classifies as ${expectedCode ?? "not unavailable"}`, () => {
			const response = new Response(null, { status, headers });
			const state = classifyServiceUnavailable(response);
			if (expectedCode === null) {
				expect(state).toBeNull();
			} else {
				expect(state?.code).toBe(expectedCode);
			}
		});
	},
);

it("every SERVICE_UNAVAILABLE_CODES value is reachable from the table", () => {
	const produced = new Set<string>();
	for (const [status, headers] of rows) {
		const state = classifyServiceUnavailable(new Response(null, { status, headers }));
		if (state) produced.add(state.code);
	}
	expect(produced).toEqual(new Set(Object.values(SERVICE_UNAVAILABLE_CODES)));
});
