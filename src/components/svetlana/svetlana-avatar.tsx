import { Mic } from "lucide-react-native";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View, Animated, Easing, useColorScheme } from "react-native";
import { useEffect, useRef } from "react";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";
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
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(orbPulse, { toValue: resolvedState === "idle" ? 1.02 : 1.09, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(orbPulse, { toValue: 1, duration, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ]),
    );
    animation.start();
    return () => animation.stop();
  }, [orbPulse, resolvedState]);

  useEffect(() => {
    if (visemeId == null) {
      if (!speaking) {
        Animated.timing(mouthScale, { toValue: 0.35, duration: 120, useNativeDriver: true }).start();
        return;
      }
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(mouthScale, { toValue: 1, duration: 110, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(mouthScale, { toValue: 0.45, duration: 90, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(mouthScale, { toValue: 0.8, duration: 105, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
          Animated.timing(mouthScale, { toValue: 0.35, duration: 120, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        ]),
      );
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

  const background = scheme === "dark" ? "#17111f" : "#faf8f5";
  const border = scheme === "dark" ? "#31223f" : "#e8e3dc";
  const orb = ORB[resolvedState];

  return (
    <Pressable
      accessibilityLabel="Открыть голосовой чат Светланы"
      onPress={() => router.push("/svetlana")}
      style={({ pressed }) => [styles.button, { width: size, height: size }, pressed && styles.pressed]}
    >
      <Animated.View
        pointerEvents="none"
        style={[styles.orb, { width: size, height: size, borderColor: orb, shadowColor: orb, transform: [{ scale: orbPulse }] }]}
      />
      <View style={[styles.faceFrame, { width: size - 8, height: size - 8, backgroundColor: background, borderColor: border }]}>
        <Svg width={size - 12} height={size - 12} viewBox="0 0 100 100">
          <Defs>
            <LinearGradient id="hair" x1="0" y1="0" x2="1" y2="1">
              <Stop offset="0" stopColor="#3b2630" />
              <Stop offset="0.55" stopColor="#17131a" />
              <Stop offset="1" stopColor="#5b3545" />
            </LinearGradient>
            <LinearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
              <Stop offset="0" stopColor="#ffe4d3" />
              <Stop offset="1" stopColor="#d99a7e" />
            </LinearGradient>
          </Defs>
          <Path d="M18 51c0-29 13-43 32-43s32 14 32 43v29H18z" fill="url(#hair)" />
          <Path d="M27 43c0-14 9-23 23-23s23 9 23 23v25c0 14-10 23-23 23S27 82 27 68z" fill="url(#skin)" />
          <Path d="M27 45c3-17 11-26 24-26 13 0 21 9 23 23-8-3-18-9-26-18-5 9-12 16-21 21z" fill="url(#hair)" />
          <Circle cx="43" cy="54" r="3.2" fill="#5b382d" />
          <Circle cx="59" cy="54" r="3.2" fill="#5b382d" />
          <Circle cx="44" cy="53" r="0.9" fill="#ffffff" />
          <Circle cx="60" cy="53" r="0.9" fill="#ffffff" />
          <Path d="M38 49c3-2 7-2 10 0M54 49c3-2 7-2 10 0" fill="none" stroke="#4a2930" strokeWidth="1.5" strokeLinecap="round" />
          <Path d="M49 58c-1 4-1 6 2 7" fill="none" stroke="#c07e6e" strokeWidth="1.4" strokeLinecap="round" />
          <Path d="M42 70c5 3 11 3 16 0" fill="none" stroke="#9f4f65" strokeWidth="2" strokeLinecap="round" />
          <Path d="M24 51c-4 4-4 10-1 15M76 51c4 4 4 10 1 15" fill="none" stroke="#6d4557" strokeWidth="3" strokeLinecap="round" />
        </Svg>
        <Animated.View
          nativeID={SVETLANA_DESIGN.mouthLayerId}
          pointerEvents="none"
          style={[styles.mouth, {
            width: mouthWidth,
            borderRadius: mouthRadius,
            transform: [{ scaleX: mouthScaleX }, { scaleY: mouthScale }],
            opacity: speaking ? 1 : 0.75,
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
  faceFrame: { alignItems: "center", justifyContent: "center", borderRadius: 999, borderWidth: 1 },
  pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
  mouth: { position: "absolute", left: "50%", top: "69%", height: 5, backgroundColor: "#9f4f65", marginLeft: -6.5, marginTop: -2.5 },
  micBadge: { position: "absolute", right: 0, bottom: 0, width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center", borderWidth: 2 },
});
