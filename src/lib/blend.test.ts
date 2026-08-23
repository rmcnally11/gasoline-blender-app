import { describe, expect, it } from "vitest";
import {
  blendComponents,
  evaluateBlend,
  findGrade,
  DEFAULT_COMPONENTS,
  type Component,
} from "./blend";

const REFORMATE = DEFAULT_COMPONENTS.find((c) => c.id === "reformate")!;
const BUTANE = DEFAULT_COMPONENTS.find((c) => c.id === "butane")!;

describe("blendComponents", () => {
  it("returns a zeroed result when there is no volume", () => {
    const result = blendComponents(DEFAULT_COMPONENTS, {});
    expect(result.totalVolume).toBe(0);
    expect(result.aki).toBe(0);
    expect(result.components).toHaveLength(0);
  });

  it("returns the pure component properties for a single blendstock", () => {
    const result = blendComponents([REFORMATE], { reformate: 100 });
    expect(result.ron).toBe(REFORMATE.ron);
    expect(result.mon).toBe(REFORMATE.mon);
    expect(result.aki).toBe((REFORMATE.ron + REFORMATE.mon) / 2);
    expect(result.rvp).toBeCloseTo(REFORMATE.rvp, 5);
  });

  it("blends octane linearly by volume", () => {
    const a: Component = { ...REFORMATE, id: "a", ron: 90, mon: 80 };
    const b: Component = { ...REFORMATE, id: "b", ron: 100, mon: 90 };
    const result = blendComponents([a, b], { a: 50, b: 50 });
    expect(result.ron).toBe(95);
    expect(result.mon).toBe(85);
    expect(result.aki).toBe(90);
  });

  it("blends RVP non-linearly using the blending index (butane spikes vapor pressure)", () => {
    const result = blendComponents([REFORMATE, BUTANE], {
      reformate: 95,
      butane: 5,
    });
    // The convex blending index predicts a higher RVP than a naive linear
    // volume average, which matches real butane-splash behavior.
    const linear = 0.95 * REFORMATE.rvp + 0.05 * BUTANE.rvp;
    expect(result.rvp).toBeGreaterThan(REFORMATE.rvp);
    expect(result.rvp).toBeGreaterThan(linear);
    expect(result.rvp).toBeCloseTo(6.68, 1);
  });

  it("ignores components with zero or negative volume", () => {
    const result = blendComponents(DEFAULT_COMPONENTS, {
      reformate: 100,
      butane: 0,
      ethanol: -10,
    });
    expect(result.components).toHaveLength(1);
    expect(result.components[0].id).toBe("reformate");
  });

  it("computes volume fractions that sum to 100 percent", () => {
    const result = blendComponents(DEFAULT_COMPONENTS, {
      reformate: 420,
      alkylate: 150,
      fcc: 260,
      lsr: 40,
      butane: 15,
      ethanol: 90,
    });
    const totalFraction = result.components.reduce((sum, c) => sum + c.fraction, 0);
    expect(totalFraction).toBeCloseTo(100, 1);
  });
});

describe("evaluateBlend", () => {
  const regular = findGrade("regular")!;

  it("marks a compliant regular-summer recipe on-spec", () => {
    const result = blendComponents(DEFAULT_COMPONENTS, {
      reformate: 420,
      alkylate: 150,
      fcc: 260,
      lsr: 40,
      butane: 15,
      ethanol: 90,
    });
    const evaluation = evaluateBlend(result, regular, "summer");
    expect(result.aki).toBeGreaterThanOrEqual(regular.minAki);
    expect(evaluation.onSpec).toBe(true);
    expect(evaluation.checks.every((check) => check.pass)).toBe(true);
  });

  it("flags an off-spec blend when summer RVP is exceeded", () => {
    const result = blendComponents(DEFAULT_COMPONENTS, {
      reformate: 300,
      butane: 120,
    });
    const evaluation = evaluateBlend(result, regular, "summer");
    const rvpCheck = evaluation.checks.find((c) => c.label.startsWith("RVP"))!;
    expect(rvpCheck.pass).toBe(false);
    expect(evaluation.onSpec).toBe(false);
  });

  it("passes a mid-RVP blend in winter that would fail in summer", () => {
    const result = blendComponents(DEFAULT_COMPONENTS, {
      reformate: 300,
      butane: 40,
    });
    const summer = evaluateBlend(result, regular, "summer");
    const winter = evaluateBlend(result, regular, "winter");
    const summerRvp = summer.checks.find((c) => c.label.startsWith("RVP"))!;
    const winterRvp = winter.checks.find((c) => c.label.startsWith("RVP"))!;
    expect(summerRvp.pass).toBe(false);
    expect(winterRvp.pass).toBe(true);
  });

  it("flags ethanol above the 10 vol% limit", () => {
    const result = blendComponents(DEFAULT_COMPONENTS, {
      reformate: 100,
      ethanol: 40,
    });
    const evaluation = evaluateBlend(result, regular, "winter");
    const ethanolCheck = evaluation.checks.find((c) => c.label === "Ethanol content")!;
    expect(ethanolCheck.pass).toBe(false);
  });
});
