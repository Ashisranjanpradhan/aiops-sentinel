import { describe, it, expect } from "vitest";
import { ApiError } from "@/lib/api-client";

describe("Frontend ApiError", () => {
  it("formats error messages with machine-readable code", () => {
    const err = new ApiError("Validation failed", "VALIDATION_ERROR", { field: "name" });
    expect(err.message).toBe("Validation failed");
    expect(err.code).toBe("VALIDATION_ERROR");
    expect(err.details).toEqual({ field: "name" });
  });
});
