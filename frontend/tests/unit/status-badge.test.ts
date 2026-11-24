import { describe, it, expect } from "vitest";

describe("Readiness level badge logic", () => {
  it("maps status strings accurately", () => {
    const getBadgeStyle = (status: string) => {
      const s = status.toLowerCase();
      if (s === "healthy" || s === "production_ready") return "emerald";
      if (s === "simulated" || s === "near_production") return "sky";
      if (s === "warning" || s === "needs_work") return "amber";
      if (s === "critical" || s === "high_risk") return "rose";
      return "slate";
    };

    expect(getBadgeStyle("healthy")).toBe("emerald");
    expect(getBadgeStyle("PRODUCTION_READY")).toBe("emerald");
    expect(getBadgeStyle("simulated")).toBe("sky");
    expect(getBadgeStyle("NEAR_PRODUCTION")).toBe("sky");
    expect(getBadgeStyle("NEEDS_WORK")).toBe("amber");
    expect(getBadgeStyle("HIGH_RISK")).toBe("rose");
    expect(getBadgeStyle("unknown")).toBe("slate");
  });
});
