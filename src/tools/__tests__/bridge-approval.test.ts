import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requestDeviceToolApproval: vi.fn(),
  executeOpenApp: vi.fn(),
}));

vi.mock("@/modules/runtime/tool-approval", () => ({
  requestDeviceToolApproval: mocks.requestDeviceToolApproval,
}));

vi.mock("@/tools/executors/device-executors", () => ({
  executeFileRead: vi.fn(),
  executeListApps: vi.fn(),
  executeOpenApp: mocks.executeOpenApp,
  listAppsSchema: { parse: (value: unknown) => value },
  openAppSchema: { parse: (value: unknown) => value },
  readFileSchema: { parse: (value: unknown) => value },
}));

import { approveAppForSession, clearSessionApprovals } from "@/tools/device-tools";
import { createDeviceToolSet } from "@/tools/bridge";

describe("device.open_app approval bridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSessionApprovals();
  });

  it("requests runtime approval before executing an unapproved app", async () => {
    mocks.requestDeviceToolApproval.mockResolvedValue("approve");
    mocks.executeOpenApp.mockResolvedValue({ status: "launched", packageName: "com.example.app" });

    const toolSet = createDeviceToolSet();
    const result = await toolSet["device.open_app"].execute?.({
      packageName: "com.example.app",
    });

    expect(mocks.requestDeviceToolApproval).toHaveBeenCalledWith("device.open_app", {
      packageName: "com.example.app",
    });
    expect(mocks.executeOpenApp).toHaveBeenCalledWith({ packageName: "com.example.app" });
    expect(result).toEqual({ status: "launched", packageName: "com.example.app" });
  });

  it("does not execute when runtime approval is denied", async () => {
    mocks.requestDeviceToolApproval.mockResolvedValue("deny");

    const toolSet = createDeviceToolSet();
    const result = await toolSet["device.open_app"].execute?.({
      packageName: "com.example.app",
    });

    expect(mocks.requestDeviceToolApproval).toHaveBeenCalledTimes(1);
    expect(mocks.executeOpenApp).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "needs_approval", packageName: "com.example.app" });
  });

  it("reuses session approval without asking again", async () => {
    approveAppForSession("com.example.app");
    mocks.executeOpenApp.mockResolvedValue({ status: "launched", packageName: "com.example.app" });

    const toolSet = createDeviceToolSet();
    await toolSet["device.open_app"].execute?.({
      packageName: "com.example.app",
    });

    expect(mocks.requestDeviceToolApproval).not.toHaveBeenCalled();
    expect(mocks.executeOpenApp).toHaveBeenCalledWith({ packageName: "com.example.app" });
  });
});
