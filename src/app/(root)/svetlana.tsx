import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { Mic, MicOff, Volume2 } from "lucide-react-native";

import { SvetlanaAvatar } from "@/components/svetlana/svetlana-avatar";
import { useChat } from "@/hooks/use-chat";
import { t } from "@/i18n";

async function requestMicrophonePermission() {
  if (Platform.OS !== "android") return true;
  const result = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
    {
      title: "Микрофон для Светланы",
      message: "Светлане нужен доступ к микрофону для голосового общения.",
      buttonPositive: "Разрешить",
      buttonNegative: "Не сейчас",
    },
  );
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export default function SvetlanaScreen() {
  const { messages, sendMessage, currentConversationRunStatus } = useChat();
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [voiceError, setVoiceError] = useState<string | null>(null);
  const [waitingForResponse, setWaitingForResponse] = useState(false);
  const lastVoiceAssistantId = useRef<string | null>(null);

  useEffect(() => {
    if (!waitingForResponse) return;
    const assistant = [...messages]
      .reverse()
      .find((message) => message.role === "assistant" && message.status === "completed");
    if (!assistant || assistant.id === lastVoiceAssistantId.current) return;

    lastVoiceAssistantId.current = assistant.id;
    setWaitingForResponse(false);
    void import("../../../modules/local-ai")
      .then(({ SvetlanaVoice }) => SvetlanaVoice.speak(assistant.content))
      .catch((error) => {
        setVoiceError(error instanceof Error ? error.message : "Не удалось озвучить ответ.");
      });
  }, [messages, waitingForResponse]);

  async function handleVoiceChat() {
    setVoiceError(null);
    if (listening) {
      try {
        const { SvetlanaVoice } = await import("../../../modules/local-ai");
        await SvetlanaVoice.stopListening();
      } finally {
        setListening(false);
      }
      return;
    }

    const granted = await requestMicrophonePermission();
    if (!granted) {
      setVoiceError("Доступ к микрофону не разрешён.");
      return;
    }

    try {
      setListening(true);
      setTranscript("");
      const { SvetlanaVoice } = await import("../../../modules/local-ai");
      const text = await SvetlanaVoice.listen();
      setTranscript(text);
      setWaitingForResponse(true);
      await sendMessage({ content: text });
    } catch (error) {
      setWaitingForResponse(false);
      setVoiceError(error instanceof Error ? error.message : "Голосовой ввод не сработал.");
    } finally {
      setListening(false);
    }
  }

  async function handleSpeakLast() {
    const assistant = [...messages].reverse().find((message) => message.role === "assistant");
    if (!assistant) return;
    try {
      const { SvetlanaVoice } = await import("../../../modules/local-ai");
      await SvetlanaVoice.speak(assistant.content);
    } catch (error) {
      Alert.alert("Светлана", error instanceof Error ? error.message : "Не удалось включить озвучку.");
    }
  }

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t("svetlana.title") }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.hero}>
          <SvetlanaAvatar />
          <View style={styles.heroText}>
            <Text style={styles.title}>Светлана</Text>
            <Text style={styles.subtitle}>Голосовой AI-ассистент OX2</Text>
            <View style={styles.statusRow}>
              <View style={styles.dot} />
              <Text style={styles.status}>Готова к разговору</Text>
            </View>
          </View>
        </View>

        <View style={styles.voiceCard}>
          <Text style={styles.voiceTitle}>Голосовой чат</Text>
          <Text style={styles.voiceHint}>
            Нажмите микрофон, скажите запрос по-русски. Светлана передаст его выбранной модели и озвучит ответ.
          </Text>

          <Pressable
            accessibilityLabel={listening ? "Остановить запись" : "Начать голосовой ввод"}
            onPress={handleVoiceChat}
            style={({ pressed }) => [styles.micButton, pressed && styles.pressed]}
          >
            {listening ? <MicOff color="#fff" size={28} /> : <Mic color="#fff" size={28} />}
            <Text style={styles.micLabel}>{listening ? "Слушаю…" : "Говорить"}</Text>
          </Pressable>

          {transcript ? (
            <View style={styles.transcript}>
              <Text style={styles.label}>Вы сказали</Text>
              <Text style={styles.transcriptText}>{transcript}</Text>
            </View>
          ) : null}

          {waitingForResponse || currentConversationRunStatus === "running" ? (
            <View style={styles.waiting}>
              <ActivityIndicator color="#a78bfa" />
              <Text style={styles.waitingText}>Светлана готовит ответ…</Text>
            </View>
          ) : null}

          {voiceError ? <Text style={styles.error}>{voiceError}</Text> : null}

          <Pressable onPress={handleSpeakLast} style={styles.secondary}>
            <Volume2 color="#c4b5fd" size={18} />
            <Text style={styles.secondaryText}>Озвучить последний ответ</Text>
          </Pressable>
        </View>

        <View style={styles.historyCard}>
          <Text style={styles.voiceTitle}>Последний диалог</Text>
          {[...messages]
            .filter((message) => message.role !== "system")
            .slice(-4)
            .map((message) => (
              <View key={message.id} style={styles.message}>
                <Text style={styles.label}>{message.role === "user" ? "Вы" : "Светлана"}</Text>
                <Text style={styles.messageText}>{message.content}</Text>
              </View>
            ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0b0910" },
  content: { padding: 20, gap: 16, paddingBottom: 40 },
  hero: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    backgroundColor: "#17111f",
    borderRadius: 22,
    padding: 18,
    borderWidth: 1,
    borderColor: "#35234d",
  },
  heroText: { flex: 1, gap: 5 },
  title: { color: "#fff", fontSize: 28, fontWeight: "800" },
  subtitle: { color: "#b8a8c8", fontSize: 15 },
  statusRow: { flexDirection: "row", alignItems: "center", gap: 7, marginTop: 5 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: "#31c463" },
  status: { color: "#8ee6a9", fontSize: 13, fontWeight: "600" },
  voiceCard: { backgroundColor: "#15131b", borderRadius: 20, padding: 20, gap: 14, borderWidth: 1, borderColor: "#292432" },
  voiceTitle: { color: "#fff", fontSize: 19, fontWeight: "700" },
  voiceHint: { color: "#aaa3b3", fontSize: 14, lineHeight: 21 },
  micButton: { minHeight: 72, borderRadius: 18, backgroundColor: "#7c3aed", alignItems: "center", justifyContent: "center", gap: 4 },
  micLabel: { color: "#fff", fontSize: 15, fontWeight: "700" },
  pressed: { opacity: 0.75, transform: [{ scale: 0.99 }] },
  transcript: { backgroundColor: "#1c1724", borderRadius: 14, padding: 14, gap: 5 },
  label: { color: "#9f8fb0", fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  transcriptText: { color: "#eeeaf2", fontSize: 16, lineHeight: 23 },
  waiting: { flexDirection: "row", alignItems: "center", gap: 10 },
  waitingText: { color: "#c4b5fd", fontSize: 14 },
  error: { color: "#ff8b8b", fontSize: 13, lineHeight: 19 },
  secondary: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, backgroundColor: "#211a2c", paddingVertical: 13 },
  secondaryText: { color: "#d8ccff", fontSize: 14, fontWeight: "600" },
  historyCard: { backgroundColor: "#15131b", borderRadius: 20, padding: 18, gap: 12, borderWidth: 1, borderColor: "#292432" },
  message: { backgroundColor: "#1c1724", borderRadius: 13, padding: 12, gap: 5 },
  messageText: { color: "#eeeaf2", fontSize: 14, lineHeight: 21 },
});
