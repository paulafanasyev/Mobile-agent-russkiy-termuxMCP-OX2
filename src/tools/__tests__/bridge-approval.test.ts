import { beforeEach, describe, expect, it, vi } from "vitest";

const requestDeviceToolApproval = vi.fn();
const executeOpenApp = vi.fn();

vi.mock("@/modules/runtime/tool-approval", () => ({
  requestDeviceToolApproval,
}));

vi.mock("@/tools/executors/device-executors", () => ({
  executeFileRead: vi.fn(),
  executeListApps: vi.fn(),
  executeOpenApp,
  listAppsSchema: { parse: (value: unknown) => value },
  openAppSchema: { parse: (value: unknown) => value },
  readFileSchema: { parse: (value: unknown) => value },
}));

import { approveAppForSession, clearSessionApprovedPackages } from "@/tools/device-tools";
import { createDeviceToolSet } from "@/tools/bridge";

describe("device.open_app approval bridge", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearSessionApprovedPackages();
  });

  it("requests runtime approval before executing an unapproved app", async () => {
    requestDeviceToolApproval.mockResolvedValue("approve");
    executeOpenApp.mockResolvedValue({ status: "launched", packageName: "com.example.app" });

    const toolSet = createDeviceToolSet();
    const result = await toolSet["device.open_app"].execute?.({
      packageName: "com.example.app",
    });

    expect(requestDeviceToolApproval).toHaveBeenCalledWith("device.open_app", {
      packageName: "com.example.app",
    });
    expect(executeOpenApp).toHaveBeenCalledWith({ packageName: "com.example.app" });
    expect(result).toEqual({ status: "launched", packageName: "com.example.app" });
  });

  it("does not execute when runtime approval is denied", async () => {
    requestDeviceToolApproval.mockResolvedValue("deny");

    const toolSet = createDeviceToolSet();
    const result = await toolSet["device.open_app"].execute?.({
      packageName: "com.example.app",
    });

    expect(requestDeviceToolApproval).toHaveBeenCalledTimes(1);
    expect(executeOpenApp).not.toHaveBeenCalled();
    expect(result).toEqual({ status: "needs_approval", packageName: "com.example.app" });
  });

  it("reuses session approval without asking again", async () => {
    approveAppForSession("com.example.app");
    executeOpenApp.mockResolvedValue({ status: "launched", packageName: "com.example.app" });

    const toolSet = createDeviceToolSet();
    await toolSet["device.open_app"].execute?.({
      packageName: "com.example.app",
    });

    expect(requestDeviceToolApproval).not.toHaveBeenCalled();
    expect(executeOpenApp).toHaveBeenCalledWith({ packageName: "com.example.app" });
  });
});
