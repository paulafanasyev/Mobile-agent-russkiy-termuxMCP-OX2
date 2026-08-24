import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, Stack } from "expo-router";

import { t } from "@/i18n";

export default function SvetlanaScreen() {
  const [voiceOpen, setVoiceOpen] = useState(false);

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ title: t("svetlana.title") }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.statusCard}>
          <View style={styles.dot} />
          <Text style={styles.statusText}>{t("svetlana.online")}</Text>
        </View>

        <Pressable
          style={({ pressed }) => [styles.activate, pressed && styles.pressed]}
          onPress={() => setVoiceOpen((v) => !v)}
        >
          <Text style={styles.activateText}>{t("svetlana.activate")}</Text>
        </Pressable>

        {voiceOpen && (
          <View style={styles.voiceCard}>
            <Text style={styles.voiceTitle}>{t("svetlana.voiceCommand")}</Text>
            <Text style={styles.voiceHint}>{t("svetlana.voiceP2Hint")}</Text>
          </View>
        )}

        <Link href="/chat" asChild>
          <Pressable style={({ pressed }) => [styles.secondary, pressed && styles.pressed]}>
            <Text style={styles.secondaryText}>{t("nav.openChat")}</Text>
          </Pressable>
        </Link>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0f1115" },
  content: { padding: 20, gap: 16 },
  statusCard: {
    flexDirection: "row", alignItems: "center", gap: 10,
    backgroundColor: "#171a21", borderRadius: 14, padding: 18,
  },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: "#31c463" },
  statusText: { color: "#e8eaed", fontSize: 18, fontWeight: "600" },
  activate: {
    backgroundColor: "#2b6cb0", borderRadius: 14, paddingVertical: 18,
    alignItems: "center",
  },
  pressed: { opacity: 0.75 },
  activateText: { color: "#ffffff", fontSize: 17, fontWeight: "700" },
  voiceCard: {
    backgroundColor: "#171a21", borderRadius: 14, padding: 18, gap: 8,
  },
  voiceTitle: { color: "#e8eaed", fontSize: 16, fontWeight: "600" },
  voiceHint: { color: "#9aa0a6", fontSize: 14, lineHeight: 20 },
  secondary: {
    backgroundColor: "#1d2129", borderRadius: 14, paddingVertical: 14,
    alignItems: "center",
  },
  secondaryText: { color: "#cfd3d8", fontSize: 15 },
});
