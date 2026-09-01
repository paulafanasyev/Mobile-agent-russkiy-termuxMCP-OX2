import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requestDeviceToolApproval: vi.fn(),
  executeOpenApp: vi.fn(),
  isHandsAlwaysAllowed: vi.fn().mockResolvedValue(false),
}));

// Pure bridge test: do not load Android/Expo native modules into Node/Vitest.
vi.mock("@/modules/runtime/tool-approval", () => ({
  requestDeviceToolApproval: mocks.requestDeviceToolApproval,
}));

vi.mock("@/modules/runtime/hands-permission", () => ({
  isHandsAlwaysAllowed: mocks.isHandsAlwaysAllowed,
}));

vi.mock("@/modules/accessibility-agent", () => ({
  isAccessibilityEnabled: vi.fn().mockResolvedValue(true),
}));

// accessibility-tools contains a lazy native import. Mock the whole contract
// module so Rolldown never parses React Native Flow sources in Node/Vitest.
vi.mock("@/tools/accessibility-tools", () => ({
  ACCESSIBILITY_TOOLS: [
    {
      id: "device.ui.observe",
      description: "observe",
      inputSchema: { parse: (value: unknown) => value },
    },
    {
      id: "device.ui.act",
      description: "act",
      inputSchema: { parse: (value: unknown) => value },
    },
  ],
  uiObserveSchema: { parse: (value: unknown) => value },
  uiActSchema: { parse: (value: unknown) => value },
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

import { approveAppForSession, clearSessionApprovals } from "@/tools/device-tools";
import { createDeviceToolSet } from "@/tools/bridge";

describe("device approval bridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isHandsAlwaysAllowed.mockResolvedValue(false);
    clearSessionApprovals();
  });

  it("requests runtime approval before executing an unapproved app", async () => {
    mocks.requestDeviceToolApproval.mockResolvedValue("approve");
    mocks.executeOpenApp.mockResolvedValue({ status: "launched", packageName: "com.example.app" });

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
    expect(result).toEqual({ status: "launched", packageName: "com.example.app" });
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

  it("reuses session approval without asking again", async () => {
    approveAppForSession("com.example.app");
    mocks.executeOpenApp.mockResolvedValue({ status: "launched", packageName: "com.example.app" });

    const toolSet = createDeviceToolSet();
    const execute = toolSet["device.open_app"].execute;
    if (!execute) throw new Error("device.open_app is not executable");
    await execute(
      { packageName: "com.example.app" },
      { toolCallId: "bridge-approval-test-session", messages: [], context: {} },
    );

    expect(mocks.requestDeviceToolApproval).not.toHaveBeenCalled();
    expect(mocks.executeOpenApp).toHaveBeenCalledWith({ packageName: "com.example.app" });
  });

  it("persistent Hands approval bypasses runtime approval", async () => {
    mocks.isHandsAlwaysAllowed.mockResolvedValue(true);
    mocks.executeOpenApp.mockResolvedValue({ status: "launched", packageName: "com.example.app" });

    const toolSet = createDeviceToolSet();
    const execute = toolSet["device.open_app"].execute;
    if (!execute) throw new Error("device.open_app is not executable");
    await execute(
      { packageName: "com.example.app" },
      { toolCallId: "bridge-approval-test-always", messages: [], context: {} },
    );

    expect(mocks.requestDeviceToolApproval).not.toHaveBeenCalled();
    expect(mocks.executeOpenApp).toHaveBeenCalledWith({ packageName: "com.example.app" });
  });
});
