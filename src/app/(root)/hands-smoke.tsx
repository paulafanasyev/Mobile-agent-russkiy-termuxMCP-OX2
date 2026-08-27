import { useEffect, useState } from "react";
import { Text, View } from "react-native";

import { wrapToolsWithApproval } from "@/modules/runtime/tool-approval";
import { createDeviceToolSet, isDeviceAppApproved } from "@/tools/bridge";

type SmokeStatus = "idle" | "running" | "pass" | "fail";

export default function HandsSmokeScreen() {
  const [status, setStatus] = useState<SmokeStatus>("idle");
  const [evidence, setEvidence] = useState<string[]>([]);

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
        if (!deviceTools["device.open_app"]?.execute) {
          throw new Error("device.open_app is not executable");
        }
        log("HANDS_TOOLSET_CREATED");

        const wrapped = wrapToolsWithApproval(deviceTools, {
          mode: "auto",
          requestApproval: async () => "approve",
        });
        log("HANDS_APPROVAL_HANDLER_SET");

        const openAppTool = wrapped["device.open_app"];
        if (!openAppTool?.execute) {
          throw new Error("wrapped device.open_app is not executable");
        }

        const result = await openAppTool.execute(
          { packageName: "com.android.settings" },
          { toolCallId: "hands-smoke", messages: [] },
        );

        log(`HANDS_OPEN_APP_RESULT status=${String(result?.status)}`);

        const approved = isDeviceAppApproved("com.android.settings");
        log(`HANDS_SESSION_APPROVED=${String(approved)} package=com.android.settings`);

        if (
          result?.status !== "launched_verified" ||
          result?.packageName !== "com.android.settings" ||
          result?.verified !== true ||
          !approved
        ) {
          throw new Error(`Unexpected Hands result/approval: ${JSON.stringify(result)}`);
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
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
      }}
    >
      <Text>OX2 Hands Smoke</Text>
      <Text>Status: {status}</Text>
      {evidence.map((line, index) => (
        <Text key={`${index}-${line}`}>{line}</Text>
      ))}
    </View>
  );
}
