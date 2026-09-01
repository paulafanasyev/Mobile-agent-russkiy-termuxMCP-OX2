import { useRouter } from "expo-router";
import {
  ChevronLeft,
  ChevronRight,
  ListChecks,
} from "lucide-react-native";
import { useEffect, useState, type ReactNode } from "react";
import { Pressable, Platform, Text, View } from "react-native";

import { ToolToggleList } from "@/components/settings/tool-toggle-list";
import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerBody,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { useConfig } from "@/hooks/use-config";
import { useTheme } from "@/hooks/use-theme";
import { BUILT_IN_FILE_TOOL_CONTROLS } from "@/modules/config/built-in-tools";
import { isAccessibilityEnabled, openAccessibilitySettings } from "accessibility-agent";
import {
  isHandsAlwaysAllowed,
  setHandsAlwaysAllowed,
} from "@/modules/runtime/hands-permission";

export default function SettingsToolsScreen() {
  const router = useRouter();
  const theme = useTheme();
  const {
    maxToolSteps,
    updateMaxToolSteps,
  } = useConfig();
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [stepDraft, setStepDraft] = useState(String(maxToolSteps));
  const [stepsDrawerOpen, setStepsDrawerOpen] = useState(false);
  const [handsAlwaysAllow, setHandsAlwaysAllow] = useState(false);
  const [handsEnabled, setHandsEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let active = true;
    const refreshHands = async () => {
      const [alwaysAllow, enabled] = await Promise.all([
        isHandsAlwaysAllowed(),
        Platform.OS === "android" ? isAccessibilityEnabled() : Promise.resolve(false),
      ]);
      if (!active) return;
      setHandsAlwaysAllow(alwaysAllow);
      setHandsEnabled(enabled);
    };
    void refreshHands();
    const timer = setInterval(() => void refreshHands(), 1500);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);

  const runAction = async (key: string, action: () => Promise<void>) => {
    setBusyKey(key);

    try {
      await action();
    } finally {
      setBusyKey(null);
    }
  };

  return (
    <Container
      scroll
      contentClassName="gap-sp-4 py-sp-4"
      includeBottomTabInset={false}
    >
      <View className="flex-row items-center gap-sp-2">
        <Button
          leftIcon={<ChevronLeft color={theme.text} size={16} />}
          onPress={() => {
            router.push("/settings");
          }}
          size="icon-xs"
          variant="ghost"
        />
        <Text className="font-sans text-xl font-semibold text-foreground dark:text-foreground-dark">
          Built-in tools
        </Text>
      </View>

      <Card className="overflow-hidden">
        <ToolGroupRow
          icon={<ListChecks color={theme.text} size={19} />}
          label="Maximum tool steps"
          onPress={() => {
            setStepDraft(String(maxToolSteps));
            setStepsDrawerOpen(true);
          }}
          value={`${maxToolSteps}`}
        />
      </Card>

      {Platform.OS === "android" ? (
        <Card className="overflow-hidden">
          <View className="gap-sp-3 px-sp-4 py-sp-4">
            <View className="gap-1">
              <Text className="font-sans text-base font-medium text-foreground dark:text-foreground-dark">
                Hands — phone control
              </Text>
              <Text className="font-sans text-xs text-muted-foreground dark:text-muted-foreground-dark">
                Keep Hands approved for future Chat and voice actions. This is
                an OX2 app preference; Android still requires Accessibility
                access to be enabled once in system settings.
              </Text>
            </View>

            <View className="flex-row items-center justify-between gap-sp-3">
              <View className="min-w-0 flex-1">
                <Text className="font-sans text-base text-foreground dark:text-foreground-dark">
                  Always allow Hands
                </Text>
                <Text className="font-sans text-xs text-muted-foreground dark:text-muted-foreground-dark">
                  {handsEnabled === null
                    ? "Checking Android service…"
                    : handsEnabled
                      ? "Android Accessibility is enabled."
                      : "Android Accessibility must be enabled once."}
                </Text>
              </View>
              <Checkbox
                checked={handsAlwaysAllow}
                onCheckedChange={(checked) => {
                  runAction("hands-always-allow", async () => {
                    await setHandsAlwaysAllowed(checked);
                    setHandsAlwaysAllow(checked);
                  }).catch(console.error);
                }}
              />
            </View>

            {!handsEnabled ? (
              <Button
                variant="outline"
                onPress={() => {
                  openAccessibilitySettings().catch(console.error);
                }}
              >
                Open Android Accessibility settings
              </Button>
            ) : null}
          </View>
        </Card>
      ) : null}

      <Text className="font-sans text-sm text-muted-foreground dark:text-muted-foreground-dark">
        Give the agent access to files in its workspace and selected folders.
      </Text>

      <ToolToggleList controls={BUILT_IN_FILE_TOOL_CONTROLS} />

      <Drawer onOpenChange={setStepsDrawerOpen} open={stepsDrawerOpen}>
        <DrawerContent showCloseButton>
          <DrawerHeader>
            <DrawerTitle>Maximum tool steps</DrawerTitle>
          </DrawerHeader>
          <DrawerBody contentContainerClassName="gap-sp-3">
            <Text className="font-sans text-sm text-muted-foreground dark:text-muted-foreground-dark">
              Stop an agent loop after this many model steps (1–100).
            </Text>
            <Input
              keyboardType="number-pad"
              onChangeText={setStepDraft}
              value={stepDraft}
            />
          </DrawerBody>
          <DrawerFooter>
            <Button
              loading={busyKey === "max-tool-steps"}
              onPress={() => {
                const value = Number(stepDraft);
                if (!Number.isFinite(value)) {
                  setStepDraft(String(maxToolSteps));
                  return;
                }
                runAction("max-tool-steps", async () => {
                  const normalized = Math.max(1, Math.min(100, Math.round(value)));
                  await updateMaxToolSteps(normalized);
                  setStepDraft(String(normalized));
                  setStepsDrawerOpen(false);
                }).catch(console.error);
              }}
            >
              Save
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    </Container>
  );
}

function ToolGroupRow({
  icon,
  label,
  onPress,
  value,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  value: string;
}) {
  const theme = useTheme();

  return (
    <Pressable
      accessibilityRole="button"
      className="min-h-16 flex-row items-center gap-sp-3 px-sp-4 py-sp-3"
      onPress={onPress}
      style={({ pressed }) => (pressed ? { opacity: 0.84 } : null)}
    >
      <View className="size-10 items-center justify-center rounded-xl bg-muted dark:bg-muted-dark">
        {icon}
      </View>
      <View className="min-w-0 flex-1">
        <Text className="font-sans text-base font-medium text-foreground dark:text-foreground-dark">
          {label}
        </Text>
        <Text className="font-sans text-xs text-muted-foreground dark:text-muted-foreground-dark">
          {value}
        </Text>
      </View>
      <ChevronRight color={theme.textSecondary} size={18} />
    </Pressable>
  );
}
