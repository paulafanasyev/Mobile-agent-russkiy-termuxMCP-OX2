import { beforeEach, describe, expect, it, vi } from "vitest";

const secureStore = vi.hoisted(() => {
  let value: string | null = null;
  return {
    getItemAsync: vi.fn(async () => value),
    setItemAsync: vi.fn(async (_key: string, next: string) => { value = next; }),
    deleteItemAsync: vi.fn(async () => { value = null; }),
    reset: () => { value = null; },
  };
});

vi.mock("expo-secure-store", () => secureStore);

import {
  clearToolApprovals,
  getToolApproval,
  requestDeviceToolApproval,
  setDeviceToolApprovalHandler,
  setToolApproval,
  wrapToolsWithApproval,
} from "@/modules/runtime/tool-approval";
import { tool } from "ai";
import { z } from "zod";

describe("device tool approval bridge", () => {
  beforeEach(async () => {
    secureStore.reset();
    secureStore.getItemAsync.mockClear();
    secureStore.setItemAsync.mockClear();
    secureStore.deleteItemAsync.mockClear();
    setDeviceToolApprovalHandler(null);
    await clearToolApprovals();
  });

  it("defaults to ask and persists always by capability", async () => {
    await expect(getToolApproval("device.ui.act")).resolves.toBe("ask");
    await setToolApproval("device.ui.act", "always");
    await expect(getToolApproval("device.ui.act")).resolves.toBe("always");
    expect(secureStore.setItemAsync).toHaveBeenCalledWith(
      "ox2.tool-approvals.v1",
      JSON.stringify({ "device.ui.act": "always" }),
    );
  });

  it("skips the UI callback after always approval", async () => {
    const callback = vi.fn(async () => "approve" as const);
    setDeviceToolApprovalHandler(callback);
    await setToolApproval("device.ui.act", "always");

    await expect(requestDeviceToolApproval("device.ui.act", { action: "tap" })).resolves.toBe("approve");
    await expect(requestDeviceToolApproval("device.ui.act", { action: "type" })).resolves.toBe("approve");
    expect(callback).not.toHaveBeenCalled();
  });

  it("persists deny and skips the UI callback", async () => {
    const callback = vi.fn(async () => "approve" as const);
    setDeviceToolApprovalHandler(callback);
    await setToolApproval("device.open_app", "deny");

    await expect(requestDeviceToolApproval("device.open_app", { packageName: "com.example.app" })).resolves.toBe("deny");
    expect(callback).not.toHaveBeenCalled();
  });

  it("returns null when no runtime approval bridge is installed", async () => {
    await expect(requestDeviceToolApproval("device.open_app", {
      packageName: "com.example.app",
    })).resolves.toBeNull();
  });

  it("uses the same approval callback as normal runtime tools", async () => {
    const decisions: string[] = [];
    wrapToolsWithApproval(
      {
        example: tool({
          description: "example",
          inputSchema: z.object({ value: z.string() }),
          execute: async ({ value }) => value,
        }),
      },
      {
        mode: "ask",
        shouldRequireApproval: () => true,
        requestApproval: async (request) => {
          decisions.push(`${request.toolName}:${request.inputSummary}`);
          return "approve";
        },
      },
    );

    await expect(requestDeviceToolApproval("device.open_app", {
      packageName: "com.example.app",
    })).resolves.toBe("approve");
    expect(decisions).toHaveLength(1);
  });

  it("does not require a second UI approval in auto mode", async () => {
    wrapToolsWithApproval(
      {
        example: tool({
          description: "example",
          inputSchema: z.object({ value: z.string() }),
          execute: async ({ value }) => value,
        }),
      },
      {
        mode: "auto",
        requestApproval: async () => { throw new Error("should not be called in auto mode"); },
      },
    );

    await expect(requestDeviceToolApproval("device.open_app", {
      packageName: "com.example.app",
    })).resolves.toBe("approve");
  });
});
