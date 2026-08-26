import type { ToolSet } from "ai";

import { createRecord, summarizeValue } from "@/modules/tools/built-in/shared";
import type {
  PendingToolApprovalRequest,
  ToolApprovalMode,
  ToolExecutionRecord,
} from "@/core/types/app-state";

type ToolApprovalDecision = "approve" | "deny" | "abort";

let approvalSequence = 0;

type DeviceToolApprovalHandler = (
  toolName: string,
  toolInput: unknown,
) => Promise<ToolApprovalDecision>;

let deviceToolApprovalHandler: DeviceToolApprovalHandler | null = null;

/**
 * Device tools are injected by the AI SDK runtime after the normal runtime
 * ToolSet has been assembled. Register the current run's approval bridge so
 * Android actions still pass through the same UI approval path.
 */
export function setDeviceToolApprovalHandler(
  handler: DeviceToolApprovalHandler | null,
): void {
  deviceToolApprovalHandler = handler;
}

export async function requestDeviceToolApproval(
  toolName: string,
  toolInput: unknown,
): Promise<ToolApprovalDecision | null> {
  if (!deviceToolApprovalHandler) {
    return null;
  }
  return deviceToolApprovalHandler(toolName, toolInput);
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
    const inputSummary =
      input.getRequestSummary?.(toolName, toolInput) ??
      summarizeValue(toolInput);
    const needsApproval =
      input.shouldRequireApproval?.(toolName, toolInput) ?? true;

    if (input.mode !== "ask" || !needsApproval) {
      return "approve";
    }

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
            const inputSummary =
              input.getRequestSummary?.(toolName, toolInput) ??
              summarizeValue(toolInput);
            const needsApproval =
              input.shouldRequireApproval?.(toolName, toolInput) ?? true;

            if (input.mode === "ask" && needsApproval) {
              const decision = await input.requestApproval({
                id: createApprovalId(toolName),
                inputSummary,
                toolName,
              });

              if (decision === "abort") {
                throw new Error("Request aborted.");
              }

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
