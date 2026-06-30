import React, { useState, useCallback, useEffect } from "react";
import {
  ActivityIndicator,
  BackHandler,
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
  withDelay,
  withSequence,
  interpolate,
  runOnJS,
  Extrapolation,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import { useRouter, useLocalSearchParams } from "expo-router";
import axiosInstance from "../../../services/axiosInstance";
import { sendFriendRequestAPI } from "../../../services/clientApi";
import { showToast } from "../../../utils/Toaster";

const { width, height } = Dimensions.get("window");

const SWIPE_THRESHOLD = width * 0.3;
const CARD_W = width - 32;
const CARD_H = height * 0.62;
const ROTATE_FACTOR = 12;

// ─── Single Card ──────────────────────────────────────────────────────────────

const DiscoverCard = ({ person }) => {
  const hasImage = !!person.avatar_url;
  const detailTags = person.details || [];

  return (
    <View style={styles.card}>
      {hasImage ? (
        <Image
          source={{ uri: person.avatar_url }}
          style={styles.cardImage}
          resizeMode="cover"
        />
      ) : (
        <View style={styles.cardNoImage}>
          <Ionicons name="person-circle-outline" size={120} color="#D1D5DB" />
        </View>
      )}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.85)"]}
        style={styles.cardGradient}
      />

      {/* Match badge — top right, only for match tier */}
      {person.suggestion_type === "match" &&
        person.match_percentage != null && (
          <View style={styles.matchBadge}>
            <Ionicons name="heart" size={11} color="#FFF" />
            <Text style={styles.matchBadgeText}>
              {person.match_percentage}% match
            </Text>
          </View>
        )}

      <View style={styles.cardInfo}>
        <View style={styles.cardNameRow}>
          <Text style={styles.cardName}>{person.name}</Text>
          {person.city ? (
            <View style={styles.cityBadge}>
              <Ionicons name="location" size={11} color="#FF5757" />
              <Text style={styles.cityText}>{person.city}</Text>
            </View>
          ) : null}
        </View>

        {person.bio ? (
          <Text style={styles.cardBio} numberOfLines={2}>
            {person.bio}
          </Text>
        ) : null}

        {detailTags.length > 0 && (
          <View style={styles.cardTags}>
            {detailTags.map((tag) => (
              <View key={tag} style={styles.cardTag}>
                <Text style={styles.cardTagText}>{tag}</Text>
              </View>
            ))}
          </View>
        )}
      </View>
    </View>
  );
};

// ─── Friend Request Overlay ──────────────────────────────────────────────────

const FriendRequestOverlay = ({ style }) => (
  <Animated.View
    style={[StyleSheet.absoluteFill, styles.connectOverlay, style]}
    pointerEvents="none"
  >
    <View style={styles.connectBadgeCard}>
      <Ionicons name="person-add" size={32} color="#FFF" />
      <Text style={styles.connectText}>FRIEND!</Text>
    </View>
  </Animated.View>
);

// ─── Pass Overlay ────────────────────────────────────────────────────────────

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
  person,
  onSwipeRight,
  onSwipeLeft,
  translateX,
  translateY,
  connectOpacity,
  passOpacity,
}) {
  const handleRight = useCallback(
    () => onSwipeRight(person.client_id),
    [person.client_id, onSwipeRight],
  );
  const handleLeft = useCallback(
    () => onSwipeLeft(person.client_id),
    [person.client_id, onSwipeLeft],
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
        <DiscoverCard person={person} />
        <FriendRequestOverlay style={connOverlayStyle} />
        <PassOverlay style={passOverlayStyle} />
      </Animated.View>
    </GestureDetector>
  );
}

// ─── Intro Splash Overlay with Swipe Demo ────────────────────────────────────

const DEMO_CARD_W = width * 0.68;
const DEMO_CARD_H = DEMO_CARD_W * 1.35;
const DEMO_SWIPE_X = width * 0.32;

const SWIPE_DEMO_IMAGE = require("../../../assets/images/gym_mate/swipe.webp");

