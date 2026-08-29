import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Easing, Pressable, StyleSheet, View, useColorScheme } from "react-native";
import { shapeForViseme, type VisemeShape } from "./viseme-timeline";
import { SVETLANA_DESIGN, SvetlanaOrbState } from "./svetlana-design";
import { useSvetlanaVisemes } from "./use-svetlana-visemes";

const ORB: Record<SvetlanaOrbState, string> = {
  idle: "#8b5cf6",
  listening: "#38bdf8",
  thinking: "#f59e0b",
  speaking: "#8b5cf6",
  error: "#ef4444",
};

export function SvetlanaAvatar({ compact = false, speaking = false, visemeId, state }: { compact?: boolean; speaking?: boolean; visemeId?: number | null; state?: SvetlanaOrbState }) {
  const router = useRouter();
  const scheme = useColorScheme();
  const timelineShape = useSvetlanaVisemes(speaking);
  const explicitShape: VisemeShape | null = visemeId == null ? null : shapeForViseme(visemeId);
  const mouthShape: VisemeShape | null = explicitShape ?? timelineShape;
  const size = compact ? SVETLANA_DESIGN.compactSize : SVETLANA_DESIGN.fullSize;
  const resolvedState: SvetlanaOrbState = state ?? (speaking ? "speaking" : "idle");
  const orbPulse = useRef(new Animated.Value(1)).current;
  const mouthScale = useRef(new Animated.Value(0.35)).current;
  const mouthScaleX = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    const duration = resolvedState === "error" ? 420 : resolvedState === "listening" ? 900 : resolvedState === "speaking" ? 520 : 1500;
    const peak = resolvedState === "speaking" ? 1.12 : resolvedState === "idle" ? 1.02 : 1.09;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(orbPulse, { toValue: peak, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(orbPulse, { toValue: 1, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [orbPulse, resolvedState]);

  useEffect(() => {
    const targetScaleX = mouthShape ? Math.max(0.35, (mouthShape.width / 13) * mouthShape.scaleX) : 1;
    const targetScaleY = mouthShape ? Math.max(0.15, mouthShape.scaleY) : speaking ? 0.7 : 0.35;
    Animated.parallel([
      Animated.timing(mouthScaleX, { toValue: targetScaleX, duration: 45, useNativeDriver: true }),
      Animated.timing(mouthScale, { toValue: targetScaleY, duration: 45, useNativeDriver: true }),
    ]).start();
  }, [mouthShape, mouthScale, mouthScaleX, speaking]);

  const orb = ORB[resolvedState];
  const background = scheme === "dark" ? "#0d0a14" : "#faf8f5";
  const border = scheme === "dark" ? "#31223f" : "#e8e3dc";
  const isListening = resolvedState === "listening";
  const isSpeaking = resolvedState === "speaking" || speaking;

  return (
    <Pressable accessibilityLabel="Открыть голосовой чат Светланы" onPress={() => router.push("/svetlana")} style={({ pressed }) => [styles.button, { width: size, height: size }, pressed && styles.pressed]}>
      <Animated.View pointerEvents="none" style={[styles.orb, { width: size, height: size, borderColor: orb, shadowColor: orb, transform: [{ scale: orbPulse }] }]} />
      <View style={[styles.core, { width: size - 12, height: size - 12, backgroundColor: background, borderColor: border }]}>
        <View pointerEvents="none" style={[styles.glow, { width: size * 0.62, height: size * 0.62, backgroundColor: orb, opacity: isSpeaking ? 0.24 : 0.12 }]} />
        <Animated.View nativeID={SVETLANA_DESIGN.mouthLayerId} pointerEvents="none" accessibilityLabel={mouthShape ? "Висема Светланы" : "Голос Светланы"} style={[styles.mouth, { transform: [{ scaleX: mouthScaleX }, { scaleY: mouthScale }], backgroundColor: orb, opacity: isSpeaking ? 0.95 : 0.35 }]} />
        <View pointerEvents="none" style={[styles.micIndicator, { opacity: isListening ? 1 : 0.7, backgroundColor: isListening ? "#38bdf8" : border }]} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: "center", justifyContent: "center", borderRadius: 999 },
  orb: { position: "absolute", borderWidth: 2, borderRadius: 999, shadowOpacity: 0.48, shadowRadius: 18, elevation: 10 },
  core: { alignItems: "center", justifyContent: "center", borderRadius: 999, overflow: "hidden", borderWidth: 1 },
  glow: { position: "absolute", borderRadius: 999 },
  mouth: { width: 18, height: 6, borderRadius: 99 },
  micIndicator: { position: "absolute", right: 7, bottom: 7, width: 10, height: 10, borderRadius: 5, borderWidth: 2, borderColor: "#faf8f5" },
  pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
});
