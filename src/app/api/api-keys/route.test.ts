import { describe, expect, it } from "vitest";
import { parseRangeDays } from "./route";

describe("parseRangeDays", () => {
  it("rejects an audit range above 90 days", () => {
    expect(parseRangeDays("91")).toBeNull();
  });

  it("rejects a range of 0 days", () => {
    expect(parseRangeDays("0")).toBeNull();
  });

  it("defaults to 30 days when the parameter is missing", () => {
    expect(parseRangeDays(null)).toBe(30);
  });
});
