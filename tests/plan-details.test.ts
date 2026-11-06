import { afterEach, describe, expect, it, vi } from "vitest";

const loadTools = async () => {
  vi.resetModules();
  return import("@/lib/copper/assistant/tools");
};

afterEach(() => {
  vi.doUnmock("@/lib/copper/catalog");
});

describe("get_plan_details (the extension's fifth tool)", () => {
  it("compares what Free and Copper Plus each include", async () => {
    const { getPlanDetails } = await loadTools();
    expect(getPlanDetails().plans).toEqual([
      {
        id: "free",
        name: "Free",
        monthlyUsd: 0,
        annualUsd: 0,
        memoryKept: "30 days",
        notesRecording: "10 hours/month",
        refinedAnswers: false,
      },
      {
        id: "copper-plus",
        name: "Copper Plus",
        monthlyUsd: 7.99,
        annualUsd: 79,
        memoryKept: "12 months",
        notesRecording: "Unlimited",
        refinedAnswers: true,
      },
    ]);
  });

  it("follows the catalog when a plan changes", async () => {
    vi.doMock("@/lib/copper/catalog", async (importOriginal) => {
      const real =
        await importOriginal<typeof import("@/lib/copper/catalog")>();
      return {
        ...real,
        getPlans: () =>
          real
            .getPlans()
            .map((p) =>
              p.id === "copper-plus"
                ? { ...p, monthlyUsd: 9.49, memoryDays: 730 }
                : p,
            ),
      };
    });
    const { getPlanDetails } = await loadTools();
    expect(
      getPlanDetails().plans.find((p) => p.id === "copper-plus"),
    ).toMatchObject({
      monthlyUsd: 9.49,
      memoryKept: "24 months",
    });
  });

  it("is offered to the model with a description, alongside the other four", async () => {
    const { copperTools, getPlanDetails } = await loadTools();
    expect(Object.keys(copperTools)).toEqual([
      "get_products",
      "get_prices",
      "calculate_cost",
      "check_availability",
      "get_plan_details",
    ]);
    const planTool = copperTools.get_plan_details;
    expect(planTool.description).toMatch(/Copper Plus/);
    // The options are unused by this tool, so an empty stand-in is enough.
    const options = {} as Parameters<NonNullable<typeof planTool.execute>>[1];
    expect(await planTool.execute!({}, options)).toEqual(getPlanDetails());
  });
});
