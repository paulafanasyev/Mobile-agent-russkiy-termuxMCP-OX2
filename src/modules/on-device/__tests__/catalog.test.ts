import { describe, expect, it, vi } from "vitest";

vi.mock("react-native", () => ({
  Platform: { OS: "web" },
}));

import {
  fetchOnDeviceModelCatalog,
  parseOnDeviceModelCatalog,
} from "../catalog";

const baseModel = {
  id: "test-model",
  name: "Test Model",
  parameterCount: "360M",
  quantization: "int4",
  downloadUrl: "https://example.com/test-model.litertlm",
  sha256: "a".repeat(64),
  sizeBytes: 100,
  contextWindow: 1024,
  lowMemoryContextWindow: 512,
  minRamBytes: 536_870_912,
  minRamBasis: "published-minimum",
  minRamSource: "https://example.com/min-ram",
  supportedPlatforms: ["android"],
  license: "Apache-2.0",
  capabilities: {
    tools: true,
    reasoning: false,
  },
};

function catalog(...models: Record<string, unknown>[]) {
  return {
    version: 1,
    models: models.length > 0 ? models : [baseModel],
  };
}

describe("parseOnDeviceModelCatalog", () => {
  it("accepts a valid LiteRT-LM model", () => {
    const [model] = parseOnDeviceModelCatalog(catalog());
    expect(model.id).toBe("test-model");
    expect(model.downloadUrl).toMatch(/\.litertlm$/);
  });

  it("rejects a 63-character SHA256", () => {
    expect(() =>
      parseOnDeviceModelCatalog(
        catalog({ ...baseModel, sha256: "a".repeat(63) }),
      ),
    ).toThrow(/invalid SHA256/i);
  });

  it("rejects a 65-character SHA256", () => {
    expect(() =>
      parseOnDeviceModelCatalog(
        catalog({ ...baseModel, sha256: "a".repeat(65) }),
      ),
    ).toThrow(/invalid SHA256/i);
  });

  it("rejects a non-hex SHA256", () => {
    expect(() =>
      parseOnDeviceModelCatalog(
        catalog({ ...baseModel, sha256: "z".repeat(64) }),
      ),
    ).toThrow(/invalid SHA256/i);
  });

  it("rejects HTTP download URLs", () => {
    expect(() =>
      parseOnDeviceModelCatalog(
        catalog({
          ...baseModel,
          downloadUrl: "http://example.com/test-model.litertlm",
        }),
      ),
    ).toThrow(/HTTPS/i);
  });

  it("rejects unsupported GGUF model URLs", () => {
    expect(() =>
      parseOnDeviceModelCatalog(
        catalog({
          ...baseModel,
          downloadUrl: "https://example.com/test-model.gguf",
        }),
      ),
    ).toThrow(/unsupported model format/i);
  });

  it("rejects duplicate model IDs", () => {
    expect(() =>
      parseOnDeviceModelCatalog(
        catalog(baseModel, { ...baseModel, name: "Duplicate" }),
      ),
    ).toThrow(/Duplicate on-device catalog id/i);
  });

  it("rejects invalid platforms", () => {
    expect(() =>
      parseOnDeviceModelCatalog(
        catalog({ ...baseModel, supportedPlatforms: ["ios-only"] }),
      ),
    ).toThrow(/supportedPlatforms/i);
  });

  it("rejects invalid backends", () => {
    expect(() =>
      parseOnDeviceModelCatalog(
        catalog({ ...baseModel, backend: "gguf-cpp" }),
      ),
    ).toThrow(/Invalid backend/i);
  });

  it("rejects more than 50 catalog models", () => {
    const models = Array.from({ length: 51 }, (_, index) => ({
      ...baseModel,
      id: `test-model-${index}`,
    }));
    expect(() => parseOnDeviceModelCatalog(catalog(...models))).toThrow(
      /too many models/i,
    );
  });

  it("rejects model files larger than 20 GB", () => {
    expect(() =>
      parseOnDeviceModelCatalog(
        catalog({ ...baseModel, sizeBytes: 20_000_000_001 }),
      ),
    ).toThrow(/sizeBytes/i);
  });

  it("rejects RAM requirements above 32 GB", () => {
    expect(() =>
      parseOnDeviceModelCatalog(
        catalog({ ...baseModel, minRamBytes: 32_000_000_001 }),
      ),
    ).toThrow(/minRamBytes/i);
  });

  it("rejects context windows above 1,000,000", () => {
    expect(() =>
      parseOnDeviceModelCatalog(
        catalog({ ...baseModel, contextWindow: 1_000_000_001 }),
      ),
    ).toThrow(/contextWindow/i);
  });

  it("rejects missing required fields", () => {
    const { name: _name, ...missingName } = baseModel;
    expect(() => parseOnDeviceModelCatalog(catalog(missingName))).toThrow(
      /name.*required/i,
    );
  });

  it("falls back to the bundled catalog when the remote catalog fails", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn(async () =>
      new Response(null, { status: 503, statusText: "Service Unavailable" }),
    );

    try {
      const result = await fetchOnDeviceModelCatalog();
      expect(result.source).toBe("bundled");
      expect(result.models.length).toBeGreaterThan(0);
      expect(result.models[0]?.id).toBe("gemma-e2b");
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});
