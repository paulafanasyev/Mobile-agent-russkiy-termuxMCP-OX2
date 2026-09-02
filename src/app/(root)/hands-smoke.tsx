import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { wrapToolsWithApproval } from "@/modules/runtime/tool-approval";
import { createDeviceToolSet, isDeviceAppApproved } from "@/tools/bridge";
import {
  isAccessibilityEnabled,
  getAccessibilityTree,
} from "accessibility-agent";

type SmokeStatus = "idle" | "running" | "pass" | "fail";

export default function HandsSmokeScreen() {
  const [status, setStatus] = useState<SmokeStatus>("idle");
  const [evidence, setEvidence] = useState<string[]>([]);
  const [actionExecuted, setActionExecuted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const logs: string[] = [];
    const log = (message: string) => {
      logs.push(message);
      console.log(message);
    };

    const run = async () => {
      try {
        setStatus("running");
        log("HANDS_SMOKE_START");
        log("H1_SMOKE_START=PASS");

        // Runtime bind proof: settings registration alone is insufficient.
        // Wait for the native AccessibilityService singleton and a real tree.
        let runtimeTree: any[] = [];
        let runtimeBound = false;
        for (let attempt = 0; attempt < 30; attempt += 1) {
          const enabled = await isAccessibilityEnabled();
          if (enabled) {
            runtimeTree = await getAccessibilityTree(200);
            if (runtimeTree.length > 0) {
              runtimeBound = true;
              break;
            }
          }
          await new Promise((resolve) => setTimeout(resolve, 500));
        }
        if (!runtimeBound) {
          throw new Error("AccessibilityService runtime bind/tree proof unavailable");
        }
        log(
          `HANDS_ACCESSIBILITY_RUNTIME service_bound=true native_instance=true tree_nodes=${runtimeTree.length}`,
        );
        log("H5_RUNTIME_BIND=PASS");

        const deviceTools = createDeviceToolSet();
        const tools = wrapToolsWithApproval(deviceTools, {
          mode: "ask",
          requestApproval: async (request) => {
            log(`HANDS_APPROVAL_REQUESTED tool=${request.toolName}`);
            log(`HANDS_APPROVAL_GRANTED tool=${request.toolName}`);
            return "approve";
          },
        });

        log("HANDS_UI_OBSERVE_BEGIN");
        const observed = await tools["device.ui.observe"]({ maxNodes: 200 });
        log(`HANDS_UI_OBSERVE_RESULT nodes=${observed?.nodes?.length ?? 0}`);
        const target = observed?.nodes?.find(
          (node: any) =>
            node?.text === "HANDS_REAL_ACTION_TARGET" ||
            node?.contentDescription === "HANDS_REAL_ACTION_TARGET",
        );
        if (!target) {
          throw new Error("HANDS_REAL_ACTION_TARGET not found");
        }
        log(`HANDS_REAL_TARGET_FOUND id=${target.id ?? "unknown"}`);

        log("HANDS_UI_ACT_BEGIN");
        const acted = await tools["device.ui.act"]({
          action: "tap",
          nodeId: target.id,
        });
        log(
          `HANDS_UI_ACT_RESULT status=${acted?.status ?? "unknown"} verified=${acted?.verified ?? false}`,
        );
        if (acted?.status !== "verified" || acted?.verified !== true) {
          throw new Error("Real Accessibility tap was not verified");
        }
        setActionExecuted(true);
        log("PASS:REAL_ACCESSIBILITY_TAP_VERIFIED");

        const app = await tools["device.open_app"]({ packageName: "com.android.settings" });
        if (!app?.launched_verified || app?.verified !== true) {
          throw new Error("Settings launch was not verified");
        }
        if (!(await isDeviceAppApproved("com.android.settings"))) {
          throw new Error("Settings launch did not retain device approval");
        }
        log("HANDS_NATIVE_INTENT_REQUESTED");
        log("HANDS_OPEN_APP_VERIFIED=PASS");
        log("HANDS_SMOKE_PASS");
        if (!cancelled) setStatus("pass");
      } catch (error) {
        log(`HANDS_SMOKE_FAIL ${error instanceof Error ? error.message : String(error)}`);
        if (!cancelled) setStatus("fail");
      } finally {
        if (!cancelled) setEvidence([...logs]);
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={{ flex: 1, padding: 24, gap: 16 }}>
      <Text>Hands Android Emulator Smoke</Text>
      <Text>Статус: {status}</Text>
      <Text>Accessibility tap: {actionExecuted ? "verified" : "not verified"}</Text>
      <Pressable onPress={() => {}}>
        <Text>Evidence</Text>
      </Pressable>
      {evidence.map((line, index) => (
        <Text key={`${index}-${line}`}>{line}</Text>
      ))}
    </View>
  );
}