const IntroSplash = ({ onFinish }) => {
  const cardX = useSharedValue(0);
  const cardOpacity = useSharedValue(0);
  const cardScale = useSharedValue(0.8);
  const passLabelOpacity = useSharedValue(0);
  const friendLabelOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTranslateY = useSharedValue(20);
  const subtitleOpacity = useSharedValue(0);
  const subtitleTranslateY = useSharedValue(20);
  const containerOpacity = useSharedValue(1);

  useEffect(() => {
    // 1. Card appears
    cardOpacity.value = withTiming(1, { duration: 300 });
    cardScale.value = withSequence(
      withTiming(1.02, { duration: 300 }),
      withSpring(1, { damping: 12, stiffness: 200 }),
    );

    // 2. Swipe left (pass) then swipe right (friend) — single sequence
    cardX.value = withDelay(
      600,
      withSequence(
        withTiming(-DEMO_SWIPE_X, { duration: 400 }), // swipe left
        withDelay(300, withTiming(0, { duration: 300 })), // snap back
        withDelay(200, withTiming(DEMO_SWIPE_X, { duration: 400 })), // swipe right
        withDelay(300, withTiming(0, { duration: 300 })), // snap back
      ),
    );
    passLabelOpacity.value = withDelay(
      600,
      withSequence(
        withTiming(1, { duration: 300 }),
        withDelay(400, withTiming(0, { duration: 200 })),
      ),
    );
    friendLabelOpacity.value = withDelay(
      1800,
      withSequence(
        withTiming(1, { duration: 300 }),
        withDelay(400, withTiming(0, { duration: 200 })),
      ),
    );

    // 4. Title slides up
    titleOpacity.value = withDelay(2800, withTiming(1, { duration: 500 }));
    titleTranslateY.value = withDelay(
      2800,
      withSpring(0, { damping: 14, stiffness: 180 }),
    );

    // 5. Subtitle slides up
    subtitleOpacity.value = withDelay(3200, withTiming(1, { duration: 500 }));
    subtitleTranslateY.value = withDelay(
      3200,
      withSpring(0, { damping: 14, stiffness: 180 }),
    );

    // 6. Fade out entire overlay
    containerOpacity.value = withDelay(
      4600,
      withTiming(0, { duration: 500 }, (done) => {
        if (done) runOnJS(onFinish)();
      }),
    );
  }, []);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: containerOpacity.value,
  }));

  const demoCardStyle = useAnimatedStyle(() => {
    const rotate = interpolate(
      cardX.value,
      [-width, 0, width],
      [-ROTATE_FACTOR, 0, ROTATE_FACTOR],
      Extrapolation.CLAMP,
    );
    return {
      opacity: cardOpacity.value,
      transform: [
        { translateX: cardX.value },
        { rotate: `${rotate}deg` },
        { scale: cardScale.value },
      ],
    };
  });

  const passStyle = useAnimatedStyle(() => ({
    opacity: passLabelOpacity.value,
  }));

  const friendStyle = useAnimatedStyle(() => ({
    opacity: friendLabelOpacity.value,
  }));

  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTranslateY.value }],
  }));

  const subtitleStyle = useAnimatedStyle(() => ({
    opacity: subtitleOpacity.value,
    transform: [{ translateY: subtitleTranslateY.value }],
  }));

  return (
    <Animated.View style={[styles.introOverlay, containerStyle]}>
      <View style={styles.demoCardArea}>
        <Animated.View style={[styles.demoCard, demoCardStyle]}>
          <Image
            source={SWIPE_DEMO_IMAGE}
            style={styles.demoCardImage}
            resizeMode="cover"
          />
          <LinearGradient
            colors={["transparent", "rgba(0,0,0,0.7)"]}
            style={styles.demoCardGradient}
          />
          {/* Pass label */}
          <Animated.View style={[styles.demoPassLabel, passStyle]}>
            <Ionicons name="close-circle" size={28} color="#FF3B5C" />
            <Text style={styles.demoPassText}>PASS</Text>
          </Animated.View>
          {/* Friend label */}
          <Animated.View style={[styles.demoFriendLabel, friendStyle]}>
            <Ionicons name="person-add" size={24} color="#FFF" />
            <Text style={styles.demoFriendText}>FRIEND!</Text>
          </Animated.View>
        </Animated.View>
      </View>

      <Animated.Text style={[styles.introTitle, titleStyle]}>
        Gym Mate Profile Created!
      </Animated.Text>

      <Animated.Text style={[styles.introSubtitle, subtitleStyle]}>
        Swipe to find your gym mates
      </Animated.Text>

      <Animated.View style={[styles.introHintRow, subtitleStyle]}>
        <View style={styles.introHintItem}>
          <Ionicons name="arrow-back" size={14} color="#FF3B5C" />
          <Text style={[styles.introHintText, { color: "#FF3B5C" }]}>Pass</Text>
        </View>
        <View style={styles.introHintItem}>
          <Ionicons name="arrow-forward" size={14} color="#00C950" />
          <Text style={[styles.introHintText, { color: "#00C950" }]}>
            Friend
          </Text>
        </View>
      </Animated.View>
    </Animated.View>
  );
};

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function ProfileCreated() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { default_avatars, gender } = useLocalSearchParams();
  const [showIntro, setShowIntro] = useState(true);
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);
  const [requestsSent, setRequestsSent] = useState(0);
  const [flashAction, setFlashAction] = useState(null);

  // Navigate to profilebio passing the same params we received
  const goToProfileBio = useCallback(() => {
    router.replace({
      pathname: "/client/(gymmate)/profilebio",
      params: {
        default_avatars: default_avatars || undefined,
        gender: gender || undefined,
      },
    });
  }, [default_avatars, gender, router]);

  // Hardware back → go to profilebio
  useEffect(() => {
    const sub = BackHandler.addEventListener("hardwareBackPress", () => {
      goToProfileBio();
      return true;
    });
    return () => sub.remove();
  }, [goToProfileBio]);

  const topCardTranslateX = useSharedValue(0);
  const topCardTranslateY = useSharedValue(0);
  const topCardConnectOpacity = useSharedValue(0);
  const topCardPassOpacity = useSharedValue(0);

  const fetchDiscover = useCallback(async () => {
    setLoading(true);
    try {
      const res = await axiosInstance.get("/api/v2/gym_mate/friends/discover", {
        params: { limit: 50 },
      });
      if (res?.data?.status === 200) {
        setPeople(res.data.data || []);
      }
    } catch {}
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchDiscover();
  }, [fetchDiscover]);

  const resetCardValues = () => {
    topCardTranslateX.value = 0;
    topCardTranslateY.value = 0;
    topCardConnectOpacity.value = 0;
    topCardPassOpacity.value = 0;
  };

  const handleFriendRequest = useCallback(async (clientId) => {
    if (!clientId) return;
    try {
      const res = await sendFriendRequestAPI(clientId);
      if (res?.status === 200) {
        setRequestsSent((prev) => prev + 1);
        setFlashAction("friend");
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
    setPeople((prev) => prev.filter((p) => p.client_id !== clientId));
    resetCardValues();
  }, []);

  const handlePass = useCallback((clientId) => {
    if (!clientId) return;
    setFlashAction("pass");
    setTimeout(() => setFlashAction(null), 800);
    setPeople((prev) => prev.filter((p) => p.client_id !== clientId));
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
        if (direction === "right")
          runOnJS(handleFriendRequest)(people[0]?.client_id);
        else runOnJS(handlePass)(people[0]?.client_id);
      }
    });
  };


  const current = people[0];
  const next = people[1];

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <StatusBar barStyle="dark-content" />

        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.closeBtn}
            activeOpacity={0.7}
            onPress={goToProfileBio}
          >
            <Ionicons name="close" size={22} color="#1A1A1A" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Find Your Matches</Text>
            <Text style={styles.headerSub}>Swipe right to send request</Text>
          </View>
          <View style={styles.requestsBubble}>
            <Ionicons name="person-add" size={14} color="#FFF" />
            <Text style={styles.requestsCount}>{requestsSent}</Text>
          </View>
        </View>

        {/* Flash feedback banner */}
        {flashAction === "friend" && (
          <View style={styles.flashBannerConnect}>
            <Ionicons name="person-add" size={16} color="#FFF" />
            <Text style={styles.flashBannerText}>Friend Request Sent!</Text>
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
          ) : people.length === 0 ? (
            <View style={styles.emptyState}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="people" size={52} color="#E0E0E0" />
              </View>
              <Text style={styles.emptyTitle}>You've seen everyone!</Text>
              <Text style={styles.emptySub}>
                Check back later for new people to connect with.
              </Text>
              <TouchableOpacity
                style={styles.refreshBtn}
                activeOpacity={0.85}
                onPress={fetchDiscover}
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
              <TouchableOpacity
                style={styles.doneBtn}
                activeOpacity={0.85}
                onPress={goToProfileBio}
              >
                <Text style={styles.doneBtnText}>Go to Gym Mate</Text>
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
                  <DiscoverCard person={next} />
                </View>
              )}
              {current && (
                <SwipeCardTop
                  person={current}
                  onSwipeRight={handleFriendRequest}
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
        {!loading && people.length > 0 && (
          <View style={styles.actionRow}>
            <TouchableOpacity
              style={styles.passBtnAction}
              activeOpacity={0.85}
              onPress={() => swipeOut("left")}
            >
              <Ionicons name="close" size={30} color="#FF3B5C" />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.connectBtnAction}
              activeOpacity={0.85}
              onPress={() => swipeOut("right")}
            >
              <Ionicons name="person-add" size={24} color="#FFF" />
            </TouchableOpacity>
          </View>
        )}

        {/* Bottom hint */}
        {!loading && people.length > 0 && (
          <View style={[styles.hintRow, { paddingBottom: insets.bottom + 8 }]}>
            <View style={styles.hintItem}>
              <Ionicons name="arrow-back-circle" size={16} color="#FF3B5C" />
              <Text style={styles.hintText}>Swipe left to pass</Text>
            </View>
            <View style={styles.hintItem}>
              <Ionicons name="arrow-forward-circle" size={16} color="#00C950" />
              <Text style={styles.hintText}>Swipe right to add friend</Text>
            </View>
          </View>
        )}
        {/* Intro splash overlay */}
        {showIntro && (
          <IntroSplash onFinish={() => setShowIntro(false)} />
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
  closeBtn: {
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
  requestsBubble: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#00C950",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 5,
  },
  requestsCount: {
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
  cardNoImage: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  cardGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 22,
  },
  matchBadge: {
    position: "absolute",
    top: 16,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#2196F3",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  matchBadgeText: {
    color: "#FFF",
    fontSize: 12,
    fontWeight: "700",
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
  cityBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255,255,255,0.18)",
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 3,
  },
  cityText: {
    color: "#FFF",
    fontSize: 11,
    fontWeight: "600",
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
  connectOverlay: {
    borderRadius: 22,
    backgroundColor: "rgba(15,23,43,0.35)",
    justifyContent: "center",
    alignItems: "flex-start",
    paddingLeft: 24,
    paddingTop: 40,
  },
  connectBadgeCard: {
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
  connectText: {
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
  passBtnAction: {
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
  connectBtnAction: {
    width: 60,
    height: 60,
    borderRadius: 34,
    backgroundColor: "#00C950",
    justifyContent: "center",
    alignItems: "center",
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
  doneBtn: {
    marginTop: 14,
    paddingHorizontal: 28,
    paddingVertical: 12,
  },
  doneBtnText: {
    color: "#FF5757",
    fontSize: 14,
    fontWeight: "700",
  },

  // ─── Intro Splash ──────────────────────────────────────────────────────────
  introOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#FFFFFF",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 100,
  },
  introTitle: {
    fontSize: 24,
    fontWeight: "800",
    color: "#1A1A1A",
    textAlign: "center",
    letterSpacing: 0.3,
    marginBottom: 10,
  },
  introSubtitle: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
    textAlign: "center",
    marginBottom: 20,
  },
  introHintRow: {
    flexDirection: "row",
    gap: 28,
  },
  introHintItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  introHintText: {
    fontSize: 13,
    fontWeight: "700",
  },

  // ─── Demo Swipe Card ────────────────────────────────────────────────────────
  demoCardArea: {
    width: DEMO_CARD_W,
    height: DEMO_CARD_H,
    marginBottom: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  demoCard: {
    width: DEMO_CARD_W,
    height: DEMO_CARD_H,
    borderRadius: 18,
    overflow: "hidden",
    backgroundColor: "#F3F4F6",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.18,
    shadowRadius: 16,
    elevation: 12,
  },
  demoCardImage: {
    ...StyleSheet.absoluteFillObject,
    width: "100%",
    height: "100%",
  },
  demoCardGradient: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 18,
  },
  demoPassLabel: {
    position: "absolute",
    top: 20,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 2.5,
    borderColor: "#FF3B5C",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "rgba(255,59,92,0.1)",
    transform: [{ rotate: "15deg" }],
  },
  demoPassText: {
    color: "#FF3B5C",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
  demoFriendLabel: {
    position: "absolute",
    top: 20,
    left: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 2.5,
    borderColor: "#FFF",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 8,
    backgroundColor: "#00C950",
    transform: [{ rotate: "-15deg" }],
  },
  demoFriendText: {
    color: "#FFF",
    fontSize: 18,
    fontWeight: "900",
    letterSpacing: 1.5,
  },
});
