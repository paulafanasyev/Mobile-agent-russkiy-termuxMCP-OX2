import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requestDeviceToolApproval: vi.fn(),
  executeOpenApp: vi.fn(),
}));

vi.mock("@/modules/runtime/tool-approval", () => ({
  requestDeviceToolApproval: mocks.requestDeviceToolApproval,
}));

vi.mock("@/modules/accessibility-agent", () => ({
  isAccessibilityEnabled: vi.fn().mockResolvedValue(true),
}));

vi.mock("@/tools/executors/device-executors", () => ({
  executeFileRead: vi.fn(),
  executeListApps: vi.fn(),
  executeOpenApp: mocks.executeOpenApp,
  listAppsSchema: { parse: (value: unknown) => value },
  openAppSchema: { parse: (value: unknown) => value },
  readFileSchema: { parse: (value: unknown) => value },
}));

vi.mock("@/tools/executors/accessibility-executors", () => ({
  executeUiAction: vi.fn(),
  executeUiObserve: vi.fn(),
}));

import { createDeviceToolSet } from "@/tools/bridge";

describe("device.open_app approval bridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("requests runtime approval before executing an unapproved app", async () => {
    mocks.requestDeviceToolApproval.mockResolvedValue("approve");
    mocks.executeOpenApp.mockResolvedValue({ status: "launched", packageName: "com.example.app", verified: true });

    const toolSet = createDeviceToolSet();
    const execute = toolSet["device.open_app"].execute;
    if (!execute) throw new Error("device.open_app is not executable");
    const result = await execute(
      { packageName: "com.example.app" },
      { toolCallId: "bridge-approval-test-approve", messages: [], context: {} },
    );

    expect(mocks.requestDeviceToolApproval).toHaveBeenCalledWith("device.open_app", {
      packageName: "com.example.app",
    });
    expect(mocks.executeOpenApp).toHaveBeenCalledWith({ packageName: "com.example.app" });
    expect(result).toEqual({ status: "launched", packageName: "com.example.app", verified: true });
  });

  it("does not execute when runtime approval is denied", async () => {
    mocks.requestDeviceToolApproval.mockResolvedValue("deny");

    const toolSet = createDeviceToolSet();
    const execute = toolSet["device.open_app"].execute;
    if (!execute) throw new Error("device.open_app is not executable");
    const result = await execute(
      { packageName: "com.example.app" },
      { toolCallId: "bridge-approval-test-deny", messages: [], context: {} },
    );

    expect(mocks.requestDeviceToolApproval).toHaveBeenCalledTimes(1);
    expect(mocks.executeOpenApp).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "needs_approval", packageName: "com.example.app" });
  });
});
