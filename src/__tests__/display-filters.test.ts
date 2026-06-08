import { describe, expect, it } from "vitest";
import {
  defaultCustomDisplayFilterSettings,
  defaultDisplayFilterMode,
  defaultDisplayFilterRuntimeBoosts,
  displayFilterModeLabels,
  displayFilterModes,
  displayFilterPresets,
  displayFilterSettingDescriptions,
  displayFilterSettingKeys,
  displayFilterSettingLabels,
  getDisplayFilterSettingsForMode,
  normalizeDisplayFilterIntensity,
  normalizeDisplayFilterSettings,
} from "../index.js";

describe("display filter helpers", () => {
  it("defines complete display filter preset metadata", () => {
    expect(defaultDisplayFilterMode).toBe("off");
    expect(displayFilterModes).toEqual([
      "off",
      "arcade-crt",
      "home-tv-crt",
      "portable-crt",
      "vhs",
      "custom",
    ]);
    expect(Object.keys(displayFilterPresets).sort()).toEqual([
      "arcade-crt",
      "home-tv-crt",
      "off",
      "portable-crt",
      "vhs",
    ]);
    expect(displayFilterModeLabels["arcade-crt"]).toBe("Arcade CRT");

    for (const key of displayFilterSettingKeys) {
      expect(displayFilterSettingLabels[key]).toEqual(expect.any(String));
      expect(displayFilterSettingDescriptions[key]).toEqual(expect.any(String));

      for (const preset of Object.values(displayFilterPresets)) {
        expect(preset[key]).toEqual(expect.any(Number));
      }
    }
  });

  it("normalizes intensity values into integer 0-100 values", () => {
    expect(normalizeDisplayFilterIntensity(44.6)).toBe(45);
    expect(normalizeDisplayFilterIntensity(-10)).toBe(0);
    expect(normalizeDisplayFilterIntensity(120)).toBe(100);
    expect(normalizeDisplayFilterIntensity(Number.NaN)).toBe(0);
    expect(normalizeDisplayFilterIntensity("50")).toBe(0);
  });

  it("normalizes partial or untrusted filter settings", () => {
    expect(
      normalizeDisplayFilterSettings({
        bloom: 120,
        colourBleed: 12.4,
        scanlines: -4,
      })
    ).toEqual({
      ...defaultCustomDisplayFilterSettings,
      bloom: 100,
      colourBleed: 12,
      scanlines: 0,
    });
    expect(normalizeDisplayFilterSettings(null)).toEqual(
      defaultCustomDisplayFilterSettings
    );
  });

  it("resolves preset and custom filter settings with runtime boosts", () => {
    expect(
      getDisplayFilterSettingsForMode("arcade-crt", defaultCustomDisplayFilterSettings)
    ).toMatchObject({
      bloom: 28,
      curvature: 12,
      scanlines: 35,
    });

    expect(
      getDisplayFilterSettingsForMode(
        "custom",
        {
          ...defaultCustomDisplayFilterSettings,
          bloom: 20,
          curvature: 10,
          ditherBlending: 15,
          explosionBloomBoost: 5,
          flicker: 2,
          interference: 3,
          timeWarpDistortionBoost: 8,
        },
        {
          bulletPersistenceBoost: 9,
          explosionBloomBoost: 7,
          lowHealthInstabilityBoost: 11,
          timeWarpDistortionBoost: 13,
        }
      )
    ).toMatchObject({
      bloom: 32,
      curvature: 31,
      ditherBlending: 24,
      flicker: 13,
      interference: 27,
    });
  });

  it("keeps default runtime boosts at zero", () => {
    expect(defaultDisplayFilterRuntimeBoosts).toEqual({
      bulletPersistenceBoost: 0,
      explosionBloomBoost: 0,
      lowHealthInstabilityBoost: 0,
      timeWarpDistortionBoost: 0,
    });
  });
});
