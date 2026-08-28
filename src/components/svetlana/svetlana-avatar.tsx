import { Mic } from "lucide-react-native";
import { useRouter } from "expo-router";
import { Pressable, StyleSheet, View, Animated, Easing } from "react-native";
import { useEffect, useRef } from "react";
import Svg, { Circle, Defs, LinearGradient, Path, Stop } from "react-native-svg";

export function SvetlanaAvatar({ compact = false, speaking = false }: { compact?: boolean; speaking?: boolean }) {
  const router = useRouter();
  const size = compact ? 54 : 76;
  const mouthScale = useRef(new Animated.Value(0.35)).current;

  useEffect(() => {
    if (!speaking) {
      Animated.timing(mouthScale, {
        toValue: 0.35,
        duration: 120,
        useNativeDriver: true,
      }).start();
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
  }, [mouthScale, speaking]);

  return (
    <Pressable
      accessibilityLabel="Открыть голосовой чат Светланы"
      onPress={() => router.push("/svetlana")}
      style={({ pressed }) => [styles.button, { width: size, height: size }, pressed && styles.pressed]}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          <LinearGradient id="hair" x1="0" y1="0" x2="1" y2="1">
            <Stop offset="0" stopColor="#a855f7" />
            <Stop offset="1" stopColor="#5b21b6" />
          </LinearGradient>
          <LinearGradient id="skin" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor="#ffe2cf" />
            <Stop offset="1" stopColor="#e9ad91" />
          </LinearGradient>
        </Defs>
        <Circle cx="50" cy="50" r="48" fill="#17111f" stroke="#8b5cf6" strokeWidth="2" />
        <Path d="M20 48c0-24 13-38 30-38s30 14 30 38v18H20z" fill="url(#hair)" />
        <Path d="M28 44c0-13 9-23 22-23s22 10 22 23v22c0 14-10 24-22 24S28 80 28 66z" fill="url(#skin)" />
        <Path d="M28 45c3-17 11-24 23-24 12 0 19 7 21 21-9-4-18-9-25-17-5 8-11 15-19 20z" fill="url(#hair)" />
        <Circle cx="43" cy="54" r="3" fill="#24152f" />
        <Circle cx="59" cy="54" r="3" fill="#24152f" />
        <Path d="M45 69c4 4 9 4 13 0" fill="none" stroke="#9f4f65" strokeWidth="2" strokeLinecap="round" />
        <Path d="M25 46c-4 3-5 10-2 14" fill="none" stroke="#8b5cf6" strokeWidth="5" strokeLinecap="round" />
        <Path d="M75 46c4 3 5 10 2 14" fill="none" stroke="#8b5cf6" strokeWidth="5" strokeLinecap="round" />
      </Svg>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.mouth,
          { transform: [{ scaleY: mouthScale }], opacity: speaking ? 1 : 0.75 },
        ]}
      />
      <View style={styles.micBadge}>
        <Mic color="#ffffff" size={compact ? 13 : 16} strokeWidth={2.5} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 999,
    backgroundColor: "#0d0b12",
    shadowColor: "#8b5cf6",
    shadowOpacity: 0.35,
    shadowRadius: 12,
    elevation: 8,
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.96 }] },
  mouth: {
    position: "absolute",
    width: 13,
    height: 5,
    left: "50%",
    top: "69%",
    marginLeft: -6.5,
    marginTop: -2.5,
    borderRadius: 8,
    backgroundColor: "#9f4f65",
  },
  micBadge: {
    position: "absolute",
    right: 0,
    bottom: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "#7c3aed",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#0d0b12",
  },
});
