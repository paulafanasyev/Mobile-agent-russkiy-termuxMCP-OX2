import { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";

import { createDeviceToolSet } from "@/tools/bridge";
import { wrapToolsWithApproval } from "@/modules/runtime/tool-approval";

const TARGET_PACKAGE = "com.android.settings";

export default function HandsSmokeScreen() {
  const [status, setStatus] = useState("STARTING");

  useEffect(() => {
    let cancelled = false;

    async function run() {
      if (Platform.OS !== "android") {
        setStatus("FAIL:ANDROID_ONLY");
        return;
      }

      try {
        // This deliberately uses the same device ToolSet and approval bridge
        // as the agent runtime. Auto mode is used only for this deterministic
        // CI probe so no human dialog is required in the emulator.
        wrapToolsWithApproval({}, {
          mode: "auto",
          requestApproval: async () => "approve",
          shouldRequireApproval: () => true,
        });

        const tools = createDeviceToolSet();
        const openApp = tools["device.open_app"];
        if (!openApp || typeof openApp.execute !== "function") {
          throw new Error("device.open_app tool is unavailable");
        }

        const result = await openApp.execute({ packageName: TARGET_PACKAGE });
        if (cancelled) return;

        if (
          result &&
          typeof result === "object" &&
          "status" in result &&
          result.status === "launched"
        ) {
          setStatus("PASS:DEVICE_OPEN_APP_LAUNCHED");
        } else {
          setStatus(`FAIL:DEVICE_OPEN_APP_RESULT:${JSON.stringify(result)}`);
        }
      } catch (error) {
        if (!cancelled) {
          setStatus(
            `FAIL:${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <View
      accessible
      accessibilityLabel="Hands Android smoke test"
      style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
    >
      <Text testID="hands-smoke-status">{status}</Text>
    </View>
  );
}
