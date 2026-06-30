import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  Animated,
  ScrollView,
  Image,
  ActivityIndicator,
  Modal,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ImageView from "react-native-image-viewing";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeNav } from "../../../hooks/useSafeNav";
import {
  getGymMateProfileAPI,
  sendFriendRequestAPI,
  cancelFriendRequestAPI,
  acceptFriendRequestAPI,
  rejectFriendRequestAPI,
  unfriendAPI,
} from "../../../services/clientApi";
import { useOpenChat } from "../../../src/features/chat/hooks/useOpenChat";

const { width: screenWidth } = Dimensions.get("window");

const DEFAULT_AVATAR = require("../../../assets/images/defaultavatar.webp");

// ─── Carousel ─────────────────────────────────────────────────────────────────

const ProfileCarousel = ({ photos }) => {
  const hasPhotos = photos && photos.length > 0;
  const images = hasPhotos ? photos.map((p) => ({ uri: p.cdn_url })) : [];

  const [activeIndex, setActiveIndex] = useState(0);
  const [imageViewVisible, setImageViewVisible] = useState(false);
  const [imageViewIndex, setImageViewIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const isScrolling = useRef(false);

  useEffect(() => {
    if (images.length <= 1) return;
    const timer = setInterval(() => {
      if (!isScrolling.current) {
        const next = (activeIndex + 1) % images.length;
        flatListRef.current?.scrollToIndex({ animated: true, index: next });
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [activeIndex, images.length]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (e) => {
        const idx = Math.round(e.nativeEvent.contentOffset.x / screenWidth);
        if (idx !== activeIndex && idx >= 0 && idx < images.length) {
          setActiveIndex(idx);
        }
      },
    },
  );

  if (!hasPhotos) {
    return (
      <View style={s.carouselWrap}>
        <View style={s.emptyCarousel}>
          <Ionicons name="person" size={72} color="#9CA3AF" />
          <Text style={s.emptyCarouselText}>No photos yet</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={s.carouselWrap}>
      <FlatList
        ref={flatListRef}
        data={images}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onScroll={handleScroll}
        onScrollBeginDrag={() => {
          isScrolling.current = true;
        }}
        onScrollEndDrag={() => {
          setTimeout(() => {
            isScrolling.current = false;
          }, 100);
        }}
        scrollEventThrottle={16}
        keyExtractor={(_, i) => String(i)}
        getItemLayout={(_, i) => ({
          length: screenWidth,
          offset: screenWidth * i,
          index: i,
        })}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            activeOpacity={0.92}
            onPress={() => {
              setImageViewIndex(index);
              setImageViewVisible(true);
            }}
            style={{ width: screenWidth, height: 340 }}
          >
            <Image source={item} style={s.carouselImg} resizeMode="cover" />
          </TouchableOpacity>
        )}
      />

      {images.length > 1 && (
        <View style={s.dotRow}>
          {images.map((_, i) => (
            <View
              key={i}
              style={[s.dot, { opacity: i === activeIndex ? 1 : 0.4 }]}
            />
          ))}
        </View>
      )}

      <ImageView
        images={images}
        imageIndex={imageViewIndex}
        visible={imageViewVisible}
        onRequestClose={() => setImageViewVisible(false)}
      />
    </View>
  );
};

// ─── Friend Card (Connect With New People) ──────────────────────────────────

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
  const router = useRouter();
  const [sent, setSent] = useState(false);
  const sendingRef = useRef(false);

  const handleConnect = async (e) => {
    e.stopPropagation();
    if (sendingRef.current || sent) return;
    sendingRef.current = true;
    try {
      const res = await sendFriendRequestAPI(client_id);
      if (res?.status === 200) {
        setSent(true);
        setTimeout(() => onSent?.(client_id), 600);
      }
    } catch {
      // silently fail
    } finally {
      sendingRef.current = false;
    }
  };

  return (
    <TouchableOpacity
      style={s.friendCard}
      activeOpacity={0.95}
      onPress={() =>
        router.replace({
          pathname: "/client/(gymmate)/profilemate",
          params: { client_id },
        })
      }
    >
      <View style={s.friendAvatarWrap}>
        <Image
          source={avatar_url ? { uri: avatar_url } : DEFAULT_AVATAR}
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
        <View style={s.friendBadge}>
          <Text style={s.friendBadgeText}>{match_percentage}% match</Text>
        </View>
      )}
      {suggestion_type === "mutual" && mutual_count != null && (
        <View style={[s.friendBadge]}>
          <Text style={s.friendBadgeText}>
            {mutual_count} mutual friend{mutual_count !== 1 ? "s" : ""}
          </Text>
        </View>
      )}

      {details?.length > 0 && (
        <View style={s.friendTagRow}>
          {details.slice(0, 2).map((t) => (
            <View key={t} style={s.friendTag}>
              <Text style={s.friendTagText}>{t}</Text>
            </View>
          ))}
        </View>
      )}

      {sent ? (
        <View style={[s.friendConnectBtn, { backgroundColor: "#4CAF50" }]}>
          <Ionicons name="checkmark-circle" size={16} color="#FFF" />
          <Text style={s.friendConnectBtnText}>Request Sent</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={s.friendConnectBtn}
          activeOpacity={0.85}
          onPress={handleConnect}
        >
          <Ionicons name="person-add" size={16} color="#FFF" />
          <Text style={s.friendConnectBtnText}>Add Friend</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const ProfileMate = () => {
  const router = useRouter();
  const navigate = useSafeNav();
  const params = useLocalSearchParams();
  const clientId = params.client_id;
  const { openDirect, loading: chatLoading } = useOpenChat();

  const [profile, setProfile] = useState(null);
  const [relationship, setRelationship] = useState(null);
  const [friendSuggestions, setFriendSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unfriendConfirm, setUnfriendConfirm] = useState(false);
  const busyRef = useRef(false);

  const fetchProfile = useCallback(async () => {
    if (!clientId) return;
    setLoading(true);
    try {
      const res = await getGymMateProfileAPI("others", clientId);

      if (res?.status === 200) {
        setProfile(res.data);
        setRelationship(res.data?.relationship || { status: "none" });
        setFriendSuggestions(res.data?.friend_suggestions || []);
      }
    } catch {
      // silently fail
    } finally {
      setLoading(false);
    }
  }, [clientId]);

  useFocusEffect(
    useCallback(() => {
      fetchProfile();
    }, [fetchProfile]),
  );

  // ─── CTA actions ─────────────────────────────────────────────────────────

  const handleConnect = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    try {
      const res = await sendFriendRequestAPI(clientId);
      if (res?.status === 200)
        setRelationship({
          status: "request_sent",
          request_id: res.data?.request_id,
        });
    } catch {}
    busyRef.current = false;
  };

  const handleCancelRequest = async () => {
    if (busyRef.current || !relationship?.request_id) return;
    busyRef.current = true;
    try {
      const res = await cancelFriendRequestAPI(relationship.request_id);
      if (res?.status === 200) setRelationship({ status: "none" });
    } catch {}
    busyRef.current = false;
  };

  const handleAccept = async () => {
    if (busyRef.current || !relationship?.request_id) return;
    busyRef.current = true;
    try {
      const res = await acceptFriendRequestAPI(relationship.request_id);
      if (res?.status === 200) setRelationship({ status: "friends" });
    } catch {}
    busyRef.current = false;
  };

  const handleReject = async () => {
    if (busyRef.current || !relationship?.request_id) return;
    busyRef.current = true;
    try {
      const res = await rejectFriendRequestAPI(relationship.request_id);
      if (res?.status === 200) setRelationship({ status: "none" });
    } catch {}
    busyRef.current = false;
  };

  const handleUnfriend = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setUnfriendConfirm(false);
    try {
      const res = await unfriendAPI(clientId);
      if (res?.status === 200) setRelationship({ status: "none" });
    } catch {}
    busyRef.current = false;
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={s.loaderWrap}>
        <ActivityIndicator size="large" color="#FF5757" />
      </View>
    );
  }

  const photos = profile?.photos || [];
  const bio = profile?.bio || "";
  const goal = profile?.goal || "";
  const matchPct = profile?.match;
  const mutualFriends = profile?.mutual_friends || [];
  const status = relationship?.status || "none";

  return (
    <View style={{ flex: 1, backgroundColor: "#FFFFFF" }}>
      <ScrollView showsVerticalScrollIndicator={false} bounces={false}>
        {/* Carousel */}
        <View>
          <ProfileCarousel photos={photos} />

          {/* Back button overlaid */}
          <SafeAreaView
            edges={["top"]}
            style={s.backOverlay}
            pointerEvents="box-none"
          >
            <TouchableOpacity
              style={s.backBtn}
              onPress={() => router.back()}
              activeOpacity={0.8}
            >
              <Ionicons name="arrow-back" size={20} color="#1A1A1A" />
            </TouchableOpacity>
          </SafeAreaView>
        </View>

        {/* Profile card */}
        <View style={s.card}>
          {/* Name */}
          <Text style={s.name}>{profile?.name || "User"}</Text>

          {/* City */}
          {profile?.city ? (
            <View style={s.cityRow}>
              <Ionicons name="location-outline" size={14} color="#9CA3AF" />
              <Text style={s.cityText}>{profile.city}</Text>
            </View>
          ) : null}

          {/* Bio */}
          {bio ? <Text style={s.bio}>{bio}</Text> : null}

          {/* CTA Buttons based on relationship status */}
          {status === "none" && (
            <TouchableOpacity
              style={s.connectBtn}
              onPress={handleConnect}
              activeOpacity={0.85}
            >
              <Ionicons
                name="add"
                size={18}
                color="#FFF"
                style={{ marginRight: 6 }}
              />
              <Text style={s.connectBtnText}>Connect</Text>
            </TouchableOpacity>
          )}

          {status === "request_sent" && (
            <TouchableOpacity
              style={[s.connectBtn, s.cancelReqBtn]}
              onPress={handleCancelRequest}
              activeOpacity={0.85}
            >
              <Text style={s.cancelReqBtnText}>Cancel Request</Text>
            </TouchableOpacity>
          )}

          {status === "request_received" && (
            <View style={s.ctaRow}>
              <TouchableOpacity
                style={[s.ctaBtn, s.acceptBtn]}
                onPress={handleAccept}
                activeOpacity={0.85}
              >
                <Text style={s.acceptBtnText}>Accept</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.ctaBtn, s.rejectBtn]}
                onPress={handleReject}
                activeOpacity={0.85}
              >
                <Text style={s.rejectBtnText}>Reject</Text>
              </TouchableOpacity>
            </View>
          )}

          {status === "friends" && (
            <View style={s.ctaRow}>
              <TouchableOpacity
                style={[s.ctaBtn, s.messageBtn]}
                onPress={() =>
                  openDirect(clientId, {
                    name: profile?.name,
                    avatar_url: profile?.avatar_url,
                  })
                }
                disabled={chatLoading}
                activeOpacity={0.85}
              >
                {chatLoading ? (
                  <ActivityIndicator size="small" color="#FFF" />
                ) : (
                  <>
                    <Ionicons
                      name="chatbubble-outline"
                      size={16}
                      color="#FFF"
                    />
                    <Text style={s.messageBtnText}>Message</Text>
                  </>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[s.ctaBtn, s.unfriendBtn]}
                onPress={() => setUnfriendConfirm(true)}
                activeOpacity={0.85}
              >
                <Text style={s.unfriendBtnText}>Unfriend</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Goal + Match % */}
          {(goal || matchPct != null) && (
            <View style={s.tagsMatchRow}>
              {goal ? (
                <View style={s.tagsHalf}>
                  <View style={s.tag}>
                    <Text style={s.tagText}>{goal}</Text>
                  </View>
                </View>
              ) : null}
              {matchPct != null ? (
                <View style={goal ? s.matchHalf : s.tagsHalf}>
                  <View style={s.matchBadge}>
                    <Text style={s.matchText}>{matchPct}% Match</Text>
                  </View>
                </View>
              ) : null}
            </View>
          )}

          {/* Mutual Gym Mates */}
          {mutualFriends.length > 0 && (
            <>
              <View style={s.divider} />
              <Text style={[s.sectionLabel, { marginBottom: 12 }]}>
                Mutual Gym Mates
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 16 }}
              >
                {mutualFriends.map((mate) => (
                  <TouchableOpacity
                    key={mate.client_id}
                    style={s.mutualItem}
                    activeOpacity={0.8}
                    onPress={() =>
                      router.replace({
                        pathname: "/client/(gymmate)/profilemate",
                        params: { client_id: mate.client_id },
                      })
                    }
                  >
                    <Image
                      source={
                        mate.avatar_url
                          ? { uri: mate.avatar_url }
                          : DEFAULT_AVATAR
                      }
                      style={s.mutualAvatar}
                    />
                    <Text style={s.mutualName}>{mate.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </>
          )}

          {/* Connect With New People */}
          {friendSuggestions.length > 0 && (
            <>
              <View style={s.divider} />
              <View style={s.friendsSectionHeader}>
                <Text style={s.sectionLabel}>Discover New People</Text>
                <TouchableOpacity
                  style={s.viewAllRow}
                  activeOpacity={0.7}
                  onPress={() => navigate("/client/(gymmate)/friends")}
                >
                  <Text style={s.viewAll}>View all</Text>
                  <Ionicons name="chevron-forward" size={13} color="#FF5757" />
                </TouchableOpacity>
              </View>
              <Text style={s.friendsSub}>
                Meet new people and make fitness more social.
              </Text>

              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 12, paddingBottom: 4 }}
              >
                {friendSuggestions.map((f) => (
                  <FriendCard
                    key={f.sno}
                    {...f}
                    onSent={(cid) =>
                      setFriendSuggestions((prev) =>
                        prev.filter((item) => item.client_id !== cid),
                      )
                    }
                  />
                ))}
              </ScrollView>
            </>
          )}

          <View style={{ height: 120 }} />
        </View>
      </ScrollView>

      {/* Unfriend confirmation modal */}
      <Modal
        visible={unfriendConfirm}
        transparent
        animationType="fade"
        onRequestClose={() => setUnfriendConfirm(false)}
      >
        <View style={s.modalOverlay}>
          <View style={s.modalCard}>
            <Text style={s.modalTitle}>Unfriend</Text>
            <Text style={s.modalMsg}>
              Are you sure you want to unfriend {profile?.name}?
            </Text>
            <View style={s.modalBtnRow}>
              <TouchableOpacity
                style={s.modalBtnOutline}
                activeOpacity={0.8}
                onPress={() => setUnfriendConfirm(false)}
              >
                <Text style={s.modalBtnOutlineText}>No</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={s.modalBtnFill}
                activeOpacity={0.8}
                onPress={handleUnfriend}
              >
                <Text style={s.modalBtnFillText}>Yes, Unfriend</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

export default ProfileMate;

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Loader
  loaderWrap: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FFF",
  },

  // Carousel
  carouselWrap: {
    height: 340,
    backgroundColor: "#1A1A1A",
  },
  carouselImg: {
    width: screenWidth,
    height: 340,
  },
  emptyCarousel: {
    flex: 1,
    backgroundColor: "#E5E7EB",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyCarouselText: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "500",
    marginTop: 8,
  },
  dotRow: {
    position: "absolute",
    bottom: 36,
    left: 0,
    right: 0,
    flexDirection: "row",
    justifyContent: "center",
    gap: 5,
  },
  dot: {
    width: 25,
    height: 3,
    borderRadius: 2,
    backgroundColor: "#FFFFFF",
  },

  // Back button
  backOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
  },
  backBtn: {
    margin: 16,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },

  // Card
  card: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
    paddingHorizontal: 20,
    paddingTop: 24,
  },

  // Name
  name: {
    fontSize: 24,
    fontWeight: "800",
    color: "#0F172B",
    marginBottom: 4,
  },

  // City
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 6,
  },
  cityText: {
    fontSize: 13,
    color: "#9CA3AF",
    fontWeight: "500",
  },

  // Bio
  bio: {
    fontSize: 13,
    color: "#64748B",
    lineHeight: 20,
    marginBottom: 16,
  },

  // Connect button (status: none)
  connectBtn: {
    backgroundColor: "#0F172B",
    borderRadius: 12,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  connectBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Cancel Request button (status: request_sent)
  cancelReqBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  cancelReqBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6B7280",
  },

  // CTA row (Accept+Reject / Message+Unfriend)
  ctaRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 14,
  },
  ctaBtn: {
    flex: 1,
    borderRadius: 12,
    height: 48,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },

  // Accept
  acceptBtn: {
    backgroundColor: "#0F172B",
  },
  acceptBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Reject
  rejectBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  rejectBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#6B7280",
  },

  // Message
  messageBtn: {
    backgroundColor: "#0F172B",
  },
  messageBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Unfriend
  unfriendBtn: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#D1D5DB",
  },
  unfriendBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#DC2626",
  },

  // Tags + Match
  tagsMatchRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 4,
  },
  tagsHalf: {
    flex: 1,
    paddingRight: 6,
  },
  matchHalf: {
    flex: 1,
    paddingLeft: 6,
  },
  tag: {
    backgroundColor: "#F1F5F9",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: "center",
  },
  tagText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "500",
  },
  matchBadge: {
    backgroundColor: "#00BC7D",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 7,
    alignItems: "center",
  },
  matchText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#FFFFFF",
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 16,
  },

  // Section label
  sectionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172B",
  },

  // Mutual Gym Mates
  mutualItem: {
    alignItems: "center",
    gap: 5,
  },
  mutualAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: "#E2E8F0",
  },
  mutualName: {
    fontSize: 11,
    color: "#64748B",
    fontWeight: "500",
  },

  // Friends section
  friendsSectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
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
  friendsSub: {
    fontSize: 12,
    color: "#AAAAAA",
    marginTop: 2,
    marginBottom: 12,
  },
  friendCard: {
    width: 240,
    backgroundColor: "#F8F8F8",
    borderRadius: 16,
    padding: 14,
    paddingVertical: 20,
    alignItems: "center",
  },
  friendBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    zIndex: 1,
    marginTop: 10,
    marginBottom: 6,
    backgroundColor: "#2196F3",
  },
  friendBadgeText: {
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
  friendTagRow: {
    flexDirection: "row",
    flexWrap: "nowrap",
    gap: 5,
    marginTop: 8,
    justifyContent: "center",
  },
  friendTag: {
    backgroundColor: "#EFEFEF",
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  friendTagText: {
    fontSize: 9,
    color: "#555",
    fontWeight: "500",
  },
  friendConnectBtn: {
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
  friendConnectIcon: {
    width: 16,
    height: 16,
    resizeMode: "contain",
    tintColor: "#FFFFFF",
  },
  friendConnectBtnText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFF",
  },

  // Unfriend confirmation modal
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  modalCard: {
    width: "100%",
    backgroundColor: "#FFF",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  modalMsg: {
    fontSize: 13,
    color: "#6B7280",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 20,
  },
  modalBtnRow: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  modalBtnOutline: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#D1D5DB",
    alignItems: "center",
  },
  modalBtnOutlineText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  modalBtnFill: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 10,
    backgroundColor: "#DC2626",
    alignItems: "center",
  },
  modalBtnFillText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FFF",
  },
});
