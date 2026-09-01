import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, PermissionsAndroid, Platform, Pressable, Text, View } from "react-native";
import { Mic, MicOff, Volume2 } from "lucide-react-native";

import { useChat } from "@/hooks/use-chat";
import { useTheme } from "@/hooks/use-theme";
import { SvetlanaVoice } from "@/modules/local-ai";

async function ensureMicrophonePermission() {
  if (Platform.OS !== "android") return true;
  const alreadyGranted = await PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
  );
  if (alreadyGranted) return true;
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    {
      title: "Микрофон для голосового общения",
      message: "Разрешение нужно для голосового ввода. После выдачи Android сохраняет его, пока вы сами не отзовёте доступ.",
      buttonPositive: "Разрешить",
      buttonNegative: "Не сейчас",
    },
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export function VoiceControl() {
  const theme = useTheme();
  const { messages, sendMessage } = useChat();
  const [listening, setListening] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastSpokenId = useRef<string | null>(null);

  useEffect(() => {
    if (busy) return;
    const assistant = [...messages].reverse().find(
      (message) => message.role === "assistant" && message.status === "completed",
    );
    if (!assistant || assistant.id === lastSpokenId.current) return;
    if (!lastSpokenId.current) {
      lastSpokenId.current = assistant.id;
      return;
    }
    lastSpokenId.current = assistant.id;
    void SvetlanaVoice.speak(assistant.content).catch(() => undefined);
  }, [busy, messages]);

  async function toggleListening() {
    setError(null);
    if (listening) {
      try {
        await SvetlanaVoice.stopListening();
      } finally {
        setListening(false);
      }
      return;
    }
    if (!(await ensureMicrophonePermission())) {
      setError("Доступ к микрофону не разрешён.");
      return;
    }
    try {
      setListening(true);
      const text = (await SvetlanaVoice.listen()).trim();
      if (!text) throw new Error("Речь не распознана.");
      setBusy(true);
      await sendMessage({ content: text });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Голосовой ввод не сработал.");
    } finally {
      setBusy(false);
      setListening(false);
    }
  }

  async function speakLast() {
    const assistant = [...messages].reverse().find((message) => message.role === "assistant");
    if (!assistant) return;
    setError(null);
    try {
      await SvetlanaVoice.speak(assistant.content);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Не удалось озвучить ответ.");
    }
  }

  return (
    <View className="gap-2 rounded-2xl border border-border bg-background/95 p-2 dark:border-border-dark dark:bg-background-dark/95">
      <View className="flex-row items-center gap-2">
        <Pressable
          accessibilityLabel={listening ? "Остановить голосовой ввод" : "Начать голосовой ввод"}
          disabled={busy}
          onPress={() => void toggleListening()}
          className="h-12 flex-1 flex-row items-center justify-center gap-2 rounded-xl bg-primary"
        >
          {busy ? (
            <ActivityIndicator color={theme.primaryForeground} />
          ) : listening ? (
            <MicOff color={theme.primaryForeground} size={20} />
          ) : (
            <Mic color={theme.primaryForeground} size={20} />
          )}
          <Text className="font-sans font-semibold text-primary-foreground">
            {busy ? "Отправляю…" : listening ? "Слушаю…" : "Говорить"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Озвучить последний ответ"
          disabled={!messages.some((message) => message.role === "assistant")}
          onPress={() => void speakLast()}
          className="h-12 w-12 items-center justify-center rounded-xl bg-muted dark:bg-muted-dark"
        >
          <Volume2 color={theme.text} size={20} />
        </Pressable>
      </View>
      {error ? (
        <Text className="px-1 text-xs text-destructive dark:text-destructive-dark">{error}</Text>
      ) : null}
    </View>
  );
}
