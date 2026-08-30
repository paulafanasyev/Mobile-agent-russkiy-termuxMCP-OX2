import { useEffect, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { wrapToolsWithApproval } from "@/modules/runtime/tool-approval";
import { createDeviceToolSet } from "@/tools/bridge";

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

        const deviceTools = createDeviceToolSet();
        const wrapped = wrapToolsWithApproval(deviceTools, {
          mode: "auto",
          requestApproval: async () => "approve",
        });
        log("HANDS_TOOLSET_CREATED");
        log("HANDS_APPROVAL_HANDLER_SET");

        const observe = wrapped["device.ui.observe"];
        const act = wrapped["device.ui.act"];
        if (!observe?.execute || !act?.execute) {
          throw new Error("Accessibility Hands tools are not executable");
        }

        let observed: any = null;
        for (let attempt = 1; attempt <= 30; attempt += 1) {
          observed = await observe.execute(
            { maxNodes: 200 },
            { toolCallId: `hands-observe-${attempt}`, messages: [], context: {} },
          );
          if (observed?.status === "observed") break;
          if (attempt < 30) await new Promise((resolve) => setTimeout(resolve, 500));
        }
        log(`HANDS_UI_OBSERVE_RESULT status=${String(observed?.status)} nodes=${String(observed?.nodes?.length ?? 0)}`);
        const isTarget = (n: any) =>
          n.clickable && (n.text === "HANDS_REAL_ACTION_TARGET" || n.contentDescription === "HANDS_REAL_ACTION_TARGET");
        if (observed?.status !== "observed" || !observed.nodes?.some(isTarget)) {
          throw new Error("Real accessibility UI target was not observed");
        }

        const target = observed.nodes.find(isTarget);
        if (!target) throw new Error("Clickable Hands target missing");
        const bounds = target.bounds;
        const x = (bounds.left + bounds.right) / 2;
        const y = (bounds.top + bounds.bottom) / 2;

        const result = await act.execute(
          {
            action: { type: "tap", x, y },
            waitMs: 500,
            expectedText: "HANDS_ACTION_EXECUTED",
          },
          { toolCallId: "hands-act", messages: [], context: {} },
        );
        log(`HANDS_UI_ACT_RESULT status=${String(result?.status)} verified=${String(result?.verified)}`);
        if (result?.status !== "verified" || result?.verified !== true) {
          throw new Error(`Real accessibility tap was not causally verified: ${JSON.stringify(result)}`);
        }

        log("PASS:REAL_ACCESSIBILITY_TAP_VERIFIED");

        const openAppTool = wrapped["device.open_app"];
        if (!openAppTool?.execute) throw new Error("device.open_app is not executable");
        const openResult = await openAppTool.execute(
          { packageName: "com.android.settings" },
          { toolCallId: "hands-open-app", messages: [], context: {} },
        );
        log(`HANDS_OPEN_APP_RESULT status=${String(openResult?.status)}`);
        if (
          openResult?.status !== "launched_verified" ||
          openResult?.packageName !== "com.android.settings" ||
          openResult?.verified !== true
        ) {
          throw new Error(`Unexpected open-app result: ${JSON.stringify(openResult)}`);
        }
        log("HANDS_NATIVE_INTENT_REQUESTED package=com.android.settings");
        log("PASS:DEVICE_OPEN_APP_LAUNCHED_VERIFIED");

        if (!cancelled) {
          setEvidence([...logs]);
          setStatus("pass");
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        log(`HANDS_EXCEPTION: ${message}`);
        if (!cancelled) {
          setEvidence([...logs]);
          setStatus("fail");
        }
      }
    };

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: "center", alignItems: "center", padding: 24, gap: 16 }}>
      <Text>OX2 Hands Smoke</Text>
      <Text>Status: {status}</Text>
      <Pressable
        accessible
        accessibilityRole="button"
        accessibilityLabel="HANDS_REAL_ACTION_TARGET"
        onPress={() => setActionExecuted(true)}
        style={{ padding: 24, borderWidth: 2, borderRadius: 12 }}
      >
        <Text>{actionExecuted ? "HANDS_ACTION_EXECUTED" : "HANDS_REAL_ACTION_TARGET"}</Text>
      </Pressable>
      {evidence.map((line, index) => (
        <Text key={`${index}-${line}`}>{line}</Text>
      ))}
    </View>
  );
}
