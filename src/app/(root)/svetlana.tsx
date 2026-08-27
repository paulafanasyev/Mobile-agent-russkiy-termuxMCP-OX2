import { useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Animated,
  PermissionsAndroid,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Stack } from "expo-router";
import { Mic, MicOff, Volume2, Sparkles, ChevronRight } from "lucide-react-native";

import { SvetlanaAvatar } from "@/components/svetlana/svetlana-avatar";
import { useChat } from "@/hooks/use-chat";

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
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0, duration: 1800, useNativeDriver: true }),
      ]),
    ).start();
  }, [pulse]);

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

  const busy = listening || waitingForResponse || currentConversationRunStatus === "running";
  const stateText = listening ? "Слушаю вас" : busy ? "Готовлю ответ" : "Готова помочь";

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: "Светлана", headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topBar}>
          <View>
            <Text style={styles.eyebrow}>OX2 • AI ASSISTANT</Text>
            <Text style={styles.brand}>Светлана</Text>
          </View>
          <View style={styles.livePill}>
            <View style={styles.liveDot} />
            <Text style={styles.liveText}>ONLINE</Text>
          </View>
        </View>

        <View style={styles.hero}>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.glow,
              {
                opacity: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.18, 0.42] }),
                transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.08] }) }],
              },
            ]}
          />
          <View style={styles.avatarRing}>
            <SvetlanaAvatar />
          </View>
          <Text style={styles.state}>{stateText}</Text>
          <Text style={styles.heroTitle}>Чем помочь?</Text>
          <Text style={styles.heroHint}>Скажите, что нужно сделать — Светлана поможет выполнить задачу.</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel={listening ? "Остановить голосовой ввод" : "Начать голосовой ввод"}
            onPress={handleVoiceChat}
            style={({ pressed }) => [styles.voiceButton, pressed && styles.pressed]}
          >
            <View style={styles.voiceIcon}>{listening ? <MicOff color="#fff" size={25} /> : <Mic color="#fff" size={25} />}</View>
            <View style={styles.voiceButtonCopy}>
              <Text style={styles.voiceButtonTitle}>{listening ? "Слушаю…" : "Говорить со Светланой"}</Text>
              <Text style={styles.voiceButtonHint}>{listening ? "Нажмите, чтобы остановить" : "Нажмите и скажите запрос"}</Text>
            </View>
            <ChevronRight color="#c9a7ff" size={22} />
          </Pressable>
        </View>

        {transcript ? (
          <View style={styles.requestCard}>
            <View style={styles.requestHeader}>
              <Sparkles color="#b77cff" size={16} />
              <Text style={styles.sectionLabel}>ВАШ ЗАПРОС</Text>
            </View>
            <Text style={styles.requestText}>{transcript}</Text>
          </View>
        ) : null}

        {busy ? (
          <View style={styles.progressCard}>
            <ActivityIndicator color="#b77cff" />
            <View style={{ flex: 1 }}>
              <Text style={styles.progressTitle}>{listening ? "Светлана слушает" : "Светлана работает"}</Text>
              <Text style={styles.progressHint}>{listening ? "Говорите естественно" : "Подготавливаю следующий шаг…"}</Text>
            </View>
          </View>
        ) : null}

        {voiceError ? <Text style={styles.error}>{voiceError}</Text> : null}

        <View style={styles.sectionRow}>
          <Text style={styles.sectionTitle}>Последний диалог</Text>
          <Pressable accessibilityLabel="Озвучить последний ответ" onPress={handleSpeakLast} style={styles.speakButton}>
            <Volume2 color="#cdb5ed" size={18} />
          </Pressable>
        </View>

        <View style={styles.history}>
          {[...messages]
            .filter((message) => message.role !== "system")
            .slice(-3)
            .map((message) => (
              <View key={message.id} style={styles.message}>
                <View style={[styles.messageAvatar, message.role === "assistant" && styles.messageAvatarAssistant]}>
                  <Text style={styles.messageAvatarText}>{message.role === "user" ? "В" : "С"}</Text>
                </View>
                <View style={styles.messageBody}>
                  <Text style={styles.messageRole}>{message.role === "user" ? "Вы" : "Светлана"}</Text>
                  <Text style={styles.messageText} numberOfLines={3}>{message.content}</Text>
                </View>
              </View>
            ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#1a1a2e" },
  content: { paddingHorizontal: 18, paddingTop: 18, paddingBottom: 42 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 8 },
  eyebrow: { color: "#8e83a5", fontSize: 10, fontWeight: "800", letterSpacing: 1.5 },
  brand: { color: "#f4eefb", fontSize: 25, fontWeight: "800", marginTop: 2 },
  livePill: { flexDirection: "row", alignItems: "center", gap: 6, borderWidth: 1, borderColor: "#30365b", backgroundColor: "#16213e", borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#70d69a" },
  liveText: { color: "#9fbdad", fontSize: 9, fontWeight: "800", letterSpacing: 1 },
  hero: { alignItems: "center", paddingTop: 22, paddingBottom: 18, position: "relative" },
  glow: { position: "absolute", top: 15, width: 220, height: 220, borderRadius: 110, backgroundColor: "#7b2cbf" },
  avatarRing: { width: 132, height: 132, borderRadius: 66, alignItems: "center", justifyContent: "center", backgroundColor: "#16213e", borderWidth: 1, borderColor: "#9d4edd", shadowColor: "#7b2cbf", shadowOpacity: 0.55, shadowRadius: 24, elevation: 14 },
  state: { color: "#c8a5ee", fontSize: 13, fontWeight: "700", marginTop: 18 },
  heroTitle: { color: "#fff", fontSize: 32, fontWeight: "800", marginTop: 4, letterSpacing: -0.6 },
  heroHint: { color: "#a9a2b6", textAlign: "center", fontSize: 14, lineHeight: 20, maxWidth: 330, marginTop: 7, marginBottom: 18 },
  voiceButton: { width: "100%", minHeight: 76, borderRadius: 22, paddingHorizontal: 14, flexDirection: "row", alignItems: "center", backgroundColor: "#7b2cbf", borderWidth: 1, borderColor: "#9d4edd", shadowColor: "#7b2cbf", shadowOpacity: 0.32, shadowRadius: 14, elevation: 7 },
  voiceIcon: { width: 48, height: 48, borderRadius: 16, alignItems: "center", justifyContent: "center", backgroundColor: "#9d4edd" },
  voiceButtonCopy: { flex: 1, marginLeft: 12 },
  voiceButtonTitle: { color: "#fff", fontSize: 16, fontWeight: "800" },
  voiceButtonHint: { color: "#eadbfa", fontSize: 12, marginTop: 3 },
  requestCard: { backgroundColor: "#16213e", borderRadius: 18, padding: 15, borderWidth: 1, borderColor: "#30365b", marginTop: 6 },
  requestHeader: { flexDirection: "row", alignItems: "center", gap: 7, marginBottom: 8 },
  sectionLabel: { color: "#a894bd", fontSize: 10, fontWeight: "800", letterSpacing: 1.2 },
  requestText: { color: "#eee9f5", fontSize: 15, lineHeight: 22 },
  progressCard: { flexDirection: "row", alignItems: "center", gap: 12, backgroundColor: "#16213e", borderRadius: 18, padding: 15, marginTop: 10, borderWidth: 1, borderColor: "#30365b" },
  progressTitle: { color: "#eee9f5", fontSize: 14, fontWeight: "700" },
  progressHint: { color: "#9d95a9", fontSize: 12, marginTop: 3 },
  error: { color: "#ff9a9a", fontSize: 13, lineHeight: 19, marginTop: 10 },
  sectionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 20, marginBottom: 9 },
  sectionTitle: { color: "#f0eaf6", fontSize: 17, fontWeight: "800" },
  speakButton: { width: 38, height: 38, borderRadius: 13, backgroundColor: "#16213e", borderWidth: 1, borderColor: "#30365b", alignItems: "center", justifyContent: "center" },
  history: { backgroundColor: "#16213e", borderRadius: 18, borderWidth: 1, borderColor: "#30365b", overflow: "hidden" },
  message: { flexDirection: "row", padding: 13, borderBottomWidth: 1, borderBottomColor: "#27304e" },
  messageAvatar: { width: 34, height: 34, borderRadius: 12, alignItems: "center", justifyContent: "center", backgroundColor: "#27304e" },
  messageAvatarAssistant: { backgroundColor: "#7b2cbf" },
  messageAvatarText: { color: "#fff", fontSize: 13, fontWeight: "800" },
  messageBody: { flex: 1, marginLeft: 10 },
  messageRole: { color: "#a99bb7", fontSize: 11, fontWeight: "700", marginBottom: 3 },
  messageText: { color: "#e0e0e0", fontSize: 14, lineHeight: 20 },
  pressed: { opacity: 0.84, transform: [{ scale: 0.99 }] },
});
