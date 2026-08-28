import { useRouter } from "expo-router";
import { useEffect, useRef } from "react";
import { Animated, Easing, Image, Pressable, StyleSheet, View, useColorScheme } from "react-native";
import { Mic } from "lucide-react-native";
import { shapeForViseme } from "./viseme-timeline";
import { SVETLANA_DESIGN, SvetlanaOrbState } from "./svetlana-design";

const ORB: Record<SvetlanaOrbState, string> = {
  idle: "#8b5cf6",
  listening: "#38bdf8",
  thinking: "#f59e0b",
  speaking: "#8b5cf6",
  warning: "#ef4444",
  joy: "#fbbf24",
};

export function SvetlanaAvatar({
  compact = false,
  speaking = false,
  visemeId,
  state,
}: {
  compact?: boolean;
  speaking?: boolean;
  visemeId?: number | null;
  state?: SvetlanaOrbState;
}) {
  const router = useRouter();
  const scheme = useColorScheme();
  const size = compact ? SVETLANA_DESIGN.compactSize : SVETLANA_DESIGN.fullSize;
  const resolvedState: SvetlanaOrbState = state ?? (speaking ? "speaking" : "idle");
  const orbPulse = useRef(new Animated.Value(1)).current;
  const mouthScale = useRef(new Animated.Value(0.35)).current;
  const mouthWidth = useRef(new Animated.Value(13)).current;
  const mouthScaleX = useRef(new Animated.Value(1)).current;
  const mouthRadius = useRef(new Animated.Value(8)).current;

  useEffect(() => {
    const duration = resolvedState === "warning" ? 420 : resolvedState === "listening" ? 900 : 1500;
    const animation = Animated.loop(Animated.sequence([
      Animated.timing(orbPulse, { toValue: resolvedState === "idle" ? 1.02 : 1.09, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      Animated.timing(orbPulse, { toValue: 1, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
    ]));
    animation.start();
    return () => animation.stop();
  }, [orbPulse, resolvedState]);

  useEffect(() => {
    if (visemeId == null) {
      if (!speaking) {
        Animated.timing(mouthScale, { toValue: 0.35, duration: 120, useNativeDriver: true }).start();
        return;
      }
      const animation = Animated.loop(Animated.sequence([
        Animated.timing(mouthScale, { toValue: 1, duration: 110, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(mouthScale, { toValue: 0.45, duration: 90, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(mouthScale, { toValue: 0.8, duration: 105, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(mouthScale, { toValue: 0.35, duration: 120, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]));
      animation.start();
      return () => animation.stop();
    }

    const shape = shapeForViseme(visemeId);
    Animated.parallel([
      Animated.timing(mouthWidth, { toValue: shape.width, duration: 45, useNativeDriver: false }),
      Animated.timing(mouthScaleX, { toValue: shape.scaleX, duration: 45, useNativeDriver: false }),
      Animated.timing(mouthRadius, { toValue: shape.radius, duration: 45, useNativeDriver: false }),
      Animated.timing(mouthScale, { toValue: shape.scaleY, duration: 45, useNativeDriver: true }),
    ]).start();
  }, [mouthScale, mouthWidth, mouthScaleX, mouthRadius, speaking, visemeId]);

  const orb = ORB[resolvedState];
  const background = scheme === "dark" ? "#17111f" : "#faf8f5";

  return (
    <Pressable
      accessibilityLabel="Открыть голосовой чат Светланы"
      onPress={() => router.push("/svetlana")}
      style={({ pressed }) => [styles.button, { width: size, height: size }, pressed && styles.pressed]}
    >
      <Animated.View pointerEvents="none" style={[styles.orb, { width: size, height: size, borderColor: orb, shadowColor: orb, transform: [{ scale: orbPulse }] }]} />
      <View style={[styles.faceFrame, { width: size - 8, height: size - 8, backgroundColor: background }]}>
        <Image
          source={require("../../../assets/images/svetlana-approved.jpg")}
          accessibilityLabel="Утверждённый портрет Светланы"
          resizeMode="cover"
          style={[styles.portrait, { width: size - 12, height: size - 12 }]}
        />
        <Animated.View
          nativeID={SVETLANA_DESIGN.mouthLayerId}
          pointerEvents="none"
          style={[styles.mouth, {
            width: mouthWidth,
            borderRadius: mouthRadius,
            transform: [{ scaleX: mouthScaleX }, { scaleY: mouthScale }],
            opacity: visemeId == null ? (speaking ? 0.18 : 0) : 0.28,
          }]}
        />
      </View>
      <View style={[styles.micBadge, { backgroundColor: orb, borderColor: background }]}>
        <Mic color="#ffffff" size={compact ? 13 : 16} strokeWidth={2.5} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: { alignItems: "center", justifyContent: "center", borderRadius: 999 },
  orb: { position: "absolute", borderWidth: 2, borderRadius: 999, shadowOpacity: 0.38, shadowRadius: 16, elevation: 8 },
  faceFrame: { alignItems: "center", justifyContent: "center", borderRadius: 999, overflow: "hidden" },
  portrait: { borderRadius: 999 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
  mouth: { position: "absolute", left: "50%", top: "51%", height: 5, backgroundColor: "#8f4f5d", marginLeft: -6.5, marginTop: -2.5 },
  micBadge: { position: "absolute", right: 0, bottom: 0, width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 2 },
});
