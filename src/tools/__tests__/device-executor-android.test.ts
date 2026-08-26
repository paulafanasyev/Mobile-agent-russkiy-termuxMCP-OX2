import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  openApplication: vi.fn(),
}));

vi.mock("expo-intent-launcher", () => ({
  openApplication: mocks.openApplication,
}));

import {
  approveAppForSession,
  clearSessionApprovals,
} from "@/tools/device-tools";
import { executeOpenApp } from "@/tools/executors/device-executors";

describe("Hands Android executor emulation", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSessionApprovals();
  });

  it("does not cross the native boundary before approval", async () => {
    const result = await executeOpenApp({ packageName: "com.android.settings" });

    expect(result).toEqual({
      status: "needs_approval",
      packageName: "com.android.settings",
    });
    expect(mocks.openApplication).not.toHaveBeenCalled();
  });

  it("crosses the Android Intent boundary after session approval", async () => {
    approveAppForSession("com.android.settings");

    const result = await executeOpenApp({ packageName: "com.android.settings" });

    expect(result).toEqual({
      status: "launched",
      packageName: "com.android.settings",
    });
    expect(mocks.openApplication).toHaveBeenCalledTimes(1);
    expect(mocks.openApplication).toHaveBeenCalledWith("com.android.settings");
  });

  it("rejects malformed package names before any native call", async () => {
    approveAppForSession("not-a-package");

    await expect(
      executeOpenApp({ packageName: "not-a-package" }),
    ).rejects.toThrow();
    expect(mocks.openApplication).not.toHaveBeenCalled();
  });
});
