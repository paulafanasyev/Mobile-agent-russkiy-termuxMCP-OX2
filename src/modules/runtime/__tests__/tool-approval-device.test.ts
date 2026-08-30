import { beforeEach, describe, expect, it, vi } from "vitest";

const secureStore = new Map<string, string>();

vi.mock("expo-secure-store", () => ({
  getItemAsync: vi.fn(async (key: string) => secureStore.get(key) ?? null),
  setItemAsync: vi.fn(async (key: string, value: string) => { secureStore.set(key, value); }),
  deleteItemAsync: vi.fn(async (key: string) => { secureStore.delete(key); }),
}));

import {
  requestDeviceToolApproval,
  setDeviceToolApprovalHandler,
  wrapToolsWithApproval,
} from "@/modules/runtime/tool-approval";
import { tool } from "ai";
import { z } from "zod";

describe("device tool approval bridge", () => {
  beforeEach(() => {
    secureStore.clear();
    setDeviceToolApprovalHandler(null);
  });

  it("returns null when no runtime approval bridge is installed", async () => {
    await expect(
      requestDeviceToolApproval("device.open_app", {
        packageName: "com.example.app",
      }),
    ).resolves.toBeNull();
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

    await expect(
      requestDeviceToolApproval("device.open_app", {
        packageName: "com.example.app",
      }),
    ).resolves.toBe("approve");

    expect(decisions).toHaveLength(1);
    expect(decisions[0]).toContain("device.open_app");
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
        requestApproval: async () => {
          throw new Error("should not be called in auto mode");
        },
      },
    );

    await expect(
      requestDeviceToolApproval("device.open_app", {
        packageName: "com.example.app",
      }),
    ).resolves.toBe("approve");
  });
});
