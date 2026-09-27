import { describe, expect, it } from "vitest";
import { normalizePhone } from "./phone.js";

describe("normalizePhone", () => {
  it("strips a leading + and any spaces/dashes", () => {
    expect(normalizePhone("+91 99999-99999")).toBe("919999999999");
  });

  it("leaves an already-normalized number unchanged", () => {
    expect(normalizePhone("919999999999")).toBe("919999999999");
  });

  it("adds the 91 country code to a bare 10-digit number", () => {
    expect(normalizePhone("9999999999")).toBe("919999999999");
  });

  it("treats +919999999999 and 919999999999 as the same number", () => {
    expect(normalizePhone("+919999999999")).toBe(normalizePhone("919999999999"));
  });
});
