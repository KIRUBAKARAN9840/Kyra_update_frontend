import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  ActivityIndicator,
  Animated as RNAnimated,
  Dimensions,
  Easing as RNEasing,
  FlatList,
  Image,
  Modal,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { MaskedText } from "./MaskedText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { GestureDetector, Gesture } from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withSpring,
  withRepeat,
  withSequence,
  Easing,
  interpolate,
  runOnJS,
} from "react-native-reanimated";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeNav } from "../../hooks/useSafeNav";
import { useOpenChat } from "../../src/features/chat/hooks/useOpenChat";
import axiosInstance from "../../services/axiosInstance";
import {
  blockGymMateUserAPI,
  reportGymMateEntityAPI,
  getSessionRequestsReceivedAPI,
  getSessionRequestsSentAPI,
  getSessionMatchesAPI,
  acceptSessionRequestAPI,
  rejectSessionRequestAPI,
  withdrawSessionRequestAPI,
  sendSessionRequestAPI,
} from "../../services/clientApi";
import { getCachedLocation } from "../../services/locationCache";
import { showToast } from "../../utils/Toaster";

// Reason label → backend key mapping
const REPORT_REASON_MAP = {
  "Inappropriate or offensive content": "inappropriate_content",
  "Spam or misleading": "spam",
  "Harassment or bullying": "harassment",
  "Violence or dangerous acts": "violence",
  "False information": "false_information",
  "Suicide or self-injury": "self_injury",
  "Scams or fraud": "scam",
  "Nudity & Sexual Content": "nudity",
  "Intellectual Property Infringement": "ip_infringement",
  "Promoting Restricted Items": "restricted_items",
};

const { width } = Dimensions.get("window");

// ─── Assets ───────────────────────────────────────────────────────────────────

// ─── Header ───────────────────────────────────────────────────────────────────

const MENU_ITEMS = [
  {
    key: "profile",
    label: "My Profile",
    icon: "person-outline",
    route: "/client/(gymmate)/profileme",
  },
  {
    key: "friends",
    label: "My Friends",
    icon: "people-outline",
    route: "/client/(gymmate)/myfriends",
  },
  {
    key: "chat",
    label: "Chat",
    icon: "chatbubble-outline",
    route: "/client/(gymmate)/chat",
  },
  {
    key: "requests",
    label: "Friend Requests",
    icon: "person-add-outline",
    route: "/client/(gymmate)/requests",
  },
  {
    key: "settings",
    label: "Settings",
    icon: "settings-outline",
    route: "/client/(gymmate)/settings",
  },
];

// ─── Connections Modal ────────────────────────────────────────────────────────

const CONN_TABS = ["Received", "Sent", "Matches"];

const CONN_DEFAULT_AVATAR = require("../../assets/images/defaultavatar.webp");

const ConnectionRow = ({ item, tab, onCloseModal, onRefresh }) => {
  const navigate = useSafeNav();
  const [actionLoading, setActionLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [rejected, setRejected] = useState(false);
  const [withdrawn, setWithdrawn] = useState(false);
  const isReceived = tab === "Received";
  const avatarUrl = isReceived
    ? item.requester_avatar_url
    : item.host_avatar_url;
  const name = isReceived ? item.requester_name : item.host_name;
  const profileClientId = isReceived
    ? item.requester_client_id
    : item.host_client_id;

  const goToProfile = () => {
    onCloseModal?.();
    setTimeout(() => {
      navigate("/client/(gymmate)/profilemate", { client_id: profileClientId });
    }, 300);
  };

  const handleAccept = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const res = await acceptSessionRequestAPI(item.request_id);
      if (res?.status === 200) {
        setAccepted(true);
        setTimeout(() => onRefresh?.(), 1200);
      } else {
        showToast({
          type: "error",
          title: res?.message || "Couldn't accept — try again",
        });
        if (res?.error_code === "GYMMATE_REQUEST_BAD_STATE") onRefresh?.();
        setActionLoading(false);
      }
    } catch {
      showToast({ type: "error", title: "Couldn't accept — try again" });
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const res = await rejectSessionRequestAPI(item.request_id);
      if (res?.status === 200) {
        setRejected(true);
        setTimeout(() => onRefresh?.(), 1200);
      } else {
        showToast({
          type: "error",
          title: res?.message || "Couldn't decline — try again",
        });
        if (res?.error_code === "GYMMATE_REQUEST_BAD_STATE") onRefresh?.();
        setActionLoading(false);
      }
    } catch {
      showToast({ type: "error", title: "Couldn't decline — try again" });
      setActionLoading(false);
    }
  };

  const handleWithdraw = async () => {
    if (actionLoading) return;
    setActionLoading(true);
    try {
      const res = await withdrawSessionRequestAPI(item.request_id);
      if (res?.status === 200) {
        setWithdrawn(true);
        setTimeout(() => onRefresh?.(), 1200);
      } else {
        showToast({
          type: "error",
          title: res?.message || "Couldn't withdraw — try again",
        });
        if (res?.error_code === "GYMMATE_REQUEST_BAD_STATE") onRefresh?.();
        setActionLoading(false);
      }
    } catch {
      showToast({ type: "error", title: "Couldn't withdraw — try again" });
      setActionLoading(false);
    }
  };

  return (
    <View style={s.connRow}>
      <TouchableOpacity onPress={goToProfile} activeOpacity={0.8}>
        <View
          style={tab === "Matches" ? s.connAvatarRingGreen : s.connAvatarRing}
        >
          <Image
            source={avatarUrl ? { uri: avatarUrl } : CONN_DEFAULT_AVATAR}
            style={s.connAvatar}
          />
        </View>
      </TouchableOpacity>

      <TouchableOpacity
        style={s.connInfo}
        onPress={goToProfile}
        activeOpacity={0.8}
      >
        <Text style={s.connName}>{name}</Text>
        <Text style={s.connGym}>{item.gym_name}</Text>
        <View style={s.connLocRow}>
          <Ionicons name="location" size={11} color="#FF5757" />
          <Text style={s.connDist}>{item.gym_area}</Text>
        </View>
      </TouchableOpacity>

      {tab === "Received" &&
        (accepted ? (
          <View style={s.connAcceptBtnWrap}>
            <LinearGradient
              colors={["#00C950", "#00BC7D"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={s.connAcceptBtn}
            >
              <Ionicons name="checkmark" size={20} color="#FFF" />
            </LinearGradient>
          </View>
        ) : rejected ? (
          <View style={[s.connRejectBtn, { opacity: 0.5 }]}>
            <Ionicons name="close" size={18} color="#FF5757" />
          </View>
        ) : (
          <View style={s.connActions}>
            <TouchableOpacity
              style={s.connRejectBtn}
              activeOpacity={0.8}
              onPress={handleReject}
              disabled={actionLoading}
            >
              <Ionicons name="close" size={18} color="#FF5757" />
            </TouchableOpacity>
            <TouchableOpacity
              style={s.connAcceptBtnWrap}
              activeOpacity={0.85}
              onPress={handleAccept}
              disabled={actionLoading}
            >
              <LinearGradient
                colors={["#00C950", "#00BC7D"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.connAcceptBtn}
              >
                {actionLoading ? (
                  <ActivityIndicator size={16} color="#FFF" />
                ) : (
                  <Image
                    source={require("../../assets/images/gym_mate/icon_connect.png")}
                    style={s.connAcceptIcon}
                  />
                )}
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ))}
      {tab === "Sent" &&
        (withdrawn ? (
          <View style={[s.connPendingBtn, { opacity: 0.5 }]}>
            <Ionicons name="checkmark" size={16} color="#FF5757" />
            <Text style={s.connPendingText}>Withdrawn</Text>
          </View>
        ) : (
          <TouchableOpacity
            style={s.connPendingBtn}
            activeOpacity={0.8}
            onPress={handleWithdraw}
            disabled={actionLoading}
          >
            {actionLoading ? (
              <ActivityIndicator size={14} color="#FF5757" />
            ) : (
              <Text style={s.connPendingText}>Withdraw</Text>
            )}
          </TouchableOpacity>
        ))}
      {tab === "Matches" && (
        <TouchableOpacity style={s.connMsgBtnWrap} activeOpacity={0.85}>
          <LinearGradient
            colors={["#00C950", "#00BC7D"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.connMsgBtn}
          >
            <Ionicons name="chatbubble-ellipses" size={15} color="#FFF" />
          </LinearGradient>
        </TouchableOpacity>
      )}
    </View>
  );
};

// ─── Matches Tab Content ──────────────────────────────────────────────────────

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

const MATCH_DEFAULT_AVATAR = require("../../assets/images/defaultavatar.webp");

const MatchCarouselCard = ({
  item,
  onChatPress,
  onCloseModal,
  onShowMembers,
}) => {
  const navigate = useSafeNav();
  const members = item.members || [];

  const gym = item.gym || {};
  const viewer = members.find((m) => m.is_viewer);
  const others = members.filter((m) => !m.is_viewer);
  const firstOther = others[0];
  const extraCount = others.length - 1;
  const firstName = others[0]?.name?.split(" ")[0] || "";

  const badgeText = formatSessionDateTime(item.session_date, item.session_time);

  // Match text
  let matchText = "";
  if (others.length === 1) {
    matchText = `You and ${firstName} matched`;
  } else if (others.length > 1) {
    matchText = `You, ${firstName} +${others.length - 1} matched`;
  }

  return (
    <View style={s.matchTopCard}>
      {/* Gym image section */}
      <View style={s.matchGymImageWrap}>
        <Image
          source={
            gym.cover_pic
              ? { uri: gym.cover_pic }
              : require("../../assets/images/gym_mate/gym.webp")
          }
          style={s.matchGymImage}
          resizeMode="cover"
        />
        <View style={s.matchGymOverlay}>
          <Text style={s.matchGymName}>{gym.name}</Text>
          <View style={s.matchGymLocRow}>
            <Ionicons name="location" size={11} color="#fff" />
            <Text style={s.matchGymLoc}>{gym.area}</Text>
          </View>
        </View>
        {badgeText ? (
          <View style={s.matchDistBadge}>
            <Ionicons name="time-outline" size={11} color="#1A1A1A" />
            <Text style={s.matchDistText}>{badgeText}</Text>
          </View>
        ) : null}
      </View>

      {/* Congratulations section */}
      <View style={s.matchCongSection}>
        <LinearGradient
          colors={["rgba(0,201,80,0.10)", "rgba(0,188,125,0.10)"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={StyleSheet.absoluteFill}
          pointerEvents="none"
        />
        <Text style={s.matchCongTitle}>Congratulations</Text>
        <Text style={s.matchCongSub}>it's a match!</Text>

        <View style={s.matchAvatarRow}>
          {/* Viewer on left */}
          <View style={s.matchAvatarWrap}>
            <Image
              source={
                viewer?.avatar_url
                  ? { uri: viewer.avatar_url }
                  : MATCH_DEFAULT_AVATAR
              }
              style={s.matchAvatar}
            />
          </View>

          <View style={s.matchConnectCenter}>
            <View style={s.matchDots}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={s.matchDot} />
              ))}
            </View>
            <View style={s.matchConnectIconWrap}>
              {/* <LinearGradient
                colors={["#00C950", "#00BC7D"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.matchConnectGrad}
              > */}
              <Image
                source={require("../../assets/images/gym_mate/connect.webp")}
                style={s.matchConnectIcon}
              />
              {/* </LinearGradient> */}
            </View>
            <View style={s.matchDots}>
              {[0, 1, 2].map((i) => (
                <View key={i} style={s.matchDot} />
              ))}
            </View>
          </View>

          {/* Other on right — 1 photo + N badge */}
          <View style={s.matchRightAvatars}>
            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() => onShowMembers?.(members)}
              style={{ flexDirection: "row", alignItems: "center" }}
            >
              {firstOther && (
                <View style={s.matchAvatarWrap}>
                  <Image
                    source={
                      firstOther.avatar_url
                        ? { uri: firstOther.avatar_url }
                        : MATCH_DEFAULT_AVATAR
                    }
                    style={s.matchAvatar}
                  />
                </View>
              )}
              {extraCount > 0 && (
                <View style={[s.matchExtraBadge, { marginLeft: -14 }]}>
                  <Text style={s.matchExtraText}>+{extraCount}</Text>
                </View>
              )}
            </TouchableOpacity>
            {/* Chat badge */}
            <TouchableOpacity
              style={s.matchChatBadge}
              activeOpacity={0.8}
              onPress={onChatPress}
            >
              <LinearGradient
                colors={["#00C950", "#00BC7D"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.matchChatBadgeGrad}
              >
                <Ionicons name="chatbubble-ellipses" size={24} color="#FFF" />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>

        {matchText ? (
          <Text style={s.matchCongDesc}>
            <Text style={s.matchYou}>{matchText}</Text>
          </Text>
        ) : null}

        <TouchableOpacity
          activeOpacity={0.85}
          style={s.matchChatPlanBtn}
          onPress={onChatPress}
        >
          <Ionicons name="chatbubble-ellipses" size={16} color="#FFF" />
          <Text style={s.matchChatPlanText}>Chat & Plan Workout</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const CARD_CAROUSEL_W = width - 32; // 16px padding each side

const MatchesContent = ({ onCloseModal }) => {
  const router = useRouter();
  const navigate = useSafeNav();
  const { openGroup, loading: chatLoading } = useOpenChat();
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeIndex, setActiveIndex] = useState(0);
  const [popupMembers, setPopupMembers] = useState(null);
  const flatListRef = useRef(null);
  const scrollX = useRef(new RNAnimated.Value(0)).current;

  useEffect(() => {
    let active = true;
    const fetchMatches = async () => {
      setLoading(true);
      try {
        const res = await getSessionMatchesAPI();

        if (active && res?.status === 200) setMatches(res.data || []);
      } catch {}
      if (active) setLoading(false);
    };
    fetchMatches();
    return () => {
      active = false;
    };
  }, []);

  const handleScroll = RNAnimated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (e) => {
        const idx = Math.round(e.nativeEvent.contentOffset.x / CARD_CAROUSEL_W);
        if (idx !== activeIndex && idx >= 0 && idx < matches.length) {
          setActiveIndex(idx);
        }
      },
    },
  );

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" color="#FF5757" />
      </View>
    );
  }

  if (matches.length === 0) {
    return (
      <View
        style={{
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          gap: 12,
        }}
      >
        <Ionicons name="people-outline" size={48} color="#D1D5DB" />
        <Text style={{ fontSize: 13, color: "#9CA3AF" }}>No matches yet</Text>
      </View>
    );
  }

  const activeSession = matches[activeIndex] || matches[0];
  const activeGym = activeSession?.gym || {};
  const activeMembers = activeSession?.members || [];
  const viewer = activeMembers.find((m) => m.is_viewer);
  const others = activeMembers.filter((m) => !m.is_viewer);
  const trainAvatars = [viewer, others[0]].filter(Boolean);
  const dailyPassPrice = activeGym.dailypass_price;
  const gymId = activeGym.gym_id;

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      contentContainerStyle={s.matchScrollContent}
    >
      {/* Swipeable match carousel */}
      <View style={s.matchCarouselWrap}>
        <FlatList
          ref={flatListRef}
          data={matches}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          keyExtractor={(item) => String(item.session_id)}
          getItemLayout={(_, i) => ({
            length: CARD_CAROUSEL_W,
            offset: CARD_CAROUSEL_W * i,
            index: i,
          })}
          snapToInterval={CARD_CAROUSEL_W}
          decelerationRate="fast"
          renderItem={({ item }) => (
            <View style={{ width: CARD_CAROUSEL_W, paddingBottom: 12 }}>
              <MatchCarouselCard
                item={item}
                onCloseModal={onCloseModal}
                onShowMembers={(members) => {
                  const others = members.filter((m) => !m.is_viewer);
                  if (others.length === 1) {
                    onCloseModal?.();
                    setTimeout(
                      () =>
                        navigate("/client/(gymmate)/profilemate", {
                          client_id: others[0].client_id,
                        }),
                      300,
                    );
                  } else if (others.length > 1) {
                    setPopupMembers(members);
                  }
                }}
                onChatPress={() => {
                  if (chatLoading) return;
                  if (item.session_id) {
                    onCloseModal?.();
                    setTimeout(() => {
                      openGroup(item.session_id, item.gym?.name);
                    }, 300);
                  }
                }}
              />
            </View>
          )}
        />

        {matches.length > 1 && (
          <View style={s.matchCarouselDots}>
            {matches.map((_, i) => (
              <View
                key={i}
                style={[
                  s.matchCarouselDot,
                  i === activeIndex && s.matchCarouselDotActive,
                ]}
              />
            ))}
          </View>
        )}
      </View>

      {/* Gym info row — Train Together */}
      <View style={s.matchGymInfoRow}>
        <View style={s.matchAvatarSmallWrap}>
          {trainAvatars.map((m, idx) => (
            <Image
              key={m?.client_id || idx}
              source={
                m?.avatar_url ? { uri: m.avatar_url } : MATCH_DEFAULT_AVATAR
              }
              style={[s.matchAvatarSmall, idx > 0 && { marginLeft: -10 }]}
            />
          ))}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={s.matchGymInfoText}>
            Train Together at{" "}
            <Text style={s.matchGymInfoLink}>{activeGym.name || "Gym"}</Text>
          </Text>
          <Text style={s.matchGymInfoSub}>
            Both partners need gym access to train together
          </Text>
        </View>
      </View>

      {/* Plan section */}
      <Text style={s.matchPlanTitle}>Plan Your Workout Together</Text>
      <Text style={s.matchPlanSub}>
        Book your daily pass now for gym access
      </Text>

      {/* Daily Pass card */}
      <View style={s.matchPlanCard}>
        <View style={s.matchPlanCardHeader}>
          <LinearGradient
            colors={["#FF6900", "#FE9A00"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.matchPlanIconBox}
          >
            <MaterialCommunityIcons name="dumbbell" size={22} color="#FFF" />
          </LinearGradient>
          <View style={{ marginLeft: 12 }}>
            <Text style={s.matchPlanCardLabel}>Daily Pass</Text>
            <Text style={s.matchPlanCardBest}>Best for 1st Workout</Text>
          </View>
        </View>

        <View style={{ marginTop: 10, marginBottom: 2 }}>
          <MaskedText
            bg1="#FF6900"
            bg2="#FE9A00"
            text={dailyPassPrice ? `₹${dailyPassPrice}` : "₹49"}
            textStyle={s.matchPlanPrice}
            extra={true}
            extraText="Workout any time anywhere"
            extraStyle={s.matchPlanPriceExtra}
          />
        </View>

        {[
          "Full gym access",
          "All equipment included",
          "Valid for 1 day",
          "Book for your workout buddy",
        ].map((f) => (
          <View key={f} style={s.matchFeatureRow}>
            <Ionicons name="checkmark" size={13} color="#1A1A1A" />
            <Text style={s.matchFeatureText}>{f}</Text>
          </View>
        ))}

        <TouchableOpacity
          style={s.matchBookBtn}
          activeOpacity={0.85}
          onPress={() => {
            if (gymId) {
              onCloseModal?.();
              setTimeout(() => {
                router.push({
                  pathname: "/client/(dailypass)/passDateSelection",
                  params: { gymId },
                });
              }, 300);
            }
          }}
        >
          <Text style={s.matchBookBtnText}>Book Pass</Text>
        </TouchableOpacity>
      </View>

      {/* Members popup */}
      {popupMembers && (
        <Modal
          visible
          transparent
          animationType="fade"
          onRequestClose={() => setPopupMembers(null)}
          statusBarTranslucent
        >
          <TouchableWithoutFeedback onPress={() => setPopupMembers(null)}>
            <View style={s.membersPopupOverlay}>
              <TouchableWithoutFeedback>
                <View style={s.membersPopupCard}>
                  <View style={s.membersPopupHeader}>
                    <Text style={s.membersPopupTitle}>
                      All Matches ({popupMembers.length - 1})
                    </Text>
                    <TouchableOpacity onPress={() => setPopupMembers(null)}>
                      <Ionicons name="close" size={22} color="#6B7280" />
                    </TouchableOpacity>
                  </View>
                  <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={s.membersRingScroll}
                  >
                    {popupMembers
                      .filter((m) => !m.is_viewer)
                      .map((m) => (
                        <TouchableOpacity
                          key={m.client_id}
                          style={s.membersRingItem}
                          activeOpacity={0.7}
                          onPress={() => {
                            setPopupMembers(null);
                            onCloseModal?.();
                            setTimeout(
                              () =>
                                navigate("/client/(gymmate)/profilemate", {
                                  client_id: m.client_id,
                                }),
                              300,
                            );
                          }}
                        >
                          <View style={s.membersRingBorder}>
                            <Image
                              source={
                                m.avatar_url
                                  ? { uri: m.avatar_url }
                                  : MATCH_DEFAULT_AVATAR
                              }
                              style={s.membersRingAvatar}
                            />
                          </View>
                          <Text style={s.membersRingName} numberOfLines={1}>
                            {m.name}
                          </Text>
                        </TouchableOpacity>
                      ))}
                  </ScrollView>
                </View>
              </TouchableWithoutFeedback>
            </View>
          </TouchableWithoutFeedback>
        </Modal>
      )}
    </ScrollView>
  );
};

