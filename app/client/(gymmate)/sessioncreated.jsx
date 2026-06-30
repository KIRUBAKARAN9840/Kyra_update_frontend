import { useEffect } from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  Easing,
  interpolate,
} from "react-native-reanimated";
import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

function RippleRing({ delay, maxSize }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 2400, easing: Easing.out(Easing.cubic) }),
        -1,
        false,
      ),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => {
    const size = interpolate(progress.value, [0, 1], [0, maxSize]);
    const opacity = interpolate(progress.value, [0, 0.12, 1], [0, 0.55, 0]);
    return {
      width: size,
      height: size,
      borderRadius: size / 2,
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          borderWidth: 1.5,
          borderColor: "#FFFFFF",
        },
        animStyle,
      ]}
    />
  );
}

export default function SessionCreated() {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const iconScale = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const contentY = useSharedValue(20);

  useEffect(() => {
    iconScale.value = withDelay(
      300,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.back(2)) }),
    );
    contentOpacity.value = withDelay(
      600,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) }),
    );
    contentY.value = withDelay(
      600,
      withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) }),
    );
  }, []);

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const contentAnimStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentY.value }],
  }));

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 20 }]}>
      {/* Ripple rings centered on screen */}
      <View style={styles.ringsContainer} pointerEvents="none">
        <RippleRing delay={0} maxSize={380} />
        <RippleRing delay={800} maxSize={380} />
        <RippleRing delay={1600} maxSize={380} />
      </View>

      {/* Center content */}
      <View style={styles.centerContent}>
        <Animated.View style={[styles.iconCircle, iconAnimStyle]}>
          <Ionicons name="location-sharp" size={40} color="#FFF" />
        </Animated.View>

        <Animated.View style={[styles.textBlock, contentAnimStyle]}>
          <Text style={styles.title}>Session Created !</Text>
          <Text style={styles.subtitle}>
            Your session is live. We're scanning for Gym Mates near you - you'll
            be notified when someone matches!
          </Text>
        </Animated.View>
      </View>

      {/* Button */}
      <Animated.View style={[styles.btnWrapper, contentAnimStyle]}>
        <TouchableOpacity
          style={styles.btn}
          activeOpacity={0.85}
          onPress={() => router.replace("/client/(tabs)/gymmate")}
        >
          <Text style={styles.btnText}>Go to Gym Mate</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101828",
    justifyContent: "center",
    alignItems: "center",
  },
  ringsContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  centerContent: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  textBlock: {
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 14,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
    lineHeight: 23,
  },
  btnWrapper: {
    position: "absolute",
    bottom: 48,
    left: 32,
    right: 32,
  },
  btn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnText: {
    color: "#101828",
    fontSize: 16,
    fontWeight: "700",
  },
});
