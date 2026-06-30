import React, { useState, useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  Dimensions,
  Image,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  StatusBar,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import {
  GestureDetector,
  Gesture,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  interpolate,
  runOnJS,
  Extrapolation,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import {
  getNearbySessionsAPI,
  sendSessionRequestAPI,
} from "../../../services/clientApi";
import { getCachedLocation } from "../../../services/locationCache";
import { showToast } from "../../../utils/Toaster";

const { width, height } = Dimensions.get("window");

const SWIPE_THRESHOLD = width * 0.3;
const CARD_W = width - 32;
const CARD_H = height * 0.62;
const ROTATE_FACTOR = 12;

const DEFAULT_IMG = require("../../../assets/images/gym_mate/mate1.webp");

const formatSessionDateTime = (dateStr, timeStr) => {
  try {
    const dt = new Date(`${dateStr}T${timeStr}`);
    const day = dt.getDate();
    const month = dt.toLocaleString("en-US", { month: "short" });
    const hours = dt.getHours();
    const mins = dt.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    const h = hours % 12 || 12;
    const mm = mins.toString().padStart(2, "0");
    return `${h}:${mm} ${ampm} | ${day} ${month}`;
  } catch {
    return "";
  }
};

// ─── Single Card ──────────────────────────────────────────────────────────────

const MateCard = ({ mate }) => {
  const vibesDisplay = (mate.workout_vibes || []).slice(0, 2);
  const extraVibes = (mate.workout_vibes || []).length - 2;

  return (
    <View style={styles.card}>
      <Image
        source={
          mate.host_avatar_url ? { uri: mate.host_avatar_url } : DEFAULT_IMG
        }
        style={styles.cardImage}
        resizeMode="cover"
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.85)"]}
        style={styles.cardGradient}
      />
      {mate.dailypass_booked && (
        <View style={styles.dailyPassBadge}>
          <Text style={styles.dailyPassText}>Daily Pass</Text>
        </View>
      )}
      <View style={styles.cardInfo}>
        <View style={styles.cardNameRow}>
          <Text style={styles.cardName}>{mate.host_name}</Text>
          {mate.distance_km != null && (
            <View style={styles.cardDistBadge}>
              <Ionicons name="location" size={11} color="#FF5757" />
              <Text style={styles.cardDistText}>{mate.distance_km} km</Text>
            </View>
          )}
        </View>
        <View style={styles.cardGymRow}>
          <Ionicons
            name="barbell-outline"
            size={13}
            color="rgba(255,255,255,0.8)"
          />
          <Text style={styles.cardGymText}>
            {mate.gym_name}
            {mate.gym_area ? ` • ${mate.gym_area}` : ""}
          </Text>
        </View>
        <View style={styles.cardTimeRow}>
          <Ionicons
            name="time-outline"
            size={13}
            color="rgba(255,255,255,0.8)"
          />
          <Text style={styles.cardTimeText}>
            {formatSessionDateTime(mate.session_date, mate.session_time)}
          </Text>
        </View>
        {mate.host_bio ? (
          <Text style={styles.cardBio} numberOfLines={2}>
            {mate.host_bio}
          </Text>
        ) : null}
        <View style={styles.cardTags}>
          {mate.mate_preference && (
            <View style={styles.cardTag}>
              <Ionicons name="person" size={11} color="#A78BFA" />
              <Text style={styles.cardTagText}>{mate.mate_preference}</Text>
            </View>
          )}
          {mate.fitness_level && (
            <View style={styles.cardTag}>
              <Ionicons name="barbell" size={11} color="#00C950" />
              <Text style={styles.cardTagText}>{mate.fitness_level}</Text>
            </View>
          )}
          {vibesDisplay.map((v) => (
            <View key={v} style={styles.cardTag}>
              <Ionicons name="flash" size={11} color="#FFD700" />
              <Text style={styles.cardTagText}>{v}</Text>
            </View>
          ))}
          {extraVibes > 0 && (
            <View style={styles.cardTag}>
              <Text style={styles.cardTagText}>+{extraVibes}</Text>
            </View>
          )}
        </View>
      </View>
    </View>
  );
};

// ─── Connected Overlay ────────────────────────────────────────────────────────

const ConnectedOverlay = ({ style }) => (
  <Animated.View
    style={[StyleSheet.absoluteFill, styles.connectedOverlay, style]}
    pointerEvents="none"
  >
    <View style={styles.connectedBadgeCard}>
      <Image
        source={require("../../../assets/images/gym_mate/icon_connect.png")}
        style={{ width: 36, height: 36 }}
      />
      <Text style={styles.connectedText}>CONNECT!</Text>
    </View>
  </Animated.View>
);

// ─── Pass Overlay ─────────────────────────────────────────────────────────────

const PassOverlay = ({ style }) => (
  <Animated.View
    style={[StyleSheet.absoluteFill, styles.passOverlay, style]}
    pointerEvents="none"
  >
    <View style={styles.passBadgeCard}>
      <Ionicons name="close-circle" size={36} color="#FF3B5C" />
      <Text style={styles.passText}>PASS</Text>
    </View>
  </Animated.View>
);

// ─── Top Card with gesture + overlays ─────────────────────────────────────────

function SwipeCardTop({
  mate,
  onSwipeRight,
  onSwipeLeft,
  translateX,
  translateY,
  connectOpacity,
  passOpacity,
}) {
  const handleRight = useCallback(
    () => onSwipeRight(mate.session_id),
    [mate.session_id, onSwipeRight],
  );
  const handleLeft = useCallback(
    () => onSwipeLeft(mate.session_id),
    [mate.session_id, onSwipeLeft],
  );

  const pan = Gesture.Pan()
    .activeOffsetX([-8, 8])
    .failOffsetY([-20, 20])
    .onUpdate((e) => {
      translateX.value = e.translationX;
      translateY.value = e.translationY * 0.12;
      connectOpacity.value = Math.min(
        1,
        Math.max(0, e.translationX / (SWIPE_THRESHOLD * 0.7)),
      );
      passOpacity.value = Math.min(
        1,
        Math.max(0, -e.translationX / (SWIPE_THRESHOLD * 0.7)),
      );
    })
    .onEnd((e) => {
      if (e.translationX > SWIPE_THRESHOLD) {
        translateX.value = withTiming(
          width * 1.5,
          { duration: 280 },
          (done) => {
            if (done) runOnJS(handleRight)();
          },
        );
      } else if (e.translationX < -SWIPE_THRESHOLD) {
        translateX.value = withTiming(
          -width * 1.5,
          { duration: 280 },
          (done) => {
            if (done) runOnJS(handleLeft)();
          },
        );
      } else {
        translateX.value = withSpring(0, { damping: 18, stiffness: 220 });
        translateY.value = withSpring(0, { damping: 18, stiffness: 220 });
        connectOpacity.value = withSpring(0);
        passOpacity.value = withSpring(0);
      }
    });

  const cardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      translateX.value,
      [-width, 0, width],
      [-ROTATE_FACTOR, 0, ROTATE_FACTOR],
      Extrapolation.CLAMP,
    );
    return {
      transform: [
        { translateX: translateX.value },
        { translateY: translateY.value },
        { rotate: `${rotate}deg` },
      ],
    };
  });

  const connOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      connectOpacity.value,
      [0, 1],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));
  const passOverlayStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      passOpacity.value,
      [0, 1],
      [0, 1],
      Extrapolation.CLAMP,
    ),
  }));

  return (
    <GestureDetector gesture={pan}>
      <Animated.View style={[styles.cardWrapper, cardStyle]}>
        <MateCard mate={mate} />
        <ConnectedOverlay style={connOverlayStyle} />
        <PassOverlay style={passOverlayStyle} />
      </Animated.View>
    </GestureDetector>
  );
}

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function AllMates() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [mates, setMates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [connected, setConnected] = useState([]);
  const [flashAction, setFlashAction] = useState(null);

  const topCardTranslateX = useSharedValue(0);
  const topCardTranslateY = useSharedValue(0);
  const topCardConnectOpacity = useSharedValue(0);
  const topCardPassOpacity = useSharedValue(0);

  const fetchMates = useCallback(async () => {
    setLoading(true);
    try {
      const coords = await getCachedLocation();
      const res = await getNearbySessionsAPI(
        coords?.lat ?? null,
        coords?.lng ?? null,
      );
      if (res?.status === 200) setMates(res.data || []);
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchMates();
  }, [fetchMates]);

  const resetCardValues = () => {
    topCardTranslateX.value = 0;
    topCardTranslateY.value = 0;
    topCardConnectOpacity.value = 0;
    topCardPassOpacity.value = 0;
  };

  const handleConnect = useCallback(
    async (sessionId) => {
      if (!sessionId) return;
      const mate = mates.find((m) => m.session_id === sessionId);
      // If already has pending request, just remove card
      if (mate?.pending_request_id) {
        setMates((prev) => prev.filter((m) => m.session_id !== sessionId));
        resetCardValues();
        return;
      }
      try {
        const res = await sendSessionRequestAPI(sessionId);
        if (res?.status === 200 || res?.status === 201) {
          setConnected((prev) => [...prev, sessionId]);
          setFlashAction("connect");
          setTimeout(() => setFlashAction(null), 1200);
        } else {
          showToast({
            type: "error",
            title: res?.message || "Couldn't send request",
          });
        }
      } catch {
        showToast({ type: "error", title: "Couldn't send request" });
      }
      setMates((prev) => prev.filter((m) => m.session_id !== sessionId));
      resetCardValues();
    },
    [mates],
  );

  const handlePass = useCallback((sessionId) => {
    if (!sessionId) return;
    setFlashAction("pass");
    setTimeout(() => setFlashAction(null), 800);
    setMates((prev) => prev.filter((m) => m.session_id !== sessionId));
    resetCardValues();
  }, []);

  const swipeOut = (direction) => {
    const targetX = direction === "right" ? width * 1.4 : -width * 1.4;
    topCardConnectOpacity.value =
      direction === "right" ? withTiming(1, { duration: 150 }) : withTiming(0);
    topCardPassOpacity.value =
      direction === "left" ? withTiming(1, { duration: 150 }) : withTiming(0);
    topCardTranslateX.value = withTiming(targetX, { duration: 300 }, (done) => {
      if (done) {
        if (direction === "right") runOnJS(handleConnect)(mates[0]?.session_id);
        else runOnJS(handlePass)(mates[0]?.session_id);
      }
    });
  };

  const current = mates[0];
  const next = mates[1];

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backBtn}
            activeOpacity={0.7}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Find Gym Mate</Text>
            <Text style={styles.headerSub}>Swipe to connect</Text>
          </View>
          <View style={styles.connectedBubble}>
            <Image
              source={require("../../../assets/images/gym_mate/icon_connect.png")}
              style={{ width: 18, height: 16 }}
            />
            <Text style={styles.connectedCount}>{connected.length}</Text>
          </View>
        </View>

        {/* Flash feedback banner */}
        {flashAction === "connect" && (
          <View style={styles.flashBannerConnect}>
            <Image
              source={require("../../../assets/images/gym_mate/icon_connect.png")}
              style={{ width: 18, height: 16 }}
            />
            <Text style={styles.flashBannerText}>Connection Request Sent!</Text>
          </View>
        )}
        {flashAction === "pass" && (
          <View style={styles.flashBannerPass}>
            <Ionicons name="close-circle" size={18} color="#FF3B5C" />
            <Text style={styles.flashBannerPassText}>Passed</Text>
          </View>
        )}

        {/* Cards stack */}
        <View style={styles.deckArea}>
          {loading ? (
            <ActivityIndicator size="large" color="#FF5757" />
          ) : mates.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="people" size={52} color="#E0E0E0" />
              </View>
              <Text style={styles.emptyTitle}>You've seen everyone!</Text>
              <Text style={styles.emptySub}>
                Check back later for new gym mates near you.
              </Text>
              <TouchableOpacity
                style={styles.refreshBtn}
                activeOpacity={0.85}
                onPress={fetchMates}
              >
                <LinearGradient
                  colors={["#0F172B", "#1E293B"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.refreshGrad}
                >
                  <Ionicons name="refresh" size={16} color="#FFF" />
                  <Text style={styles.refreshBtnText}>Refresh</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {next && (
                <View
                  style={[
                    styles.cardWrapper,
                    styles.cardWrapperBack,
                    { transform: [{ scale: 0.94 }, { translateY: 16 }] },
                  ]}
                >
                  <MateCard mate={next} />
                </View>
              )}
              {current && (
                <SwipeCardTop
                  mate={current}
                  onSwipeRight={handleConnect}
                  onSwipeLeft={handlePass}
                  translateX={topCardTranslateX}
                  translateY={topCardTranslateY}
                  connectOpacity={topCardConnectOpacity}
                  passOpacity={topCardPassOpacity}
                />
              )}
            </>
          )}
        </View>

        {/* Bottom action buttons */}
        {!loading && mates.length > 0 && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.passBtn}
              activeOpacity={0.85}
              onPress={() => swipeOut("left")}
            >
              <Ionicons name="close" size={30} color="#FF3B5C" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.connectBtn}
              activeOpacity={0.85}
              onPress={() => swipeOut("right")}
            >
              <Image
                source={require("../../../assets/images/gym_mate/icon_connect.png")}
                style={styles.connectBtnIcon}
              />
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom hint */}
        {!loading && mates.length > 0 && (
          <View style={[styles.hintRow, { paddingBottom: insets.bottom + 8 }]}>
            <View style={styles.hintItem}>
              <Ionicons name="arrow-back-circle" size={16} color="#FF3B5C" />
              <Text style={styles.hintText}>Swipe left to pass</Text>
            </View>
            <View style={styles.hintItem}>
              <Ionicons name="arrow-forward-circle" size={16} color="#00C950" />
              <Text style={styles.hintText}>Swipe right to connect</Text>
            </View>
          </View>
        )}
      </View>
    </GestureHandlerRootView>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#FFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
    alignItems: "center",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    letterSpacing: 0.3,
  },
  headerSub: {
    fontSize: 11,
    color: "#888",
    marginTop: 1,
  },
  connectedBubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00C950",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  connectedCount: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "700",
  },
  flashBannerConnect: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#0F172B",
    paddingVertical: 9,
  },
  flashBannerText: {
    color: "#FFF",
    fontSize: 13,
    fontWeight: "600",
  },
  flashBannerPass: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FFF0F3",
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: "#FFD6DE",
  },
  flashBannerPassText: {
    color: "#FF3B5C",
    fontSize: 13,
    fontWeight: "600",
  },
  deckArea: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingTop: 12,
    paddingBottom: 4,
  },
  cardWrapper: {
    position: "absolute",
    width: CARD_W,
    height: CARD_H,
    borderRadius: 22,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 12,
    backgroundColor: "#FFF",
  },
  cardWrapperBack: {
    position: "absolute",
  },
  card: {
    flex: 1,
    borderRadius: 22,
    overflow: "hidden",
  },
  cardImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
  },
  dailyPassBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    backgroundColor: "rgba(255,255,255,0.18)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.35)",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 5,
  },
  dailyPassText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  cardInfo: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
  },
  cardNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  cardName: {
    fontSize: 22,
    fontWeight: "800",
    color: "#FFF",
    letterSpacing: 0.2,
  },
  cardDistBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 3,
  },
  cardDistText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "600",
  },
  cardGymRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 4,
  },
  cardGymText: {
    color: "rgba(255,255,255,0.85)",
    fontSize: 13,
    fontWeight: "500",
  },
  cardTimeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginBottom: 8,
  },
  cardTimeText: {
    color: "rgba(255,255,255,0.75)",
    fontSize: 12,
  },
  cardBio: {
    color: "rgba(255,255,255,0.8)",
    fontSize: 12.5,
    lineHeight: 17,
    marginBottom: 10,
  },
  cardTags: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  cardTag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    backgroundColor: "rgba(255,255,255,0.14)",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  cardTagText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "600",
  },
  connectedOverlay: {
    borderRadius: 22,
    backgroundColor: "rgba(15,23,43,0.35)",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingLeft: 24,
    paddingTop: 40,
  },
  connectedBadgeCard: {
    alignItems: "center",
    gap: 8,
    borderWidth: 3,
    borderColor: "#FFF",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#00C950",
    transform: [{ rotate: "-15deg" }],
  },
  connectedText: {
    color: "#FFF",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
  },
  passOverlay: {
    borderRadius: 22,
    backgroundColor: "rgba(255,59,92,0.15)",
    justifyContent: "center",
    alignItems: "flex-end",
    paddingRight: 24,
    paddingTop: 40,
  },
  passBadgeCard: {
    alignItems: "center",
    gap: 8,
    borderWidth: 3,
    borderColor: "#FF3B5C",
    borderRadius: 16,
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "rgba(255,59,92,0.12)",
    transform: [{ rotate: "15deg" }],
  },
  passText: {
    color: "#FF3B5C",
    fontSize: 22,
    fontWeight: "900",
    letterSpacing: 2,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 80,
    paddingBottom: 8,
    paddingTop: 16,
  },
  passBtn: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF3B5C",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 2,
    borderColor: "#FFE0E5",
  },
  connectBtn: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: "#00C950",
    justifyContent: "center",
    alignItems: "center",
  },
  connectBtnIcon: {
    width: 30,
    height: 26,
    tintColor: "#FFF",
  },
  hintRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 24,
    paddingBottom: 14,
  },
  hintItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  hintText: {
    fontSize: 11,
    color: "#AAAAAA",
    fontWeight: "500",
  },
  emptyState: {
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyIconWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "#F0F0F0",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  emptySub: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 28,
  },
  refreshBtn: {
    borderRadius: 28,
    overflow: "hidden",
  },
  refreshGrad: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 28,
    paddingVertical: 14,
    borderRadius: 28,
  },
  refreshBtnText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
});