const ConnectionsModal = ({ visible, onClose, initialTab = 0 }) => {
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState(initialTab);
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [connLoading, setConnLoading] = useState(false);

  const fetchConnections = useCallback(async (tabIndex) => {
    setConnLoading(true);
    try {
      if (tabIndex === 0) {
        const res = await getSessionRequestsReceivedAPI();

        setReceived(res?.status === 200 ? res.data : []);
      } else if (tabIndex === 1) {
        const res = await getSessionRequestsSentAPI();
        setSent(res?.status === 200 ? res.data : []);
      }
    } catch {}
    setConnLoading(false);
  }, []);

  useEffect(() => {
    if (visible) setActiveTab(initialTab);
  }, [visible, initialTab]);

  useEffect(() => {
    if (visible && activeTab < 2) fetchConnections(activeTab);
  }, [visible, activeTab, fetchConnections]);

  const handleTabChange = (i) => {
    setActiveTab(i);
  };

  const list = activeTab === 0 ? received : sent;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="fullScreen"
      statusBarTranslucent={true}
      onRequestClose={onClose}
    >
      <View
        style={{ flex: 1, backgroundColor: "#FFF", paddingTop: insets.top }}
      >
        {/* Header */}
        <View style={s.connModalHeader}>
          <TouchableOpacity
            style={s.connBackBtn}
            activeOpacity={0.7}
            onPress={onClose}
          >
            <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
          </TouchableOpacity>
          <Text style={s.connModalTitle}>Gym Mate Connections</Text>
          <View style={{ width: 38 }} />
        </View>

        {/* Tabs */}
        <View style={s.connTabsRow}>
          {CONN_TABS.map((tab, i) => (
            <TouchableOpacity
              key={tab}
              style={[s.connTab, activeTab === i && s.connTabActive]}
              activeOpacity={0.8}
              onPress={() => handleTabChange(i)}
            >
              <Text
                style={[s.connTabText, activeTab === i && s.connTabTextActive]}
              >
                {tab}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content */}
        {activeTab === 2 ? (
          <MatchesContent onCloseModal={onClose} />
        ) : connLoading ? (
          <View
            style={{ flex: 1, justifyContent: "center", alignItems: "center" }}
          >
            <ActivityIndicator size="large" color="#FF5757" />
          </View>
        ) : list.length === 0 ? (
          <View
            style={{
              flex: 1,
              justifyContent: "center",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Ionicons name="people-outline" size={48} color="#D1D5DB" />
            <Text style={{ fontSize: 13, color: "#9CA3AF" }}>
              {activeTab === 0 ? "No received requests" : "No sent requests"}
            </Text>
          </View>
        ) : (
          <>
            {/* Count label */}
            <View style={s.connCountWrap}>
              <Text style={s.connCountText}>
                Connection {CONN_TABS[activeTab].toLowerCase()} ({list.length})
              </Text>
            </View>

            {/* List */}
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={s.connListContent}
            >
              <View style={s.connListCard}>
                {list.map((item, i) => (
                  <React.Fragment key={item.request_id}>
                    <ConnectionRow
                      item={item}
                      tab={CONN_TABS[activeTab]}
                      onCloseModal={onClose}
                      onRefresh={() => fetchConnections(activeTab)}
                    />
                    {i < list.length - 1 && <View style={s.connDivider} />}
                  </React.Fragment>
                ))}
              </View>
            </ScrollView>
          </>
        )}
      </View>
    </Modal>
  );
};

// ─── Header ───────────────────────────────────────────────────────────────────

const GymMateHeader = ({
  onConnectionsClose,
  notifications,
  openConnections,
  connectionsTab,
}) => {
  const router = useRouter();
  const navigate = useSafeNav();
  const [menuVisible, setMenuVisible] = useState(false);
  const [connectionsVisible, setConnectionsVisible] = useState(false);
  const [connInitialTab, setConnInitialTab] = useState(0);
  const menuBtnRef = useRef(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  // Friend-request label slide animation (like FAB label)
  const frLabelOpacity = useRef(new RNAnimated.Value(0)).current;
  const frLabelTranslateX = useRef(new RNAnimated.Value(30)).current;
  const frLabelAnimRef = useRef(null);
  const hasFriendReqs = notifications?.friend_requests?.has_unread;
  const friendReqCount = notifications?.friend_requests?.count;

  useEffect(() => {
    if (!hasFriendReqs) return;
    frLabelAnimRef.current = RNAnimated.sequence([
      RNAnimated.delay(600),
      RNAnimated.parallel([
        RNAnimated.timing(frLabelTranslateX, {
          toValue: 0,
          duration: 300,
          easing: RNEasing.out(RNEasing.cubic),
          useNativeDriver: true,
        }),
        RNAnimated.timing(frLabelOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      RNAnimated.delay(3000),
      RNAnimated.parallel([
        RNAnimated.timing(frLabelTranslateX, {
          toValue: 30,
          duration: 250,
          easing: RNEasing.in(RNEasing.cubic),
          useNativeDriver: true,
        }),
        RNAnimated.timing(frLabelOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
    ]);
    frLabelAnimRef.current.start();
    return () => frLabelAnimRef.current?.stop();
  }, [hasFriendReqs]);

  useEffect(() => {
    if (openConnections) {
      setConnInitialTab(connectionsTab ?? 2);
      setConnectionsVisible(true);
    }
  }, [openConnections, connectionsTab]);

  const connNotif = notifications?.gym_mate_connections;
  const hasBellDot = connNotif?.has_received || connNotif?.has_match;
  const hasMenuDot =
    notifications?.friend_requests?.has_unread ||
    notifications?.chat?.has_unread;

  const markBucketRead = (bucket) => {
    axiosInstance
      .post("/api/v2/gym_mate/notifications/mark-bucket-read", { bucket })
      .catch(() => {});
  };

  const openMenu = () => {
    menuBtnRef.current?.measureInWindow((x, y, w, h) => {
      setMenuPos({
        top: y + h + 40,
        right: Dimensions.get("window").width - (x + w),
      });
      setMenuVisible(true);
    });
  };

  return (
    <View style={s.header}>
      <ConnectionsModal
        visible={connectionsVisible}
        initialTab={connInitialTab}
        onClose={() => {
          setConnectionsVisible(false);
          onConnectionsClose?.();
        }}
      />
      <View style={s.headerTop}>
        <View style={{ flex: 1, marginRight: 12 }}>
          <Text style={s.welcome}>Gym Mate</Text>
        </View>
        <View style={s.headerIcons}>
          <TouchableOpacity
            style={s.iconBtn}
            activeOpacity={0.7}
            onPress={() => {
              if (connNotif?.has_match) {
                markBucketRead("gym_mate_match");
                setConnInitialTab(2);
              } else if (connNotif?.has_received) {
                markBucketRead("gym_mate_received");
                setConnInitialTab(0);
              } else {
                setConnInitialTab(0);
              }
              setConnectionsVisible(true);
            }}
          >
            <Ionicons name="notifications-outline" size={22} color="#1A1A1A" />
            {hasBellDot && <View style={s.notifDot} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={s.iconBtn}
            activeOpacity={0.7}
            onPress={() => {
              if (notifications?.chat?.has_unread) {
                markBucketRead("chat");
              }
              navigate("/client/(gymmate)/chat");
            }}
          >
            <Ionicons name="chatbubble-outline" size={20} color="#1A1A1A" />
            {notifications?.chat?.has_unread && <View style={s.notifDot} />}
          </TouchableOpacity>
          <TouchableOpacity
            style={s.iconBtn}
            activeOpacity={0.7}
            onPress={() => {
              if (hasFriendReqs) {
                markBucketRead("friend_requests");
              }
              navigate("/client/(gymmate)/requests");
            }}
          >
            <Ionicons name="person-add-outline" size={22} color="#1A1A1A" />
            {hasFriendReqs && <View style={s.notifDot} />}
          </TouchableOpacity>
          <TouchableOpacity
            ref={menuBtnRef}
            style={s.iconBtn}
            activeOpacity={0.7}
            onPress={openMenu}
          >
            <Ionicons name="menu-outline" size={24} color="#1A1A1A" />
          </TouchableOpacity>
        </View>
      </View>
      {hasFriendReqs && (
        <RNAnimated.View
          style={[
            s.frLabel,
            {
              opacity: frLabelOpacity,
              transform: [{ translateX: frLabelTranslateX }],
            },
          ]}
          pointerEvents="none"
        >
          <LinearGradient
            colors={["#00C950", "#00BC7D"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={s.frLabelGradient}
          >
            <Text style={s.frLabelText} numberOfLines={1}>
              {friendReqCount ?? 2} New Friend Requests
            </Text>
          </LinearGradient>
        </RNAnimated.View>
      )}

      {/* Dropdown menu */}
      <Modal
        transparent
        visible={menuVisible}
        animationType="fade"
        onRequestClose={() => setMenuVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setMenuVisible(false)}>
          <View style={StyleSheet.absoluteFill}>
            <TouchableWithoutFeedback>
              <View
                style={[s.dropdown, { top: menuPos.top, right: menuPos.right }]}
              >
                {MENU_ITEMS.map((item, i) => {
                  const showDot =
                    (item.key === "chat" && notifications?.chat?.has_unread) ||
                    (item.key === "requests" &&
                      notifications?.friend_requests?.has_unread);
                  return (
                    <TouchableOpacity
                      key={item.key}
                      style={[
                        s.dropdownItem,
                        i < MENU_ITEMS.length - 1 && s.dropdownItemBorder,
                      ]}
                      activeOpacity={0.7}
                      onPress={() => {
                        setMenuVisible(false);
                        if (
                          item.key === "chat" &&
                          notifications?.chat?.has_unread
                        ) {
                          markBucketRead("chat");
                        }
                        if (
                          item.key === "requests" &&
                          notifications?.friend_requests?.has_unread
                        ) {
                          markBucketRead("friend_requests");
                        }
                        navigate(item.route);
                      }}
                    >
                      <Ionicons name={item.icon} size={18} color="#1A1A1A" />
                      <Text style={s.dropdownLabel}>{item.label}</Text>
                      {showDot && <View style={s.menuItemDot} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </View>
  );
};

// ─── Story Viewer Modal ───────────────────────────────────────────────────────

const STORY_DURATION = 5000; // 5s per story

const StoryViewer = ({
  visible,
  onClose,
  carousel,
  initialClientId,
  myClientId,
}) => {
  const insets = useSafeAreaInsets();
  const navigate = useSafeNav();
  const [authorIdx, setAuthorIdx] = useState(0);
  const [storyIdx, setStoryIdx] = useState(0);
  const [stories, setStories] = useState([]);
  const [author, setAuthor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paused, setPaused] = useState(false);
  const [captionExpanded, setCaptionExpanded] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [blockConfirm, setBlockConfirm] = useState(false);
  const [reportModal, setReportModal] = useState(false);
  const [selectedReason, setSelectedReason] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [isMyStory, setIsMyStory] = useState(false);
  const [reportSuccessModal, setReportSuccessModal] = useState(false);
  const [blockSuccessModal, setBlockSuccessModal] = useState(false);
  const progressAnim = useRef(new RNAnimated.Value(0)).current;
  const animRef = useRef(null);
  const pausedProgress = useRef(0);
  const longPressTimer = useRef(null);
  const didLongPress = useRef(false);

  // Find initial author index
  useEffect(() => {
    if (!visible) return;
    const isMine = initialClientId === myClientId;
    setIsMyStory(isMine);
    if (!isMine) {
      const idx = carousel.findIndex((c) => c.client_id === initialClientId);
      setAuthorIdx(idx >= 0 ? idx : 0);
    }
    setStoryIdx(0);
    setPaused(false);
  }, [visible, initialClientId]);

  // Fetch stories for current author
  useEffect(() => {
    if (!visible) return;
    let active = true;
    const fetchStories = async () => {
      setLoading(true);
      try {
        const clientId = isMyStory
          ? myClientId
          : carousel[authorIdx]?.client_id;
        if (!clientId) {
          onClose();
          return;
        }
        const { data } = await axiosInstance.get(
          `/api/v2/gym_mate/stories/by-client/${clientId}`,
        );
        if (!active) return;
        setAuthor(data.data.client);
        setStories(data.data.stories);
        setStoryIdx(0);
      } catch {
        if (active) onClose();
      } finally {
        if (active) setLoading(false);
      }
    };
    fetchStories();
    return () => {
      active = false;
    };
  }, [visible, authorIdx, carousel, isMyStory]);

  // Auto-progress timer
  const viewedRef = useRef(null);
  useEffect(() => {
    if (!visible || loading || !stories.length) return;
    if (paused) {
      // Save current progress and stop — don't restart
      progressAnim.stopAnimation((value) => {
        pausedProgress.current = value;
      });
      return;
    }
    const startFrom = pausedProgress.current;
    const remaining = STORY_DURATION * (1 - startFrom);
    progressAnim.setValue(startFrom);
    const anim = RNAnimated.timing(progressAnim, {
      toValue: 1,
      duration: remaining,
      useNativeDriver: false,
    });
    animRef.current = anim;
    anim.start(({ finished }) => {
      if (finished) {
        pausedProgress.current = 0;
        goNext();
      }
    });
    // Mark viewed once per story (fire-and-forget)
    const story = stories[storyIdx];
    if (story && viewedRef.current !== story.story_id && !story.is_viewed) {
      viewedRef.current = story.story_id;
      axiosInstance
        .post(`/api/v2/gym_mate/stories/${story.story_id}/view`)
        .catch(() => {});
    }
    return () => {
      anim.stop();
    };
  }, [visible, loading, storyIdx, stories, paused]);

  const goNext = () => {
    pausedProgress.current = 0;
    setCaptionExpanded(false);
    if (storyIdx < stories.length - 1) {
      setStoryIdx((i) => i + 1);
    } else if (!isMyStory && authorIdx < carousel.length - 1) {
      setAuthorIdx((i) => i + 1);
    } else {
      onClose();
    }
  };

  const goPrev = () => {
    pausedProgress.current = 0;
    setCaptionExpanded(false);
    if (storyIdx > 0) {
      setStoryIdx((i) => i - 1);
    } else if (!isMyStory && authorIdx > 0) {
      setAuthorIdx((i) => i - 1);
    }
  };

  const handlePressIn = () => {
    didLongPress.current = false;
    longPressTimer.current = setTimeout(() => {
      didLongPress.current = true;
      setPaused(true);
    }, 200);
  };

  const handlePressOut = (e) => {
    clearTimeout(longPressTimer.current);
    if (didLongPress.current) {
      // Was a long press — just resume, don't navigate
      setPaused(false);
      return;
    }
    // Short tap — navigate
    const tapX = e.nativeEvent.locationX;
    if (tapX < width / 3) {
      goPrev();
    } else {
      goNext();
    }
  };

  if (!visible) return null;

  const currentStory = stories[storyIdx];

  return (
    <Modal
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={sv.container}>
        <StatusBar barStyle="light-content" />
        {loading ? (
          <ActivityIndicator size="large" color="#FFF" />
        ) : (
          <TouchableWithoutFeedback
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
          >
            <View style={sv.storyWrap}>
              {/* Story image */}
              {currentStory && (
                <Image
                  source={{ uri: currentStory.cdn_url }}
                  style={StyleSheet.absoluteFill}
                  resizeMode="contain"
                />
              )}

              {/* Progress bars */}
              <View style={[sv.topOverlay, { paddingTop: 8 + insets.top }]}>
                <View style={sv.progressRow}>
                  {stories.map((_, i) => (
                    <View key={i} style={sv.progressTrack}>
                      <RNAnimated.View
                        style={[
                          sv.progressFill,
                          i < storyIdx
                            ? { width: "100%" }
                            : i === storyIdx
                              ? {
                                  width: progressAnim.interpolate({
                                    inputRange: [0, 1],
                                    outputRange: ["0%", "100%"],
                                  }),
                                }
                              : { width: "0%" },
                        ]}
                      />
                    </View>
                  ))}
                </View>

                {/* Author info + actions */}
                <View style={sv.headerRow}>
                  <View style={sv.authorInfo}>
                    {author?.avatar_url && (
                      <Image
                        source={{ uri: author.avatar_url }}
                        style={sv.authorAvatar}
                      />
                    )}
                    <Text style={sv.authorName}>{author?.name}</Text>
                  </View>
                  <View style={sv.headerActions}>
                    {!isMyStory && (
                      <TouchableOpacity
                        onPress={() => {
                          setMenuOpen(true);
                          setPaused(true);
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons
                          name="ellipsis-vertical"
                          size={22}
                          color="#FFF"
                        />
                      </TouchableOpacity>
                    )}
                    {isMyStory && (
                      <TouchableOpacity
                        onPress={() => {
                          onClose();
                          navigate("/client/(gymmate)/mystory");
                        }}
                        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                      >
                        <Ionicons name="add-circle" size={24} color="#FFF" />
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      onPress={onClose}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="close" size={26} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              {/* Caption */}
              {currentStory?.caption && (
                <View style={sv.captionWrap}>
                  <View style={sv.captionContent}>
                    <Text
                      style={sv.captionText}
                      numberOfLines={captionExpanded ? undefined : 2}
                    >
                      {currentStory.caption}
                    </Text>
                    {!captionExpanded && currentStory.caption.length > 80 && (
                      <TouchableOpacity
                        activeOpacity={0.7}
                        onPress={() => {
                          setCaptionExpanded(true);
                          setPaused(true);
                        }}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <Text style={sv.seeMore}>See more</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              )}
            </View>
          </TouchableWithoutFeedback>
        )}

        {/* ── 3-dot menu sheet ── */}
        <Modal
          visible={menuOpen}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setMenuOpen(false);
            setPaused(false);
          }}
        >
          <TouchableOpacity
            style={sv.menuBackdrop}
            activeOpacity={1}
            onPress={() => {
              setMenuOpen(false);
              setPaused(false);
            }}
          />
          <View style={sv.menuSheet}>
            <TouchableOpacity
              style={sv.menuItem}
              activeOpacity={0.7}
              onPress={() => {
                setMenuOpen(false);
                setReportModal(true);
              }}
            >
              <Ionicons name="flag-outline" size={20} color="#FF5757" />
              <Text style={sv.menuItemText}>Report</Text>
            </TouchableOpacity>
            <View style={sv.menuDivider} />
            <TouchableOpacity
              style={sv.menuItem}
              activeOpacity={0.7}
              onPress={() => {
                setMenuOpen(false);
                setBlockConfirm(true);
              }}
            >
              <Ionicons name="ban-outline" size={20} color="#FF5757" />
              <Text style={sv.menuItemText}>Block</Text>
            </TouchableOpacity>
          </View>
        </Modal>

        {/* ── Block confirmation ── */}
        <Modal
          visible={blockConfirm}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setBlockConfirm(false);
            setPaused(false);
          }}
        >
          <View style={sv.confirmBackdrop}>
            <View style={sv.confirmCard}>
              <View style={sv.confirmIconWrap}>
                <Ionicons name="ban" size={32} color="#FF5757" />
              </View>
              <Text style={sv.confirmTitle}>Block {author?.name}?</Text>
              <Text style={sv.confirmDesc}>
                They won't be able to see your profile, stories, or send you
                messages. You can unblock them anytime from settings.
              </Text>
              <TouchableOpacity
                style={[sv.confirmBlockBtn, actionLoading && { opacity: 0.6 }]}
                activeOpacity={0.85}
                disabled={actionLoading}
                onPress={async () => {
                  setActionLoading(true);
                  try {
                    const res = await blockGymMateUserAPI(author?.client_id);
                    setBlockConfirm(false);
                    if (res?.status === 200) {
                      setBlockSuccessModal(true);
                    } else {
                      setPaused(false);
                    }
                  } catch {
                    setBlockConfirm(false);
                    setPaused(false);
                  } finally {
                    setActionLoading(false);
                  }
                }}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={sv.confirmBlockBtnText}>Block</Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={sv.confirmCancelBtn}
                activeOpacity={0.7}
                onPress={() => {
                  setBlockConfirm(false);
                  setPaused(false);
                }}
              >
                <Text style={sv.confirmCancelText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── Report modal ── */}
        <Modal
          visible={reportModal}
          transparent
          animationType="slide"
          onRequestClose={() => {
            setReportModal(false);
            setSelectedReason(null);
            setPaused(false);
          }}
        >
          <View style={sv.reportBackdrop}>
            <View style={sv.reportCard}>
              <View style={sv.reportHeader}>
                <Text style={sv.reportTitle}>Report Story</Text>
                <TouchableOpacity
                  onPress={() => {
                    setReportModal(false);
                    setSelectedReason(null);
                    setPaused(false);
                  }}
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="close" size={22} color="#666" />
                </TouchableOpacity>
              </View>
              <Text style={sv.reportSubtitle}>
                Why are you reporting this story?
              </Text>
              {[
                "Inappropriate or offensive content",
                "Spam or misleading",
                "Harassment or bullying",
                "Violence or dangerous acts",
                "False information",
                "Suicide or self-injury",
                "Scams or fraud",
                "Nudity & Sexual Content",
                "Intellectual Property Infringement",
                "Promoting Restricted Items",
              ].map((reason) => (
                <TouchableOpacity
                  key={reason}
                  style={[
                    sv.reportOption,
                    selectedReason === reason && sv.reportOptionSelected,
                  ]}
                  activeOpacity={0.7}
                  onPress={() => setSelectedReason(reason)}
                >
                  <View
                    style={[
                      sv.reportRadio,
                      selectedReason === reason && sv.reportRadioSelected,
                    ]}
                  >
                    {selectedReason === reason && (
                      <View style={sv.reportRadioDot} />
                    )}
                  </View>
                  <Text
                    style={[
                      sv.reportOptionText,
                      selectedReason === reason && sv.reportOptionTextSelected,
                    ]}
                  >
                    {reason}
                  </Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={[
                  sv.reportSubmitBtn,
                  (!selectedReason || actionLoading) && { opacity: 0.5 },
                ]}
                activeOpacity={0.85}
                disabled={!selectedReason || actionLoading}
                onPress={async () => {
                  setActionLoading(true);
                  try {
                    const res = await reportGymMateEntityAPI({
                      entity_type: "story",
                      entity_id: currentStory?.story_id,
                      reason:
                        REPORT_REASON_MAP[selectedReason] ||
                        "inappropriate_content",
                    });
                    setActionLoading(false);
                    setReportModal(false);
                    setSelectedReason(null);
                    if (res?.status === 200) {
                      setReportSuccessModal(true);
                    } else {
                      setPaused(false);
                    }
                  } catch {
                    setActionLoading(false);
                    setReportModal(false);
                    setSelectedReason(null);
                    setPaused(false);
                  }
                }}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#FFF" size="small" />
                ) : (
                  <Text style={sv.reportSubmitText}>Submit Report</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── Report success modal ── */}
        <Modal
          visible={reportSuccessModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setReportSuccessModal(false);
            setPaused(false);
            onClose();
          }}
        >
          <View style={sv.confirmBackdrop}>
            <View style={sv.confirmCard}>
              <View
                style={[sv.confirmIconWrap, { backgroundColor: "#F0FFF4" }]}
              >
                <Ionicons name="checkmark-circle" size={32} color="#22C55E" />
              </View>
              <Text style={sv.confirmTitle}>Report Submitted</Text>
              <Text style={sv.confirmDesc}>
                Thank you for letting us know. Our team will review this report
                and take appropriate action.
              </Text>
              <TouchableOpacity
                style={sv.confirmBlockBtn}
                activeOpacity={0.85}
                onPress={async () => {
                  setReportSuccessModal(false);
                  setActionLoading(true);
                  try {
                    await blockGymMateUserAPI(author?.client_id);
                  } catch {}
                  setActionLoading(false);
                  setPaused(false);
                  onClose();
                }}
              >
                <Text style={sv.confirmBlockBtnText}>
                  Block {author?.name ?? "User"}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={sv.confirmCancelBtn}
                activeOpacity={0.7}
                onPress={() => {
                  setReportSuccessModal(false);
                  setPaused(false);
                  onClose();
                }}
              >
                <Text style={sv.confirmCancelText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>

        {/* ── Block success modal ── */}
        <Modal
          visible={blockSuccessModal}
          transparent
          animationType="fade"
          onRequestClose={() => {
            setBlockSuccessModal(false);
            setPaused(false);
            onClose();
          }}
        >
          <View style={sv.confirmBackdrop}>
            <View style={sv.confirmCard}>
              <View
                style={[sv.confirmIconWrap, { backgroundColor: "#F0FFF4" }]}
              >
                <Ionicons name="checkmark-circle" size={32} color="#22C55E" />
              </View>
              <Text style={sv.confirmTitle}>User Blocked</Text>
              <Text style={sv.confirmDesc}>
                {author?.name ?? "This user"} has been blocked. They won't be
                able to see your profile or send you messages.
              </Text>
              <TouchableOpacity
                style={[sv.confirmBlockBtn, { backgroundColor: "#1A1A1A" }]}
                activeOpacity={0.85}
                onPress={() => {
                  setBlockSuccessModal(false);
                  setPaused(false);
                  onClose();
                }}
              >
                <Text style={sv.confirmBlockBtnText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </Modal>
  );
};

const sv = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
    justifyContent: "center",
    alignItems: "center",
  },
  storyWrap: {
    flex: 1,
    width: "100%",
  },
  topOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 12,
    paddingTop: 8,
  },
  progressRow: {
    flexDirection: "row",
    gap: 4,
  },
  progressTrack: {
    flex: 1,
    height: 2.5,
    backgroundColor: "rgba(255,255,255,0.35)",
    borderRadius: 2,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    backgroundColor: "#FFF",
    borderRadius: 2,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 12,
    paddingHorizontal: 4,
  },
  authorInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  authorAvatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
  authorName: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "700",
  },
  captionWrap: {
    position: "absolute",
    bottom: 60,
    left: 0,
    right: 0,
  },
  captionContent: {
    backgroundColor: "rgba(0,0,0,0.55)",
    paddingHorizontal: 20,
    paddingVertical: 12,
    alignItems: "center",
  },
  captionText: {
    color: "#FFF",
    fontSize: 15,
    fontWeight: "500",
    textAlign: "center",
    lineHeight: 22,
  },
  seeMore: {
    color: "rgba(255,255,255,0.7)",
    fontSize: 13,
    fontWeight: "600",
    marginTop: 4,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  // 3-dot menu
  menuBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  menuSheet: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 40,
  },
  menuItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 16,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  menuDivider: {
    height: 1,
    backgroundColor: "#F0F0F0",
  },

  // Block confirmation
  confirmBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  confirmCard: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    width: "100%",
  },
  confirmIconWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: "#FFF0F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 10,
  },
  confirmDesc: {
    fontSize: 14,
    color: "#666",
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 24,
  },
  confirmBlockBtn: {
    backgroundColor: "#FF5757",
    borderRadius: 12,
    height: 48,
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 10,
  },
  confirmBlockBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
  confirmCancelBtn: {
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmCancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#888",
  },

  // Report modal
  reportBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "flex-end",
  },
  reportCard: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 40,
  },
  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 6,
  },
  reportTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  reportSubtitle: {
    fontSize: 14,
    color: "#888",
    marginBottom: 16,
  },
  reportOption: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    marginBottom: 4,
  },
  reportOptionSelected: {
    backgroundColor: "#FFF0F0",
  },
  reportRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: "#D0D0D0",
    alignItems: "center",
    justifyContent: "center",
  },
  reportRadioSelected: {
    borderColor: "#FF5757",
  },
  reportRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: "#FF5757",
  },
  reportOptionText: {
    fontSize: 15,
    color: "#333",
    flex: 1,
  },
  reportOptionTextSelected: {
    color: "#FF5757",
    fontWeight: "600",
  },
  reportSubmitBtn: {
    backgroundColor: "#FF5757",
    borderRadius: 12,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  reportSubmitText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },
});

// ─── Stories ──────────────────────────────────────────────────────────────────

const Stories = ({ storiesData, onStoriesRefresh }) => {
  const navigate = useSafeNav();
  const [viewerVisible, setViewerVisible] = useState(false);
  const [viewerClientId, setViewerClientId] = useState(null);

  const myStory = storiesData?.my_story;

  const carousel = storiesData?.carousel || [];

  const openViewer = (clientId) => {
    setViewerClientId(clientId);
    setViewerVisible(true);
  };

  return (
    <View style={s.sectionBlock}>
      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={s.storiesRow}
      >
        {/* My Story slot — always first */}
        <TouchableOpacity
          style={s.storyItem}
          onPress={() =>
            myStory?.has_active
              ? openViewer(myStory.client_id)
              : navigate("/client/(gymmate)/mystory")
          }
          activeOpacity={0.8}
        >
          <View style={myStory?.has_active ? s.storyRingActive : s.myStoryRing}>
            {myStory?.has_active ? (
              myStory?.avatar_url ? (
                <Image
                  source={{ uri: myStory.avatar_url }}
                  style={s.myStoryAvatar}
                />
              ) : (
                <View style={s.myStoryAddWrap}>
                  <Ionicons name="person" size={28} color="#FF5757" />
                </View>
              )
            ) : (
              <View style={s.myStoryAddWrap}>
                <Ionicons name="camera" size={28} color="#FF5757" />
              </View>
            )}
          </View>
          <Text style={s.storyName}>My Story</Text>
        </TouchableOpacity>

        {/* Carousel — other users' stories */}
        {carousel.map((item) => (
          <TouchableOpacity
            key={String(item.client_id)}
            style={s.storyItem}
            activeOpacity={0.8}
            onPress={() => openViewer(item.client_id)}
          >
            <View style={item.all_viewed ? s.storyRingViewed : s.storyRing}>
              <Image source={{ uri: item.avatar_url }} style={s.storyAvatar} />
            </View>
            <Text style={s.storyName} numberOfLines={1}>
              {item.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <StoryViewer
        visible={viewerVisible}
        onClose={() => {
          setViewerVisible(false);
          onStoriesRefresh?.();
        }}
        carousel={carousel}
        initialClientId={viewerClientId}
        myClientId={myStory?.client_id}
      />
    </View>
  );
};

// ─── Gym Mates Carousel ───────────────────────────────────────────────────────

const MateCard = ({ mate }) => {
  const navigate = useSafeNav();
  const [requestSent, setRequestSent] = useState(!!mate?.pending_request_id);
  const [sending, setSending] = useState(false);

  if (!mate) return null;

  const handleJoin = async (e) => {
    e.stopPropagation();
    if (requestSent || sending) return;
    setSending(true);
    try {
      const res = await sendSessionRequestAPI(mate.session_id);
      if (res?.status === 200 || res?.status === 201) {
        setRequestSent(true);
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
      style={s.mateCard}
      activeOpacity={0.95}
      onPress={() => navigate("/client/(gymmate)/allmates")}
    >
      <Image
        source={
          mate.host_avatar_url
            ? { uri: mate.host_avatar_url }
            : require("../../assets/images/gym_mate/mate1.webp")
        }
        style={s.mateImage}
        resizeMode="cover"
      />
      {/* Daily Pass badge — top right (only if booked) */}
      {mate.dailypass_booked && (
        <View style={s.dailyPassBadge}>
          <Text style={s.dailyPassBadgeText}>Daily Pass</Text>
        </View>
      )}
      {/* Overlay info */}
      <LinearGradient
        colors={["transparent", "rgba(0,0,0,1)"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={s.mateOverlay}
      >
        <Text style={s.mateName}>{mate.host_name}</Text>
        <View style={s.mateInfoRow}>
          <Ionicons name="location-outline" size={13} color="#fff" />
          <Text style={s.mateInfoText}>
            {mate.gym_name}
            {mate.gym_area ? ` • ${mate.gym_area}` : ""}{" "}
            {mate.distance_km != null ? `• ${mate.distance_km} km` : ""}
          </Text>
        </View>
        <View style={s.mateInfoRow}>
          <Ionicons name="time-outline" size={13} color="#fff" />
          <Text style={s.mateInfoText}>
            {formatSessionDateTime(mate.session_date, mate.session_time)}
          </Text>
        </View>
        <TouchableOpacity
          style={[s.joinBtn, requestSent && s.joinBtnSent]}
          activeOpacity={0.85}
          onPress={handleJoin}
          disabled={requestSent || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : requestSent ? (
            <View
              style={{ flexDirection: "row", alignItems: "center", gap: 5 }}
            >
              <Ionicons name="checkmark-circle" size={14} color="#FFF" />
              <Text style={s.joinBtnText}>Request Sent</Text>
            </View>
          ) : (
            <Text style={s.joinBtnText}>Join Workout</Text>
          )}
        </TouchableOpacity>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const CARD_W = width - 48;
const SWIPE_THRESHOLD = width * 0.2;

const SwipeableDeck = ({ items }) => {
  const [index, setIndex] = useState(0);
  const offsetX = useSharedValue(0);

  useFocusEffect(
    useCallback(() => {
      setIndex(0);
      offsetX.value = 0;
    }, [items]),
  );

  const advanceIndex = () => setIndex((i) => i + 1);

  const pan = Gesture.Pan()
    .activeOffsetX([-15, 15])
    .failOffsetY([-5, 5])
    .onUpdate((e) => {
      offsetX.value = e.translationX;
    })
    .onEnd((e) => {
      if (e.translationX < -SWIPE_THRESHOLD && index < items.length - 1) {
        offsetX.value = withTiming(-width * 1.2, { duration: 220 }, (done) => {
          if (done) {
            runOnJS(advanceIndex)();
            offsetX.value = 0;
          }
        });
      } else {
        offsetX.value = withSpring(0, { damping: 20, stiffness: 200 });
      }
    });

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: offsetX.value }],
  }));

  const current = items[index];
  const next = index < items.length - 1 ? items[index + 1] : null;

  if (!current) return null;

  return (
    <View style={s.deckContainer}>
      {next && (
        <View style={s.backCard}>
          <MateCard mate={next} />
        </View>
      )}
      <GestureDetector gesture={pan}>
        <Animated.View style={[s.frontCard, animStyle]}>
          <MateCard mate={current} />
        </Animated.View>
      </GestureDetector>
    </View>
  );
};

const GymMatesSection = ({ nearbyGymMates }) => {
  const navigate = useSafeNav();
  if (!nearbyGymMates || nearbyGymMates.length === 0) return null;
  return (
    <View style={s.sectionBlock}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Find Gym Mate Near You</Text>
        <TouchableOpacity
          style={s.viewAllRow}
          activeOpacity={0.7}
          onPress={() => navigate("/client/(gymmate)/allmates")}
        >
          <Text style={s.viewAll}>View all</Text>
          <Ionicons name="chevron-forward" size={13} color="#FF5757" />
        </TouchableOpacity>
      </View>
      <Text style={s.sectionSub}>
        Discover nearby gym mates who match your fitness vibe.
      </Text>
      <SwipeableDeck key={nearbyGymMates.length} items={nearbyGymMates} />
    </View>
  );
};

// ─── New Requests Banner + Gym Mate Ready ─────────────────────────────────────

const NewMatchSection = ({ sessionsData, onConnectionsClose }) => {
  const navigate = useSafeNav();
  const { openGroup, loading: chatLoading } = useOpenChat();
  const [connectionsVisible, setConnectionsVisible] = useState(false);
  const [connInitialTab, setConnInitialTab] = useState(0);

  const connectScale = useSharedValue(1);
  useEffect(() => {
    connectScale.value = withRepeat(
      withSequence(
        withTiming(1.15, { duration: 600, easing: Easing.inOut(Easing.ease) }),
        withTiming(1, { duration: 600, easing: Easing.inOut(Easing.ease) }),
      ),
      -1,
      false,
    );
  }, []);
  const connectAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: connectScale.value }],
  }));

  const receivedRequests = sessionsData?.received_requests;

  const host = sessionsData?.host;
  const match = sessionsData?.match;

  const hasContent = receivedRequests || match;

  return (
    <View style={hasContent ? s.newMatchWrap : undefined}>
      <ConnectionsModal
        visible={connectionsVisible}
        initialTab={connInitialTab}
        onClose={() => {
          setConnectionsVisible(false);
          onConnectionsClose?.();
        }}
      />

      {/* Card 1 — requests banner (hide if no received_requests) */}
      {receivedRequests && (
        <TouchableOpacity
          style={s.requestsBanner}
          activeOpacity={0.85}
          onPress={() => {
            setConnInitialTab(0);
            setConnectionsVisible(true);
          }}
        >
          <View style={s.requestsAvatarStack}>
            {(receivedRequests.recent_avatars ?? [])
              .slice(0, 3)
              .map((uri, i) =>
                uri ? (
                  <Image
                    key={i}
                    source={{ uri }}
                    style={[
                      s.requestsAvatar,
                      { marginLeft: i === 0 ? 0 : -10 },
                    ]}
                  />
                ) : (
                  <View
                    key={i}
                    style={[
                      s.requestsAvatar,
                      {
                        marginLeft: i === 0 ? 0 : -10,
                        backgroundColor: "#E5E7EB",
                        alignItems: "center",
                        justifyContent: "center",
                      },
                    ]}
                  >
                    <Ionicons name="person" size={16} color="#9CA3AF" />
                  </View>
                ),
              )}
          </View>
          <View style={{ flex: 1, marginLeft: 10 }}>
            <Text style={s.requestsBannerTitle}>
              You Got{" "}
              <Text style={s.requestsBannerCount}>
                {receivedRequests.pending_count} New Requests
              </Text>
            </Text>
            <Text style={s.requestsBannerSub}>
              for your upcoming workout session
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color="#1A1A1A" />
        </TouchableOpacity>
      )}

      {/* Card 2 — Your Gym Mate is Ready (hide if no match) */}
      {match && (
        <View style={s.mateReadyCard}>
          <LinearGradient
            colors={["rgba(0,201,80,0.08)", "rgba(0,188,125,0.05)"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={StyleSheet.absoluteFill}
            pointerEvents="none"
          />
          <Text style={s.mateReadyTitle}>Your Gym mate is Ready</Text>

          {/* Avatar row — host on left, match on right */}
          <View style={s.mateReadyAvatarRow}>
            <View style={s.mateReadyAvatarRing}>
              {host?.avatar_url ? (
                <Image
                  source={{ uri: host.avatar_url }}
                  style={s.mateReadyAvatar}
                />
              ) : (
                <View
                  style={[
                    s.mateReadyAvatar,
                    {
                      backgroundColor: "#E5E7EB",
                      alignItems: "center",
                      justifyContent: "center",
                    },
                  ]}
                >
                  <Ionicons name="person" size={32} color="#9CA3AF" />
                </View>
              )}
            </View>

            <View style={s.mateReadyCenter}>
              <View style={s.mateReadyDots}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={s.mateReadyDot} />
                ))}
              </View>
              {/* <LinearGradient
                colors={["#00C950", "#00BC7D"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.mateReadyIconGrad}
              > */}
              <Animated.Image
                source={require("../../assets/images/gym_mate/connect.webp")}
                style={[s.mateReadyIcon, connectAnimStyle]}
              />
              {/* </LinearGradient> */}
              <View style={s.mateReadyDots}>
                {[0, 1, 2].map((i) => (
                  <View key={i} style={s.mateReadyDot} />
                ))}
              </View>
            </View>

            <TouchableOpacity
              activeOpacity={0.7}
              onPress={() =>
                navigate("/client/(gymmate)/profilemate", {
                  client_id: match.client_id,
                })
              }
            >
              <View style={s.mateReadyAvatarRing}>
                {match.avatar_url ? (
                  <Image
                    source={{ uri: match.avatar_url }}
                    style={s.mateReadyAvatar}
                  />
                ) : (
                  <View
                    style={[
                      s.mateReadyAvatar,
                      {
                        backgroundColor: "#E5E7EB",
                        alignItems: "center",
                        justifyContent: "center",
                      },
                    ]}
                  >
                    <Ionicons name="person" size={32} color="#9CA3AF" />
                  </View>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Match name */}
          <Text style={s.mateReadyDesc}>
            <Text style={s.mateReadyName}>{match.name} </Text>
            <Text style={s.mateReadyDescGray}>
              is ready to train with you. plan your workout together.
            </Text>
          </Text>

          {/* Plan Workout button → opens (or creates) the session_group room
              for this match's session and navigates with a real room_id so
              send/receive actually works. */}
          <TouchableOpacity
            style={s.planWorkoutBtnWrap}
            activeOpacity={0.88}
            disabled={chatLoading}
            onPress={() => {
              if (chatLoading) return;
              if (match?.session_id) {
                openGroup(match.session_id);
              }
            }}
          >
            <LinearGradient
              colors={["#00C950", "#00BC7D"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={s.planWorkoutBtn}
            >
              <Ionicons name="chatbubble-ellipses" size={16} color="#FFF" />
              <Text style={s.planWorkoutBtnText}>Chat & Plan Workout</Text>
            </LinearGradient>
          </TouchableOpacity>

          {/* View all Matches */}
          <TouchableOpacity
            activeOpacity={0.7}
            style={s.startChatRow}
            onPress={() => {
              setConnInitialTab(2);
              setConnectionsVisible(true);
            }}
          >
            <Ionicons name="people" size={14} color="#00BC7D" />
            <Text style={s.startChatText}>View all Matches</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

// ─── Daily Pass ───────────────────────────────────────────────────────────────

const DP_DATA = [
  {
    name: "FitZone Elite",
    area: "Koramangala",
    distance: "1.1 km",
    price: "1299",
  },
  {
    name: "Iron House Gym",
    area: "Indiranagar",
    distance: "2.3 km",
    price: "999",
  },
  {
    name: "Cult Fit Pro",
    area: "HSR Layout",
    distance: "3.0 km",
    price: "1499",
  },
];

const DailyPassCard = ({ gym, onPress }) => (
  <TouchableOpacity
    style={s.dpCardShadow}
    activeOpacity={0.88}
    onPress={onPress}
  >
    <View style={s.dpCard}>
      {/* Image */}
      <View style={s.dpImageWrap}>
        <Image
          source={
            gym.cover_pic
              ? { uri: gym.cover_pic }
              : require("../../assets/images/gym_mate/gym.webp")
          }
          style={s.dpImage}
          resizeMode="cover"
        />
        <View style={s.dpImageCurve} />
      </View>

      {/* Info row */}
      <View style={s.dpInfo}>
        <View>
          <Text style={s.dpName} numberOfLines={1} ellipsizeMode="tail">
            {gym.gym_name?.length > 18
              ? gym.gym_name.slice(0, 18) + "…"
              : gym.gym_name}
          </Text>
          <View style={s.dpLocRow}>
            <Ionicons name="location-outline" size={11} color="#4A5565" />
            <Text style={s.dpLocText}>
              {gym.gym_area} • {gym.distance_km} km
            </Text>
          </View>
        </View>
        <View style={s.dpPriceBadge}>
          <Text style={s.dpPriceRupee}>₹</Text>
          <Text style={s.dpPriceAmount}>{gym.dailypass_price}</Text>
          <Text style={s.dpPriceUnit}>/day</Text>
        </View>
      </View>

      {/* Footer */}
      <LinearGradient
        colors={["#E19448", "#FFFFFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={s.dpFooter}
      >
        <Text style={s.dpFooterText}>Drop in anytime. No commitment.</Text>
      </LinearGradient>
    </View>
  </TouchableOpacity>
);

// ─── Create Session CTA (FOMO banner) ─────────────────────────────────────────

const CreateSessionCTA = ({ sessionsData, nearbyGymMates }) => {
  const router = useRouter();

  const hasSession =
    sessionsData?.future_count ||
    sessionsData?.received_requests ||
    sessionsData?.match;
  const hasNearby = nearbyGymMates && nearbyGymMates.length > 0;

  if (hasSession || hasNearby) return null;

  return (
    <View style={s.ctaBlock}>
      <LinearGradient
        colors={["#FFF5F0", "#FFFFFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
        pointerEvents="none"
      />

      <Text style={s.ctaTitle}>Create Your Gym Mate Session</Text>
      <Text style={s.ctaSub}>
        People near you are already finding workout partners. Don't train alone,
        set up a session and get matched with someone who shares your fitness
        goals.
      </Text>

      <TouchableOpacity
        style={s.ctaButton}
        activeOpacity={0.85}
        onPress={() => router.push("/client/(gymmate)/selectdate")}
      >
        <Ionicons name="add-circle-outline" size={18} color="#FFF" />
        <Text style={s.ctaButtonText}>Create Session Now</Text>
      </TouchableOpacity>

      <Text style={s.ctaFootnote}>It only takes 30 seconds</Text>
    </View>
  );
};

const DailyPassSection = ({ nearbyGyms }) => {
  const navigate = useSafeNav();
  const router = useRouter();
  if (!nearbyGyms || nearbyGyms.length === 0) return null;
  return (
    <View style={[s.sectionBlock, { paddingBottom: 24 }]}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Find Daily Pass Near You</Text>
        <TouchableOpacity
          style={s.viewAllRow}
          activeOpacity={0.7}
          onPress={() => navigate("/client/(dailypass)/listgyms")}
        >
          <Text style={s.viewAll}>View all</Text>
          <Ionicons name="chevron-forward" size={13} color="#FF5757" />
        </TouchableOpacity>
      </View>
      <Text style={s.sectionSub}>Drop in at a Gym Mate, train together</Text>

      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 12, paddingVertical: 6, paddingRight: 4 }}
      >
        {nearbyGyms.map((gym) => (
          <DailyPassCard
            key={gym.sno}
            gym={gym}
            onPress={() =>
              router.push({
                pathname: "/client/(dailypass)/passDateSelection",
                params: { gymId: gym.gym_id },
              })
            }
          />
        ))}
      </ScrollView>
    </View>
  );
};

// ─── Friends / Connect ────────────────────────────────────────────────────────

const FriendCard = ({
  client_id,
  name,
  avatar_url,
  details,
  suggestion_type,
  match_percentage,
  mutual_count,
  onSent,
  bio,
}) => {
  const navigate = useSafeNav();
  const [sent, setSent] = useState(false);
  const [sending, setSending] = useState(false);

  const handleConnect = async (e) => {
    e.stopPropagation();
    if (sending || sent) return;
    setSending(true);
    try {
      const { data } = await axiosInstance.post(
        "/api/v2/gym_mate/friends/requests",
        { to_client_id: client_id },
      );
      if (data.status === 200) {
        setSent(true);
        setTimeout(() => onSent?.(client_id), 600);
      }
    } catch {
      // silently fail
    } finally {
      setSending(false);
    }
  };

  return (
    <TouchableOpacity
      style={s.friendCard}
      activeOpacity={0.95}
      onPress={() => navigate("/client/(gymmate)/profilemate", { client_id })}
    >
      {/* Badge top-left: match % or mutual count */}

      {/* Circular avatar */}
      <View style={s.friendAvatarWrap}>
        <Image
          source={
            avatar_url
              ? { uri: avatar_url }
              : require("../../assets/images/defaultavatar.webp")
          }
          style={s.friendAvatar}
          resizeMode="cover"
        />
      </View>

      <Text style={s.friendName}>{name}</Text>
      <Text style={s.friendBio} numberOfLines={1} ellipsizeMode="tail">
        {bio || "Looking for a gym mate on Fymble!"}
      </Text>
      {match_percentage === null && mutual_count === null && (
        <View style={s.matchBadge}>
          <Text style={s.matchText}>{match_percentage}Suggested for you</Text>
        </View>
      )}
      {suggestion_type === "match" && match_percentage != null && (
        <View style={s.matchBadge}>
          <Text style={s.matchText}>{match_percentage}% match</Text>
        </View>
      )}
      {suggestion_type === "mutual" && mutual_count != null && (
        <View style={[s.matchBadge]}>
          <Text style={s.matchText}>
            {mutual_count} mutual friend{mutual_count !== 1 ? "s" : ""}
          </Text>
        </View>
      )}

      {details?.length > 0 && (
        <View style={s.tagRow}>
          {details.slice(0, 2).map((t) => (
            <View key={t} style={s.tag}>
              <Text style={s.tagText}>{t}</Text>
            </View>
          ))}
        </View>
      )}

      {sent ? (
        <View style={[s.connectBtn, { backgroundColor: "#4CAF50" }]}>
          <Ionicons name="checkmark-circle" size={16} color="#FFF" />
          <Text style={s.connectBtnText}>Request Sent</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={s.connectBtn}
          activeOpacity={0.85}
          disabled={sending}
          onPress={handleConnect}
        >
          {sending ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons name="person-add" size={16} color="#FFF" />
              <Text style={s.connectBtnText}>Add Friend</Text>
            </>
          )}
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

const FRIEND_CARD_W = 240;
const FRIEND_CARD_GAP = 12;

const FriendsSection = ({ friendSuggestions, onSent }) => {
  const navigate = useSafeNav();
  const [activeIndex, setActiveIndex] = useState(0);

  if (!friendSuggestions?.length) return null;

  const handleScroll = (e) => {
    const offsetX = e.nativeEvent.contentOffset.x;
    const idx = Math.round(offsetX / (FRIEND_CARD_W + FRIEND_CARD_GAP));
    if (idx !== activeIndex && idx >= 0 && idx < friendSuggestions.length) {
      setActiveIndex(idx);
    }
  };

  return (
    <View style={[s.sectionBlock]}>
      <View style={s.sectionHeader}>
        <Text style={s.sectionTitle}>Find New Friends</Text>
        <TouchableOpacity
          style={s.viewAllRow}
          activeOpacity={0.7}
          onPress={() => navigate("/client/(gymmate)/friends")}
        >
          <Text style={s.viewAll}>View all</Text>
          <Ionicons name="chevron-forward" size={13} color="#FF5757" />
        </TouchableOpacity>
      </View>
      <Text style={s.sectionSub}>
        Meet new people and make fitness more social.
      </Text>

      <ScrollView
        horizontal
        nestedScrollEnabled
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: FRIEND_CARD_GAP, paddingBottom: 4 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {friendSuggestions.map((f) => (
          <FriendCard key={f.sno} {...f} onSent={onSent} />
        ))}
      </ScrollView>

      {friendSuggestions.length > 1 && (
        <View style={s.matchCarouselDots}>
          {friendSuggestions.map((_, i) => (
            <View
              key={i}
              style={[
                s.matchCarouselDot,
                i === activeIndex && s.matchCarouselDotActive,
              ]}
            />
          ))}
        </View>
      )}
    </View>
  );
};

// ─── Active Session Banner ────────────────────────────────────────────────────

function LiveDot() {
  const opacity = useSharedValue(1);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(0.15, { duration: 700 }),
        withTiming(1, { duration: 700 }),
      ),
      -1,
      false,
    );
  }, []);

  const dotStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));

  return <Animated.View style={[s.liveDotCore, dotStyle]} />;
}

const ActiveSessionBanner = ({ futureCount }) => {
  const navigate = useSafeNav();
  if (!futureCount) return null;
  return (
    <TouchableOpacity
      style={s.activeBanner}
      activeOpacity={0.85}
      onPress={() => navigate("/client/(gymmate)/myrequests")}
    >
      <LiveDot />
      <Text style={s.activeBannerText}>
        You have <Text style={s.activeBannerCount}>{futureCount} active</Text>{" "}
        Gym Mate session{futureCount > 1 ? "s" : ""}
      </Text>
      <Ionicons name="chevron-forward" size={16} color="#101828" />
    </TouchableOpacity>
  );
};

const ActiveRequestSection = ({ futureCount }) => {
  if (!futureCount) return null;
  return (
    <View style={s.activeBannerWrap}>
      <ActiveSessionBanner futureCount={futureCount} />
    </View>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const GymMateMain = ({ openConnections, connectionsTab }) => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [storiesData, setStoriesData] = useState(null);
  const [sessionsData, setSessionsData] = useState(null);
  const [nearbyGymMates, setNearbyGymMates] = useState([]);
  const [nearbyGyms, setNearbyGyms] = useState([]);
  const [friendSuggestions, setFriendSuggestions] = useState([]);
  const [notifications, setNotifications] = useState(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // FAB animations
  const fabScale = useRef(new RNAnimated.Value(0)).current;
  const fabPulse = useRef(new RNAnimated.Value(1)).current;
  const fabLabelOpacity = useRef(new RNAnimated.Value(0)).current;
  const fabLabelTranslateX = useRef(new RNAnimated.Value(30)).current;
  const fabLabelAnimRef = useRef(null);
  const fabPulseRef = useRef(null);

  useEffect(() => {
    // FAB pops in with spring, then starts gentle pulse
    RNAnimated.spring(fabScale, {
      toValue: 1,
      tension: 180,
      friction: 8,
      useNativeDriver: true,
    }).start(() => {
      fabPulseRef.current = RNAnimated.loop(
        RNAnimated.sequence([
          RNAnimated.timing(fabPulse, {
            toValue: 1.15,
            duration: 800,
            easing: RNEasing.inOut(RNEasing.ease),
            useNativeDriver: true,
          }),
          RNAnimated.timing(fabPulse, {
            toValue: 1,
            duration: 800,
            easing: RNEasing.inOut(RNEasing.ease),
            useNativeDriver: true,
          }),
        ]),
      );
      fabPulseRef.current.start();
    });

    // Label slides in after FAB appears
    fabLabelAnimRef.current = RNAnimated.sequence([
      RNAnimated.delay(800),
      RNAnimated.parallel([
        RNAnimated.timing(fabLabelTranslateX, {
          toValue: 0,
          duration: 300,
          easing: RNEasing.out(RNEasing.cubic),
          useNativeDriver: true,
        }),
        RNAnimated.timing(fabLabelOpacity, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
      ]),
      RNAnimated.delay(2500),
      RNAnimated.parallel([
        RNAnimated.timing(fabLabelTranslateX, {
          toValue: 30,
          duration: 250,
          easing: RNEasing.in(RNEasing.cubic),
          useNativeDriver: true,
        }),
        RNAnimated.timing(fabLabelOpacity, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }),
      ]),
    ]);
    fabLabelAnimRef.current.start();
    return () => {
      fabLabelAnimRef.current?.stop();
      fabPulseRef.current?.stop();
    };
  }, []);

  const fetchHome = useCallback(async () => {
    try {
      const coords = await getCachedLocation();
      const { data } = await axiosInstance.get("/api/v2/gym_mate/home", {
        params: {
          lat: coords?.lat ?? null,
          lng: coords?.lng ?? null,
        },
      });

      if (data.status === 200) {
        setStoriesData(data.data.stories);
        setSessionsData(data.data.sessions ?? null);

        setNearbyGymMates(data.data?.nearby_gym_mates ?? []);
        setNearbyGyms(data.data?.nearby_gyms ?? []);
        setFriendSuggestions(data.data?.friend_suggestions ?? []);
        setNotifications(data.data?.notifications ?? null);
      } else {
        setStoriesData(null);
        setSessionsData(null);
        setNearbyGymMates([]);
        setNearbyGyms([]);
        setFriendSuggestions([]);
        setNotifications(null);
      }
    } catch {
      setStoriesData(null);
      setSessionsData(null);
      setNearbyGymMates([]);
      setNearbyGyms([]);
      setFriendSuggestions([]);
      setNotifications(null);
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on every tab focus
  useFocusEffect(
    useCallback(() => {
      fetchHome();
    }, [fetchHome]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await fetchHome();
    setRefreshing(false);
  }, [fetchHome]);

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <View style={{ backgroundColor: "#FFF", paddingTop: insets.top }}>
        <GymMateHeader
          onConnectionsClose={fetchHome}
          notifications={notifications}
          openConnections={openConnections}
          connectionsTab={connectionsTab}
        />
      </View>
      {loading ? (
        <View style={s.loaderWrap}>
          <ActivityIndicator size="large" color="#FF5757" />
        </View>
      ) : (
        <RNAnimated.ScrollView
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={["#FF5757"]}
              tintColor="#FF5757"
            />
          }
          contentContainerStyle={{ paddingBottom: 160 }}
        >
          <Stories storiesData={storiesData} onStoriesRefresh={fetchHome} />

          <NewMatchSection
            sessionsData={sessionsData}
            onConnectionsClose={fetchHome}
          />
          <ActiveRequestSection futureCount={sessionsData?.future_count} />
          <GymMatesSection nearbyGymMates={nearbyGymMates} />
          <CreateSessionCTA
            sessionsData={sessionsData}
            nearbyGymMates={nearbyGymMates}
          />
          <DailyPassSection nearbyGyms={nearbyGyms} />
          <FriendsSection
            friendSuggestions={friendSuggestions}
            onSent={(clientId) =>
              setFriendSuggestions((prev) =>
                prev.filter((f) => f.client_id !== clientId),
              )
            }
          />

          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() =>
              router.push({
                pathname: "/client/referral",
                params: { source: "gymmate" },
              })
            }
            style={s.referBanner}
          >
            <Image
              source={require("../../assets/images/gym_mate/refer.webp")}
              style={s.referImage}
              resizeMode="cover"
            />
          </TouchableOpacity>
        </RNAnimated.ScrollView>
      )}

      {/* Floating + button */}
      <RNAnimated.View
        style={[s.fabContainer, { transform: [{ scale: fabScale }] }]}
      >
        <RNAnimated.View
          style={[
            s.fabLabel,
            {
              opacity: fabLabelOpacity,
              transform: [{ translateX: fabLabelTranslateX }],
            },
          ]}
          pointerEvents="none"
        >
          <Text style={s.fabLabelText}>Create Gym Mate Session</Text>
        </RNAnimated.View>
        <TouchableOpacity
          activeOpacity={0.85}
          onPress={() => router.push("/client/(gymmate)/selectdate")}
        >
          <RNAnimated.View
            style={[s.fabBtn, { transform: [{ scale: fabPulse }] }]}
          >
            <LinearGradient
              colors={["#FF5757", "#FF3838"]}
              style={s.fabGradient}
            >
              <Ionicons name="add" size={28} color="#fff" />
            </LinearGradient>
          </RNAnimated.View>
        </TouchableOpacity>
      </RNAnimated.View>
    </View>
  );
};

export default GymMateMain;

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Loader
  loaderWrap: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  // Header
  header: {
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 4,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  welcome: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  welcomeSub: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },
  headerIcons: {
    flexDirection: "row",
    flexShrink: 0,
    gap: 8,
    marginTop: 2,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 10,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  notifDot: {
    position: "absolute",
    top: 2,
    right: 3,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: "#FF5757",
    borderWidth: 1.5,
    borderColor: "#F5F5F5",
  },
  searchBar: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 42,
    gap: 8,
  },
  searchText: {
    fontSize: 14,
    color: "#AAAAAA",
  },

  // Dropdown menu
  dropdown: {
    position: "absolute",
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingVertical: 4,
    minWidth: 210,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  dropdownItemBorder: {
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  dropdownLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    flex: 1,
  },
  menuItemDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF5757",
  },

  // Create Session CTA
  ctaBlock: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 20,
    marginTop: 15,
    marginBottom: 8,
    borderRadius: 16,
    padding: 14,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: "#FFE0D6",
  },
  ctaIconRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 0,
  },
  ctaIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFF0EB",
    alignItems: "center",
    justifyContent: "center",
  },
  ctaLiveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#34D399",
    marginLeft: 12,
  },
  ctaLiveText: {
    fontSize: 11,
    color: "#6B7280",
    marginLeft: 4,
  },
  ctaTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 6,
  },
  ctaSub: {
    fontSize: 12.5,
    color: "#6B7280",
    lineHeight: 18,
    marginBottom: 16,
  },
  ctaButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF5757",
    borderRadius: 12,
    paddingVertical: 13,
    gap: 6,
  },
  ctaButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  ctaFootnote: {
    fontSize: 11,
    color: "#9CA3AF",
    textAlign: "center",
    marginTop: 8,
  },

  // Sections
  sectionBlock: {
    backgroundColor: "#FFFFFF",
    marginTop: 0,
    paddingTop: 12,
    paddingBottom: 0,
    paddingHorizontal: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  sectionSub: {
    fontSize: 12,
    color: "#AAAAAA",
    marginTop: 2,
    marginBottom: 12,
  },
  viewAllRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  viewAll: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FF5757",
  },

  // Stories
  storiesRow: {
    gap: 16,
    paddingVertical: 4,
    paddingTop: 0,
  },
  storyItem: {
    alignItems: "center",
    gap: 6,
    width: 68,
  },
  storyRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2.5,
    borderColor: "#FF5757",
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  storyRingViewed: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2.5,
    borderColor: "#D0D0D0",
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  storyRingActive: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2.5,
    borderColor: "#00C950",
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  myStoryRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
  },
  myStoryAddWrap: {
    alignItems: "center",
    justifyContent: "center",
  },
  myStoryAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 31,
  },
  storyAvatar: {
    width: 54,
    height: 54,
    borderRadius: 27,
  },
  storyName: {
    fontSize: 11,
    color: "#444",
    fontWeight: "500",
  },

  // Deck
  deckContainer: {
    height: 320,
    width: CARD_W,
    position: "relative",
    alignSelf: "center",
  },
  backCard: {
    position: "absolute",
    top: 16,
    right: -20,
    width: CARD_W,
    height: 300,
    borderRadius: 18,
    overflow: "hidden",
    opacity: 0.6,
    transform: [{ scale: 0.95 }],
  },
  frontCard: {
    position: "absolute",
    top: 0,
    left: -6,
    width: CARD_W,
    height: 300,
  },

  // Mate card
  mateCard: {
    borderRadius: 18,
    overflow: "hidden",
    height: 300,
    backgroundColor: "#1A1A1A",
    width: "100%",
  },
  mateImage: {
    width: "100%",
    height: "100%",
    position: "absolute",
  },
  mateOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 18,
    paddingBottom: 20,
    paddingTop: 40,
    borderBottomLeftRadius: 18,
    borderBottomRightRadius: 18,
  },
  dailyPassBadge: {
    position: "absolute",
    top: 12,
    right: 12,
    backgroundColor: "#FF5757",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  dailyPassBadgeText: {
    fontSize: 11,
    color: "#FFF",
    fontWeight: "700",
  },
  mateName: {
    fontSize: 20,
    fontWeight: "800",
    color: "#FFF",
    marginBottom: 4,
  },
  mateInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 3,
  },
  mateInfoText: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "700",
  },
  joinBtn: {
    marginTop: 12,
    backgroundColor: "rgba(255,255,255,0.4)",
    borderRadius: 10,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    borderColor: "rgba(255,255,255,0.4)",
  },
  joinBtnSent: {
    backgroundColor: "rgba(16,185,80,0.55)",
    borderColor: "rgba(255,255,255,0.6)",
  },
  joinBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Daily Pass
  dpCardShadow: {
    borderRadius: 14,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    backgroundColor: "#fff",
  },
  dpCard: {
    width: 240,
    borderRadius: 14,
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  dpImageWrap: {
    height: 130,
    position: "relative",
    overflow: "hidden",
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
  },
  dpImage: {
    width: "100%",
    height: "100%",
  },
  dpImageCurve: {
    position: "absolute",
    bottom: -14,
    left: 0,
    right: 0,
    height: 26,
    backgroundColor: "#fff",
    borderTopLeftRadius: 100,
    borderTopRightRadius: 100,
  },
  dpInfo: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
    paddingTop: 6,
    paddingBottom: 3,
  },
  dpName: {
    fontSize: 13,
    fontWeight: "700",
    color: "#0A0A0A",
    marginBottom: 3,
    textTransform: "uppercase",
  },
  dpLocRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
    marginBottom: 8,
  },
  dpLocText: {
    fontSize: 11,
    color: "#4A5565",
    fontWeight: "400",
  },
  dpPriceBadge: {
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: "#FF5757",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
    alignSelf: "flex-start",
  },
  dpPriceRupee: {
    fontSize: 11,
    color: "#fff",
    fontWeight: "700",
  },
  dpPriceAmount: {
    fontSize: 14,
    color: "#fff",
    fontWeight: "800",
  },
  dpPriceUnit: {
    fontSize: 9,
    color: "#fddfdf",
    fontWeight: "500",
    marginLeft: 1,
  },
  dpFooter: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
    justifyContent: "center",
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  dpFooterText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#5E2F00",
    letterSpacing: 0.1,
  },

  // Friends
  friendCard: {
    width: 240,
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
    padding: 14,
    paddingVertical: 20,
    alignItems: "center",
  },
  matchBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    zIndex: 1,
    marginTop: 10,
    marginBottom: 6,
    backgroundColor: "#2196F3",
  },
  matchText: {
    fontSize: 11,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  friendAvatarWrap: {
    width: 100,
    height: 100,
    borderRadius: 50,
    overflow: "hidden",
    marginBottom: 10,
  },
  friendAvatar: {
    width: "100%",
    height: "100%",
  },
  friendName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
  },
  friendBio: {
    fontSize: 12,
    lineHeight: 16,
    minHeight: 16,
    color: "#555",
    textAlign: "center",
    marginTop: 10,
    marginBottom: 2,
  },
  tagRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 5,
    marginTop: 8,
    marginBottom: 5,
    justifyContent: "center",
  },
  tag: {
    backgroundColor: "#EFEFEF",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  tagText: {
    fontSize: 9,
    color: "#555",
    fontWeight: "500",
  },
  connectBtn: {
    marginTop: 12,
    backgroundColor: "#0F172B",
    borderRadius: 10,
    height: 38,
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  connectIcon: {
    width: 16,
    height: 16,
    resizeMode: "contain",
    tintColor: "#FFFFFF",
  },
  connectBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFF",
  },

  // Connections Modal
  connModalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  connBackBtn: {
    width: 38,
    height: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  connModalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  connTabsRow: {
    flexDirection: "row",
    marginHorizontal: 20,
    marginTop: 16,
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    padding: 4,
  },
  connTab: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  connTabActive: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 2,
  },
  connTabText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#888",
  },
  connTabTextActive: {
    color: "#1A1A1A",
  },
  connCountWrap: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 10,
  },
  connCountText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  connListContent: {
    paddingHorizontal: 0,
    paddingBottom: 32,
  },
  connListCard: {
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
    overflow: "hidden",
  },
  connRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: "#FFFFFF",
  },
  connDivider: {
    height: 1,
    backgroundColor: "#F0F0F0",
    marginHorizontal: 14,
  },
  connAvatarRing: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: "#E0E0E0",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  connAvatarRingGreen: {
    width: 54,
    height: 54,
    borderRadius: 27,
    borderWidth: 2,
    borderColor: "#00C950",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
  },
  connAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  connInfo: {
    flex: 1,
  },
  connName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  connGym: {
    fontSize: 12,
    color: "#888",
    marginBottom: 3,
  },
  connLocRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  connDist: {
    fontSize: 11,
    color: "#FF5757",
    fontWeight: "600",
  },
  connActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  connRejectBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: "#FFF0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  connAcceptBtnWrap: {
    borderRadius: 19,
    overflow: "hidden",
  },
  connAcceptBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  connAcceptIcon: {
    width: 18,
    height: 18,
    resizeMode: "contain",
    tintColor: "#FFFFFF",
  },
  connPendingBtn: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#F5F5F5",
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  connPendingText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#888",
  },
  connMsgBtnWrap: {
    borderRadius: 19,
    overflow: "hidden",
  },
  connMsgBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },

  // ─── Matches Tab ─────────────────────────────────────────────────────────────
  matchScrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
    paddingTop: 12,
  },

  // Carousel wrapper
  matchCarouselWrap: {
    marginBottom: 14,
  },
  matchCarouselDots: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 6,
    marginTop: 15,
  },
  matchCarouselDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#D0D0D0",
  },
  matchCarouselDotActive: {
    width: 18,
    backgroundColor: "#00C950",
    borderRadius: 3,
  },

  // Unified top card
  matchTopCard: {
    borderRadius: 16,
    backgroundColor: "#FFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  matchGymImageWrap: {
    height: 160,
    position: "relative",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    overflow: "hidden",
  },
  matchGymImage: {
    width: "100%",
    height: "100%",
  },
  matchGymOverlay: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.35)",
  },
  matchGymName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFF",
  },
  matchGymLocRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  matchGymLoc: {
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
  },
  matchDistBadge: {
    position: "absolute",
    top: 10,
    right: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    backgroundColor: "#FFF",
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  matchDistText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#1A1A1A",
  },

  // Congrats section (inside unified card)
  matchCongSection: {
    backgroundColor: "#FFF",
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 18,
    alignItems: "center",
    overflow: "hidden",
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
  },
  matchCongTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#1A1A1A",
  },
  matchCongSub: {
    fontSize: 13,
    color: "#888",
    marginTop: 2,
    marginBottom: 18,
  },
  matchAvatarRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  matchAvatarWrap: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2.5,
    borderColor: "#00C950",
    padding: 2,
    alignItems: "center",
    justifyContent: "center",
  },
  matchRightAvatars: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  matchExtraBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  matchExtraText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#555",
  },
  matchChatBadge: {
    position: "absolute",
    top: -30,
    right: -20,
    zIndex: 1,
  },
  matchChatBadgeGrad: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: "#FFF",
  },
  matchAvatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  matchConnectCenter: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 8,
  },
  matchDots: {
    flexDirection: "row",
    gap: 4,
  },
  matchDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#D0D0D0",
  },
  matchConnectIconWrap: {
    marginHorizontal: 0,
  },
  matchConnectGrad: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  matchConnectIcon: {
    width: 46,
    height: 66,
    resizeMode: "contain",
  },
  matchCongDesc: {
    fontSize: 12,
    textAlign: "center",
    lineHeight: 18,
  },
  matchYou: {
    fontWeight: "700",
    color: "#1A1A1A",
  },
  matchChatPlanBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#111827",
    borderRadius: 12,
    paddingVertical: 12,
    marginTop: 12,
    marginHorizontal: 12,
    paddingHorizontal: 16,
  },
  matchChatPlanText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  matchMembersList: {
    marginTop: 4,
    paddingHorizontal: 12,
    gap: 8,
  },
  matchMemberRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  matchMemberAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  matchMemberName: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1A1A1A",
  },
  membersRingScroll: {
    flexDirection: "row",
    gap: 16,
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  membersRingItem: {
    alignItems: "center",
    width: 68,
  },
  membersRingBorder: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2.5,
    borderColor: "#FF5757",
    justifyContent: "center",
    alignItems: "center",
    padding: 2,
  },
  membersRingAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 26,
  },
  membersRingName: {
    fontSize: 11,
    fontWeight: "500",
    color: "#1A1A1A",
    marginTop: 6,
    textAlign: "center",
    maxWidth: 68,
  },
  membersPopupOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.5)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  membersPopupCard: {
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 16,
    width: "100%",
    maxWidth: 340,
    gap: 12,
  },
  membersPopupHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 4,
  },
  membersPopupTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  matchGray: {
    color: "#888",
  },
  matchName: {
    fontWeight: "700",
    color: "#1A1A1A",
  },

  // Gym info row
  matchGymInfoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#F8F8F8",
    borderRadius: 12,
    padding: 12,
    paddingHorizontal: 8,
    marginBottom: 20,
  },
  matchAvatarSmallWrap: {
    flexDirection: "row",
  },
  matchAvatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
  matchGymInfoText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  matchGymInfoLink: {
    color: "#FF5757",
    fontWeight: "700",
  },
  matchGymInfoSub: {
    fontSize: 12,
    color: "#888",
    marginTop: 2,
  },

  // Plan section
  matchPlanTitle: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 3,
  },
  matchPlanSub: {
    fontSize: 12,
    color: "#888",
    marginBottom: 14,
  },

  // Plan cards
  matchPlanCard: {
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
    padding: 16,
    flexDirection: "column",
  },
  matchPlanCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  matchPlanIconBox: {
    width: 48,
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  matchPlanCardBody: {
    flex: 1,
  },
  matchPlanCardLabel: {
    fontSize: 16,
    fontWeight: "800",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  matchPlanCardBest: {
    fontSize: 12,
    color: "#888",
    marginTop: 1,
  },
  matchPlanPrice: {
    fontSize: 26,
    fontWeight: "900",
  },
  matchPlanPriceExtra: {
    fontSize: 12,
    color: "#888",
    fontWeight: "500",
  },
  matchFeatureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 5,
  },
  matchFeatureText: {
    fontSize: 14,
    color: "#444",
  },
  matchBookBtn: {
    marginTop: 14,
    backgroundColor: "#FF6900",
    borderRadius: 10,
    height: 42,
    alignItems: "center",
    justifyContent: "center",
  },
  matchBookBtnPurple: {
    backgroundColor: "#AD46FF",
  },
  matchBookBtnText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFF",
  },

  // Tags
  matchTagRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    marginTop: 8,
    marginBottom: 4,
  },
  matchTag: {
    backgroundColor: "#EFEFEF",
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  matchTagText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#555",
  },

  // Footer card
  matchFooterCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginTop: 16,
    padding: 14,
    borderRadius: 14,
    backgroundColor: "#FFF",
    borderWidth: 1,
    borderColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  matchFooterAvatars: {
    flexDirection: "row",
  },
  matchFooterAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "#FFF",
  },
  matchFooterTextWrap: {
    flex: 1,
  },
  matchFooterCount: {
    fontSize: 13,
    fontWeight: "800",
    color: "#FF6900",
  },
  matchFooterSub: {
    fontSize: 11,
    color: "#888",
    marginTop: 1,
  },

  // ─── New Match Section ───────────────────────────────────────────────────────
  newMatchWrap: {
    paddingHorizontal: 16,
    paddingTop: 4,
    paddingBottom: 8,
    gap: 12,
  },

  // Requests banner card
  requestsBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF",
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.07,
    shadowRadius: 6,
    elevation: 2,
  },
  requestsAvatarStack: {
    flexDirection: "row",
    alignItems: "center",
  },
  requestsAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "#FFF",
  },
  requestsBannerTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  requestsBannerCount: {
    color: "#00BC7D",
    fontWeight: "800",
  },
  requestsBannerSub: {
    fontSize: 11,
    color: "#94A3B8",
    marginTop: 2,
  },

  // Gym Mate Ready card
  mateReadyCard: {
    borderRadius: 16,
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 20,
    alignItems: "center",
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 8,
    elevation: 3,
  },
  mateReadyTitle: {
    fontSize: 17,
    fontWeight: "800",
    color: "#0F172B",
    marginBottom: 20,
  },
  mateReadyAvatarRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  mateReadyAvatarRing: {
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 2.5,
    borderColor: "#00C950",
    padding: 2,
  },
  mateReadyAvatar: {
    width: "100%",
    height: "100%",
    borderRadius: 34,
  },
  mateReadyCenter: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    justifyContent: "center",
    gap: 6,
  },
  mateReadyDots: {
    flexDirection: "row",
    gap: 4,
    alignItems: "center",
  },
  mateReadyDot: {
    width: 5,
    height: 5,
    borderRadius: 3,
    backgroundColor: "#00C950",
  },
  mateReadyIconGrad: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  mateReadyIcon: {
    width: 56,
    height: 76,
  },
  mateReadyDesc: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 18,
    paddingHorizontal: 10,
  },
  mateReadyName: {
    fontWeight: "800",
    color: "#0F172B",
  },
  mateReadyDescGray: {
    color: "#64748B",
  },
  planWorkoutBtnWrap: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 12,
  },
  planWorkoutBtn: {
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    borderRadius: 12,
  },
  planWorkoutBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFF",
  },
  startChatRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  startChatText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#00BC7D",
  },

  // Active Session Banner
  activeBannerWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  activeBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0F4FF",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
    borderWidth: 1,
    borderColor: "#D6E0FF",
  },
  liveDotCore: {
    width: 9,
    height: 9,
    borderRadius: 5,
    backgroundColor: "#22C55E",
  },
  activeBannerText: {
    flex: 1,
    fontSize: 14,
    color: "#374151",
    fontWeight: "500",
  },
  activeBannerCount: {
    fontWeight: "800",
    color: "#101828",
  },

  // Friend request label (header)
  frLabel: {
    position: "absolute",
    top: 50,
    right: 30,
    zIndex: 10,
  },
  frLabelGradient: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  frLabelText: {
    color: "#fff",
    fontSize: 11,
    fontWeight: "700",
  },

  // FAB
  referBanner: {
    marginHorizontal: 0,
    marginTop: 8,
    borderRadius: 16,
    overflow: "hidden",
  },
  referImage: {
    width: "100%",
    height: undefined,
    aspectRatio: 336 / 118,
    borderRadius: 16,
  },
  fabContainer: {
    position: "absolute",
    bottom: 100,
    right: 16,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 999,
  },
  fabLabel: {
    backgroundColor: "#FF5757",
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 7,
    marginRight: 8,
  },
  fabLabelText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  fabBtn: {
    width: 52,
    height: 52,
    borderRadius: 26,
    overflow: "hidden",
    shadowColor: "#FF5757",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 8,
    elevation: 8,
  },
  fabGradient: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
});
