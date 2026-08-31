import type { ToolSet } from "ai";
import * as SecureStore from "expo-secure-store";

import { createRecord, summarizeValue } from "@/modules/tools/built-in/shared";
import type {
  PendingToolApprovalRequest,
  ToolApprovalMode,
  ToolExecutionRecord,
} from "@/core/types/app-state";

type ToolApprovalDecision = "approve" | "deny" | "abort";
export type PersistentToolApproval = "ask" | "always" | "deny";

const APPROVAL_STORE_KEY = "ox2.tool-approvals.v1";
let approvalSequence = 0;
let approvalsCache: Record<string, PersistentToolApproval> | null = null;

/** Persistent approval schema v1: { [capability/toolName]: "ask" | "always" | "deny" }. */
async function readApprovals(): Promise<Record<string, PersistentToolApproval>> {
  if (approvalsCache) return approvalsCache;
  const raw = await SecureStore.getItemAsync(APPROVAL_STORE_KEY);
  if (!raw) {
    approvalsCache = {};
    return approvalsCache;
  }
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      approvalsCache = {};
      return approvalsCache;
    }
    const valid: Record<string, PersistentToolApproval> = {};
    for (const [key, value] of Object.entries(parsed)) {
      if (value === "ask" || value === "always" || value === "deny") valid[key] = value;
    }
    approvalsCache = valid;
    return valid;
  } catch {
    approvalsCache = {};
    return approvalsCache;
  }
}

async function writeApprovals(approvals: Record<string, PersistentToolApproval>): Promise<void> {
  approvalsCache = approvals;
  await SecureStore.setItemAsync(APPROVAL_STORE_KEY, JSON.stringify(approvals));
}

export async function getToolApproval(toolName: string): Promise<PersistentToolApproval> {
  return (await readApprovals())[toolName] ?? "ask";
}

export async function setToolApproval(
  toolName: string,
  approval: PersistentToolApproval,
): Promise<void> {
  const approvals = await readApprovals();
  approvals[toolName] = approval;
  await writeApprovals(approvals);
}

export async function revokeToolApproval(toolName: string): Promise<void> {
  await setToolApproval(toolName, "ask");
}

export async function clearToolApprovals(): Promise<void> {
  approvalsCache = {};
  await SecureStore.deleteItemAsync(APPROVAL_STORE_KEY);
}

type DeviceToolApprovalHandler = (
  toolName: string,
  toolInput: unknown,
) => Promise<ToolApprovalDecision>;

let deviceToolApprovalHandler: DeviceToolApprovalHandler | null = null;

export function setDeviceToolApprovalHandler(
  handler: DeviceToolApprovalHandler | null,
): void {
  deviceToolApprovalHandler = handler;
}

export async function requestDeviceToolApproval(
  toolName: string,
  toolInput: unknown,
): Promise<ToolApprovalDecision | null> {
  const persisted = await getToolApproval(toolName);
  if (persisted === "always") return "approve";
  if (persisted === "deny") return "deny";
  if (!deviceToolApprovalHandler) return null;

  const decision = await deviceToolApprovalHandler(toolName, toolInput);
  if (decision === "approve") {
    // The UI may promote the approval to "always" through setToolApproval().
    // A normal approve remains ASK_ONCE and is therefore intentionally not persisted.
  }
  return decision;
}

function createApprovalId(toolName: string) {
  approvalSequence += 1;
  return `${toolName}:${Date.now()}:${approvalSequence}`;
}

export function wrapToolsWithApproval<T extends ToolSet>(
  tools: T,
  input: {
    getRequestSummary?: (toolName: string, toolInput: unknown) => string;
    mode: ToolApprovalMode;
    onRecord?: (record: ToolExecutionRecord) => void;
    shouldRequireApproval?: (toolName: string, toolInput: unknown) => boolean;
    requestApproval: (
      request: PendingToolApprovalRequest,
    ) => Promise<ToolApprovalDecision>;
  },
) {
  setDeviceToolApprovalHandler(async (toolName, toolInput) => {
    const persisted = await getToolApproval(toolName);
    if (persisted === "always") return "approve";
    if (persisted === "deny") return "deny";

    const inputSummary =
      input.getRequestSummary?.(toolName, toolInput) ?? summarizeValue(toolInput);
    const needsApproval = input.shouldRequireApproval?.(toolName, toolInput) ?? true;
    if (input.mode !== "ask" || !needsApproval) return "approve";

    return input.requestApproval({
      id: createApprovalId(toolName),
      inputSummary,
      toolName,
    });
  });

  return Object.fromEntries(
    Object.entries(tools).map(([toolName, toolDefinition]) => {
      if (!toolDefinition || typeof toolDefinition.execute !== "function") {
        return [toolName, toolDefinition];
      }

      const execute = toolDefinition.execute as (
        toolInput: unknown,
        options?: unknown,
      ) => Promise<unknown>;

      return [
        toolName,
        {
          ...toolDefinition,
          execute: async (toolInput: unknown, options?: unknown) => {
            const persisted = await getToolApproval(toolName);
            const inputSummary =
              input.getRequestSummary?.(toolName, toolInput) ?? summarizeValue(toolInput);
            const needsApproval =
              input.shouldRequireApproval?.(toolName, toolInput) ?? true;

            if (input.mode === "ask" && needsApproval && persisted !== "always") {
              const decision = persisted === "deny"
                ? "deny"
                : await input.requestApproval({
                    id: createApprovalId(toolName),
                    inputSummary,
                    toolName,
                  });

              if (decision === "abort") throw new Error("Request aborted.");
              if (decision === "deny") {
                input.onRecord?.(
                  createRecord({
                    toolName,
                    status: "failed",
                    inputSummary,
                    error: "User denied this tool call.",
                  }),
                );
                return {
                  denied: true,
                  message:
                    "The user denied this tool call. Ask before trying again or continue without this tool.",
                };
              }
            }

            return execute(toolInput, options);
          },
        },
      ];
    }),
  ) as T;
}
