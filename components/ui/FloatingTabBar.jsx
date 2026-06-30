import { LinearGradient } from "expo-linear-gradient";
import { usePathname, useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTabScroll } from "@/context/TabScrollContext";
import { getCachedLocation } from "@/services/locationCache";
import { checkScanEligibilityAPI } from "@/services/clientApi";
import { ActivityIndicator } from "react-native";

export const FLOATING_TAB_BAR_HEIGHT = 80;

const ICONS = {
  home: {
    active: require("@/assets/images/icons/home-active.png"),
    inactive: require("@/assets/images/icons/home-inactive.png"),
  },
  diet: {
    active: require("@/assets/images/icons/diet-active.png"),
    inactive: require("@/assets/images/icons/diet-inactive.png"),
  },
  workout: {
    // Features — shown as circular up-arrow, no label
    active: require("@/assets/images/icons/features.png"),
    inactive: require("@/assets/images/icons/features.png"),
  },
  gymmate: {
    active: require("@/assets/images/icons/workout-active.png"),
    inactive: require("@/assets/images/icons/workout-inactive.png"),
  },
};

const ACTIVE_COLOR = "#FF5757";
const INACTIVE_COLOR = "#979797";

// workout tab has no label — just the arrow icon
const TAB_LABELS = {
  home: "Home",
  diet: "Nutrition",
  workout: "",
  gymmate: "Gym Mate",
};

// Desired render order in the pill
const TAB_ORDER = ["home", "diet", "gymmate", "workout"];

const FEATURE_CARDS = [
  {
    id: "diet",
    title: "Track Your Diet",
    subtitle: "Monitor Your Diet Progress and Stay on Track",
    icon: require("@/assets/images/icons/diet-active.png"),
  },
  {
    id: "workout",
    title: "Crush Your Workout",
    subtitle: "Don't skip today. Your future self will thank you",
    icon: require("@/assets/images/weightbig.png"),
  },
  {
    id: "water",
    title: "Water Tracker",
    subtitle: "Most people are dehydrated. Track & fix yours now",
    icon: require("@/assets/images/watericon.png"),
  },
  {
    id: "steps",
    title: "Step Counter",
    subtitle: "See how you stack up. Track today & last week",
    icon: require("@/assets/images/steps.png"),
  },
  {
    id: "weight",
    title: "Weight Progress",
    subtitle: "Small changes add up. Don't lose track now",
    icon: require("@/assets/images/weighticon.png"),
  },
];

const HIDE_THRESHOLD = 30;
const PILL_HEIGHT = 50;
// Fixed width of the scan button — scaleX shrinks it visually without layout
const SCAN_FULL_WIDTH = 96;

const ANIM_CONFIG = {
  duration: 220,
  easing: Easing.out(Easing.cubic),
  useNativeDriver: true,
};

