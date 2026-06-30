import React, { useState, useRef, useMemo, useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Animated,
  ActivityIndicator,
  StyleSheet,
} from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { sendSessionRequestAPI } from "../../../services/clientApi";
import { showToast } from "../../../utils/Toaster";
import { width, GM_CARD_W, GM_AUTOPLAY_MS } from "./constants";
import styles from "./homeStyles";

const fmtSessionDT = (dateStr, timeStr) => {
  try {
    const dt = new Date(`${dateStr}T${timeStr}`);
    const day = dt.getDate();
    const month = dt.toLocaleString("en-US", { month: "short" });
    const h = dt.getHours() % 12 || 12;
    const mm = dt.getMinutes().toString().padStart(2, "0");
    const ampm = dt.getHours() >= 12 ? "PM" : "AM";
    return `${h}:${mm} ${ampm} · ${day} ${month}`;
  } catch {
    return "";
  }
};

const GymMateRequestCard = ({
  mate,
  onboarded,
  onRequestSent,
  goToGymMate,
  goToGymMateExplore,
}) => {
  const [sent, setSent] = useState(!!mate._requestSent);
  const [sending, setSending] = useState(false);

  const handleConnect = async () => {
    if (!onboarded) {
      goToGymMate();
      return;
    }
    if (sent || sending) return;
    setSending(true);
    try {
      const res = await sendSessionRequestAPI(mate.session_id);
      if (res?.status === 200 || res?.status === 201) {
        setSent(true);
        onRequestSent?.(mate.session_id);
      } else {
        showToast({
          type: "error",
          title: res?.message || "Couldn't send request",
        });
      }
    } catch {
      showToast({ type: "error", title: "Couldn't send request" });
    }
    setSending(false);
  };

  return (
    <TouchableOpacity
      style={styles.gmCard}
      activeOpacity={0.95}
      onPress={goToGymMateExplore}
    >
      <Image
        source={
          mate.host_avatar_url
            ? { uri: mate.host_avatar_url }
            : require("../../../assets/images/gym_mate/profile.webp")
        }
        style={styles.gmCardImage}
        contentFit="cover"
      />
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,0.85)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gmCardOverlay}
      >
        <Text style={styles.gmCardName} numberOfLines={1}>
          {mate.host_name || "Gym Mate"}
        </Text>
        <View style={styles.gmCardInfoRow}>
          <Ionicons name="location-outline" size={13} color="#fff" />
          <Text style={styles.gmCardInfoText} numberOfLines={1}>
            {mate.gym_name}
            {mate.gym_area ? ` • ${mate.gym_area}` : ""}
            {mate.distance_km != null ? ` • ${mate.distance_km} km` : ""}
          </Text>
        </View>
        <View style={styles.gmCardInfoRow}>
          <Ionicons name="time-outline" size={13} color="#fff" />
          <Text style={styles.gmCardInfoText} numberOfLines={1}>
            {fmtSessionDT(mate.session_date, mate.session_time)}
          </Text>
        </View>
        <TouchableOpacity
          style={[styles.gmCardBtn, sent && styles.gmCardBtnSent]}
          activeOpacity={0.85}
          onPress={handleConnect}
          disabled={sent || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : sent ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
            >
              <Ionicons name="checkmark-circle" size={14} color="#FFF" />
              <Text style={styles.gmCardBtnText}>Request Sent</Text>
            </View>
          ) : (
            <Text style={styles.gmCardBtnText}>Join Workout</Text>
          )}
        </TouchableOpacity>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const GymMateCarousel = ({
  mates,
  onboarded,
  onRequestSent,
  goToGymMate,
  goToGymMateExplore,
}) => {
  const flatListRef = useRef(null);
  const activeIdx = useRef(1);
  const [dotIndex, setDotIndex] = useState(0);
  const autoTimer = useRef(null);
  const userScrolling = useRef(false);

  const loopData = useMemo(() => {
    if (!mates || mates.length === 0) return [];
    if (mates.length === 1) return mates;
    return [mates[mates.length - 1], ...mates, mates[0]];
  }, [mates]);

  const startAutoPlay = useCallback(() => {
    if (autoTimer.current) clearInterval(autoTimer.current);
    if (mates.length <= 1) return;
    autoTimer.current = setInterval(() => {
      if (userScrolling.current || !flatListRef.current) return;
      const next = activeIdx.current + 1;
      if (next < loopData.length) {
        try {
          flatListRef.current.scrollToIndex({ animated: true, index: next });
        } catch {}
      }
    }, GM_AUTOPLAY_MS);
  }, [mates.length, loopData.length]);

  React.useEffect(() => {
    if (!mates || mates.length <= 1) return;
    const timer = setTimeout(() => {
      if (flatListRef.current) {
        try {
          flatListRef.current.scrollToIndex({ animated: false, index: 1 });
        } catch {}
      }
    }, 50);
    startAutoPlay();
    return () => {
      clearTimeout(timer);
      if (autoTimer.current) clearInterval(autoTimer.current);
    };
  }, [mates.length]);

  const handleMomentumEnd = useCallback(
    (e) => {
      if (!mates || mates.length <= 1) return;
      const idx = Math.round(e.nativeEvent.contentOffset.x / width);
      activeIdx.current = idx;
      if (idx === 0) {
        const target = loopData.length - 2;
        flatListRef.current?.scrollToIndex({ animated: false, index: target });
        activeIdx.current = target;
        setDotIndex(mates.length - 1);
      } else if (idx === loopData.length - 1) {
        flatListRef.current?.scrollToIndex({ animated: false, index: 1 });
        activeIdx.current = 1;
        setDotIndex(0);
      } else {
        setDotIndex(idx - 1);
      }
      userScrolling.current = false;
      startAutoPlay();
    },
    [mates.length, loopData.length, startAutoPlay],
  );

  const getItemLayout = useCallback(
    (_, index) => ({ length: width, offset: width * index, index }),
    [],
  );

  const renderItem = useCallback(
    ({ item }) => (
      <View style={{ width, paddingHorizontal: 16 }}>
        <GymMateRequestCard
          mate={item}
          onboarded={onboarded}
          onRequestSent={onRequestSent}
          goToGymMate={goToGymMate}
          goToGymMateExplore={goToGymMateExplore}
        />
      </View>
    ),
    [onboarded, onRequestSent, goToGymMate, goToGymMateExplore],
  );

  return (
    <View>
      <Animated.FlatList
        ref={flatListRef}
        data={loopData}
        renderItem={renderItem}
        keyExtractor={(_, i) => String(i)}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEventThrottle={16}
        onScrollBeginDrag={() => {
          userScrolling.current = true;
          if (autoTimer.current) clearInterval(autoTimer.current);
        }}
        onMomentumScrollEnd={handleMomentumEnd}
        getItemLayout={getItemLayout}
        decelerationRate="fast"
      />
      {mates.length > 1 && (
        <View style={styles.gmDotRow}>
          {mates.map((_, i) => (
            <View
              key={i}
              style={[styles.gmDot, i === dotIndex && styles.gmDotActive]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const GymMateCards = ({
  onboarding,
  pendingRequests,
  onRequestSent,
  goToGymMate,
  goToGymMateExplore,
}) => {
  const onboarded = onboarding?.onboarding_completed === true;
  const hasRequests = pendingRequests && pendingRequests.length > 0;

  if (onboarded && !hasRequests) {
    return null;
  }

  if (!onboarded && !hasRequests) {
    return (
      <TouchableOpacity
        style={styles.gmOnboardCta}
        activeOpacity={0.9}
        onPress={goToGymMate}
      >
        <LinearGradient
          colors={["#FFF5F0", "#FFFFFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <View style={styles.gmOnboardTop}>
          <View style={styles.gmOnboardIconWrap}>
            <Ionicons name="people" size={22} color="#FF5757" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.gmOnboardTitle}>
              Create Your Gym Mate Profile
            </Text>
            <Text style={styles.gmOnboardSub}>
              People near you are finding workout partners. Set up your profile
              and get matched!
            </Text>
          </View>
        </View>
        <View style={styles.gmOnboardBtnRow}>
          <View style={styles.gmOnboardBtn}>
            <Text style={styles.gmOnboardBtnText}>Get Started</Text>
            <Ionicons name="arrow-forward" size={15} color="#FFF" />
          </View>
          <Text style={styles.gmOnboardFootnote}>Takes only 20 seconds</Text>
        </View>
      </TouchableOpacity>
    );
  }

  return (
    <GymMateCarousel
      mates={pendingRequests.slice(0, 5)}
      onboarded={onboarded}
      onRequestSent={onRequestSent}
      goToGymMate={goToGymMate}
      goToGymMateExplore={goToGymMateExplore}
    />
  );
};

export default GymMateCards;