export default function FloatingTabBar({ state, navigation }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const [featuresVisible, setFeaturesVisible] = useState(false);
  const [eligibilityChecking, setEligibilityChecking] = useState(false);
  const [noCreditsVisible, setNoCreditsVisible] = useState(false);


  const scrollY = useTabScroll();
  const prevScrollY = useRef(0);
  // Track current target so we don't restart a running animation
  const hiddenTarget = useRef(0);

  // Single Animated.Value drives ALL transforms via interpolation — native driver only
  const anim = useRef(new Animated.Value(0)).current; // 0 = visible, 1 = hidden
  // Pulse animation for camera icon when collapsed
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const pulseLoopRef = useRef(null);

  // Reset tab bar to expanded state on tab change
  useEffect(() => {
    if (hiddenTarget.current === 1) {
      hiddenTarget.current = 0;

      Animated.timing(anim, { toValue: 0, ...ANIM_CONFIG }).start();
      if (pulseLoopRef.current) {
        pulseLoopRef.current.stop();
        pulseLoopRef.current = null;
      }
      pulseAnim.setValue(1);
    }
    prevScrollY.current = 0;
  }, [state.index]);

  useEffect(() => {
    if (!scrollY) return;

    const startPulse = () => {
      if (pulseLoopRef.current) return;
      pulseLoopRef.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.25,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 600,
            easing: Easing.inOut(Easing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      pulseLoopRef.current.start();
    };

    const stopPulse = () => {
      if (pulseLoopRef.current) {
        pulseLoopRef.current.stop();
        pulseLoopRef.current = null;
      }
      pulseAnim.setValue(1);
    };

    const animate = (toValue) => {
      if (hiddenTarget.current === toValue) return; // already going there
      hiddenTarget.current = toValue;

      Animated.timing(anim, { toValue, ...ANIM_CONFIG }).start(() => {
        if (toValue === 1) startPulse();
        else stopPulse();
      });
    };

    const listener = scrollY.addListener(({ value }) => {
      const diff = value - prevScrollY.current;
      prevScrollY.current = value;

      if (value < HIDE_THRESHOLD) {
        animate(0);
        return;
      }
      if (diff > 5) animate(1);
      else if (diff < -5) animate(0);
    });

    return () => {
      scrollY.removeListener(listener);
      stopPulse();
    };
  }, [scrollY, anim, pulseAnim]);


  if (pathname.includes("foodscanner")) return null;

  const navBottom = Platform.OS === "ios" ? insets.bottom : insets.bottom + 8;
  const modalBottomPadding = navBottom + PILL_HEIGHT + 16;

  // ── All interpolations use useNativeDriver: true ──

  // Pill slides down off screen
  const pillTranslateY = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, PILL_HEIGHT + navBottom + 20],
  });

  // Scan button: scaleX 1→(50/110), anchored to right edge via translateX
  const SCAN_COLLAPSED = 50;
  const scaleX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, SCAN_COLLAPSED / SCAN_FULL_WIDTH],
  });
  // Shift right to compensate for scaleX shrinking from center → pin to right edge
  const scanTranslateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, (SCAN_FULL_WIDTH - SCAN_COLLAPSED) / 2 + 30],
  });

  // Label fades out as bar collapses
  const labelOpacity = anim.interpolate({
    inputRange: [0, 0.3],
    outputRange: [1, 0],
    extrapolate: "clamp",
  });

  // Camera icon fades in as bar collapses
  const cameraOpacity = anim.interpolate({
    inputRange: [0.7, 1],
    outputRange: [0, 1],
    extrapolate: "clamp",
  });

  // Counter-scale camera to undo the wrapper's scaleX shrink
  const cameraCounterScale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, SCAN_FULL_WIDTH / SCAN_COLLAPSED],
  });

  // Whole bar fades slightly when hidden (optional polish)
  const barOpacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 0.92],
  });

  const handleScanFood = async () => {
    setEligibilityChecking(true);
    try {
      const coords = await getCachedLocation();
      const res = await checkScanEligibilityAPI({
        lat: coords?.lat ?? null,
        lng: coords?.lng ?? null,
      });
      if (res?.eligibility === false) {
        setNoCreditsVisible(true);
        return;
      }
      router.push({
        pathname: "/client/(diet)/foodscanner",
        params: {
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
          nearby_sessions: JSON.stringify(res?.nearby_sessions ?? []),
          nutrition_purchased: res?.nutrition_purchased || false,
        },
      });
    } finally {
      setEligibilityChecking(false);
    }
  };
  const openFeaturesModal = () => setFeaturesVisible(true);
  const closeFeaturesModal = () => setFeaturesVisible(false);

  const handleFeaturePress = (featureId) => {
    setFeaturesVisible(false);
    if (featureId === "diet") router.push("/client/diettracker");
    else if (featureId === "workout") router.push("/client/workouttracker");
    else if (featureId === "water") router.push("/client/watertracker");
    else if (featureId === "steps") router.push("/client/stepDetails");
    else if (featureId === "weight") router.push("/client/viewjourney");
  };

  return (
    <View style={styles.host} pointerEvents="box-none">
      <Animated.View
        style={[
          styles.outerContainer,
          { bottom: navBottom, opacity: barOpacity },
        ]}
        pointerEvents="box-none"
      >
        {/* Tab pill — slides down */}
        <Animated.View
          style={[styles.pill, { transform: [{ translateY: pillTranslateY }] }]}
          pointerEvents="box-none"
        >
          {TAB_ORDER.map((tabName) => {
            const route = state.routes.find((r) => r.name === tabName);
            if (!route) return null;
            const icons = ICONS[route.name];
            if (!icons) return null;

            const isFocused = state.routes[state.index]?.name === route.name;
            const label = TAB_LABELS[route.name] ?? route.name;
            const isFeatures = route.name === "workout";

            const onPress = () => {
              if (isFeatures) {
                openFeaturesModal();
                return;
              }
              const event = navigation.emit({
                type: "tabPress",
                target: route.key,
                canPreventDefault: true,
              });
              if (!event.defaultPrevented) {
                if (route.name === "diet") {
                  navigation.navigate(route.name, { forceChoose: "false" });
                } else if (!isFocused) {
                  navigation.navigate(route.name);
                }
              }
            };

            if (isFeatures) {
              return (
                <TouchableOpacity
                  key={route.key}
                  onPress={onPress}
                  activeOpacity={0.75}
                  style={styles.tabItemArrow}
                  accessibilityRole="button"
                  accessibilityLabel="Features"
                >
                  <Image
                    source={icons.active}
                    style={styles.arrowIcon}
                    resizeMode="contain"
                  />
                </TouchableOpacity>
              );
            }

            return (
              <TouchableOpacity
                key={route.key}
                onPress={onPress}
                activeOpacity={0.75}
                style={styles.tabItem}
                accessibilityRole="button"
                accessibilityState={isFocused ? { selected: true } : {}}
                accessibilityLabel={label}
              >
                <Image
                  source={isFocused ? icons.active : icons.inactive}
                  style={styles.icon}
                  resizeMode="contain"
                />
                <Text
                  style={[
                    styles.label,
                    { color: isFocused ? ACTIVE_COLOR : INACTIVE_COLOR },
                  ]}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </Animated.View>

        {/* Scan Food — collapses to camera icon on scroll up */}
        <TouchableOpacity
          onPress={handleScanFood}
          activeOpacity={0.85}
          accessibilityRole="button"
          accessibilityLabel="Scan Food"
          disabled={eligibilityChecking}
        >
          <Animated.View
            style={[
              styles.scanWrapper,
              { transform: [{ scaleX }, { translateX: scanTranslateX }] },
            ]}
          >
            <LinearGradient
              colors={["#6A92DF", "#4365A7"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.scanGradient}
            >
              {eligibilityChecking ? (
                <ActivityIndicator size="small" color="#FFFFFF" />
              ) : (
                <>
                  <Animated.Text
                    style={[styles.scanLabel, { opacity: labelOpacity }]}
                    numberOfLines={1}
                  >
                    AI Meal Scan
                  </Animated.Text>
                  <Animated.Image
                    source={require("@/assets/images/diet/camera.png")}
                    style={[
                      styles.cameraIcon,
                      {
                        opacity: cameraOpacity,
                        transform: [
                          { scaleX: cameraCounterScale },
                          { scale: pulseAnim },
                        ],
                      },
                    ]}
                    resizeMode="contain"
                  />
                </>
              )}
            </LinearGradient>
          </Animated.View>
        </TouchableOpacity>
      </Animated.View>

      {/* No Credits Modal */}
      <Modal
        visible={noCreditsVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setNoCreditsVisible(false)}
        statusBarTranslucent
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => setNoCreditsVisible(false)}
        >
          <Pressable style={styles.noCreditsSheet}>
            <Text style={styles.noCreditsTitle}>Not Enough Credits</Text>
            <Text style={styles.noCreditsSubtitle}>
              You don't have enough AI credits to scan food.
            </Text>

            <TouchableOpacity
              style={styles.noCreditsBtn}
              activeOpacity={0.85}
              onPress={() => {
                setNoCreditsVisible(false);
                router.push("/client/credits");
              }}
            >
              <LinearGradient
                colors={["#6A92DF", "#4365A7"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.noCreditsBtnGradient}
              >
                <Text style={styles.noCreditsBtnText}>Purchase Credits</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.noCreditsDismiss}
              onPress={() => setNoCreditsVisible(false)}
            >
              <Text style={styles.noCreditsDismissText}>Dismiss</Text>
            </TouchableOpacity>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Features Modal */}
      <Modal
        visible={featuresVisible}
        transparent
        animationType="none"
        onRequestClose={closeFeaturesModal}
        statusBarTranslucent
      >
        <Pressable style={styles.modalBackdrop} onPress={closeFeaturesModal}>
          <View
            style={[styles.modalSheet, { paddingBottom: modalBottomPadding }]}
          >
            <View style={styles.dragHandle} />
            <Text style={styles.sheetTitle}>Features</Text>
            {FEATURE_CARDS.map((card) => (
              <TouchableOpacity
                key={card.id}
                style={styles.featureCard}
                activeOpacity={0.7}
                onPress={() => handleFeaturePress(card.id)}
              >
                <View style={styles.featureIconWrapper}>
                  <Image
                    source={card.icon}
                    style={styles.featureIcon}
                    resizeMode="contain"
                  />
                </View>
                <View style={styles.featureText}>
                  <Text style={styles.featureTitle}>{card.title}</Text>
                  <Text style={styles.featureSubtitle} numberOfLines={2}>
                    {card.subtitle}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  host: {
    height: 0,
    overflow: "visible",
  },
  outerContainer: {
    position: "absolute",
    left: 10,
    right: 0,
    flexDirection: "row",
    alignItems: "center",
  },
  pill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    height: PILL_HEIGHT,
    paddingHorizontal: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 8,
    borderWidth: 0.5,
    borderColor: "#ddd",
  },
  tabItem: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  // Features tab — narrower, just the arrow icon, no label
  tabItemArrow: {
    width: 48,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 6,
  },
  arrowIcon: {
    width: 16,
    height: 16,
  },
  icon: {
    width: 22,
    height: 22,
    marginBottom: 3,
  },
  label: {
    fontSize: 11,
    fontWeight: "500",
    textAlign: "center",
  },
  scanWrapper: {
    width: SCAN_FULL_WIDTH,
    overflow: "hidden",
    borderTopLeftRadius: 18,
    borderBottomLeftRadius: 18,

    shadowColor: "#4365A7",
    shadowOffset: { width: -2, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
    marginLeft: 8,
  },
  scanGradient: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 6,
    height: PILL_HEIGHT,
  },
  cameraIcon: {
    position: "absolute",
    width: 22,
    height: 22,
    tintColor: "#FFFFFF",
  },
  scanLabel: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "700",
    width: "100%",
    textAlign: "center",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingTop: 12,
    paddingHorizontal: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 20,
  },
  dragHandle: {
    width: 40,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    alignSelf: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
  },
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F9F9F9",
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
    borderWidth: 0.5,
    borderColor: "#EFEFEF",
    paddingHorizontal: 6,
  },
  featureIconWrapper: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  featureIcon: {
    width: 30,
    height: 30,
  },
  featureText: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 3,
  },
  featureSubtitle: {
    fontSize: 12,
    color: "#888",
    lineHeight: 17,
  },
  noCreditsSheet: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    marginHorizontal: 24,
    padding: 28,
    alignItems: "center",
  },
  noCreditsTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 10,
    textAlign: "center",
  },
  noCreditsSubtitle: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 20,
  },
  noCreditsBtn: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 10,
  },
  noCreditsBtnGradient: {
    paddingVertical: 14,
    alignItems: "center",
  },
  noCreditsBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  noCreditsDismiss: {
    paddingVertical: 10,
  },
  noCreditsDismissText: {
    fontSize: 14,
    color: "#888",
  },
});
