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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import ImageView from "react-native-image-viewing";
import { useRouter } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import { useSafeNav } from "../../../hooks/useSafeNav";
import {
  getGymMateProfileAPI,
  sendFriendRequestAPI,
} from "../../../services/clientApi";

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

// ─── Friend Card ─────────────────────────────────────────────────────────────

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
      onPress={() => navigate("/client/(gymmate)/profilemate", { client_id })}
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
        <View style={s.friendTagRow}>
          {details.slice(0, 2).map((t) => (
            <View key={t} style={s.friendTag}>
              <Text style={s.friendTagText}>{t}</Text>
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
          onPress={handleConnect}
        >
          <Ionicons name="person-add" size={16} color="#FFF" />
          <Text style={s.connectBtnText}>Add Friend</Text>
        </TouchableOpacity>
      )}
    </TouchableOpacity>
  );
};

// ─── Main ─────────────────────────────────────────────────────────────────────

const ProfileMe = () => {
  const router = useRouter();
  const navigate = useSafeNav();
  const [profile, setProfile] = useState(null);
  const [friendSuggestions, setFriendSuggestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [defaultAvatars, setDefaultAvatars] = useState([]);
  const [gender, setGender] = useState("");

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const fetchProfile = async () => {
        try {
          const res = await getGymMateProfileAPI("own");

          if (active && res?.status === 200) {
            setProfile(res.data);
            setFriendSuggestions(res.data?.friend_suggestions || []);
            if (res.default_avatars?.length)
              setDefaultAvatars(res.default_avatars);
            if (res.gender) setGender(res.gender);
          }
        } catch (err) {
          // silently fail
        } finally {
          if (active) setLoading(false);
        }
      };
      fetchProfile();
      return () => {
        active = false;
      };
    }, []),
  );

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FFF",
        }}
      >
        <ActivityIndicator size="large" color="#FF5757" />
      </View>
    );
  }

  const photos = profile?.photos || [];
  const bio = profile?.bio || "";
  const allPreferences = [
    profile?.primary_goal,
    ...(profile?.activity_interests || []),
    profile?.gym_personality,
    profile?.preferred_timing,
  ].filter(Boolean);
  const friendsCount = profile?.social?.friends_count ?? 0;
  const requestsCount = profile?.social?.pending_received_requests_count ?? 0;

  const handleEdit = () => {
    navigate("/client/(gymmate)/editprofileme", {
      primary_goal: profile?.primary_goal || "",
      activity_interests: JSON.stringify(profile?.activity_interests || []),
      preferred_timing: profile?.preferred_timing || "",
      gym_personality: profile?.gym_personality || "",
      bio: profile?.bio || "",
      city: profile?.city || "",
      photos: JSON.stringify(
        (profile?.photos || []).map((p) => ({
          cdn_url: p.cdn_url,
          s3_path: p.s3_path,
          display_order: p.display_order,
        })),
      ),
      gender: gender || "",
      default_avatars: JSON.stringify(defaultAvatars),
    });
  };

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
          {/* Edit button — top right of card */}
          <TouchableOpacity
            style={s.editBtn}
            activeOpacity={0.8}
            onPress={handleEdit}
          >
            <Ionicons name="pencil" size={16} color="#FFFFFF" />
          </TouchableOpacity>

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

          {/* Stats — Friends + Requests */}
          <View style={s.statsRow}>
            <TouchableOpacity
              style={s.statCard}
              activeOpacity={0.7}
              onPress={() => router.push("/client/(gymmate)/myfriends")}
            >
              <Ionicons name="people" size={22} color="#1A1A1A" />
              <Text style={s.statNum}>{friendsCount}</Text>
              <Text style={s.statLabel}>Friends</Text>
            </TouchableOpacity>
            <View style={s.statDivider} />
            <TouchableOpacity
              style={s.statCard}
              activeOpacity={0.7}
              onPress={() => router.push("/client/(gymmate)/requests")}
            >
              <Ionicons name="person-add" size={22} color="#1A1A1A" />
              <Text style={s.statNum}>{requestsCount}</Text>
              <Text style={s.statLabel}>Request</Text>
            </TouchableOpacity>
          </View>

          <View style={s.divider} />

          {/* My Fitness Preferences */}
          {allPreferences.length > 0 && (
            <>
              <View style={s.goalsHeader}>
                <Ionicons
                  name="radio-button-on-outline"
                  size={16}
                  color="#1A1A1A"
                />
                <Text style={s.sectionLabel}>My Fitness Preferences</Text>
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={s.tagsRow}
                contentContainerStyle={s.tagsContent}
              >
                {allPreferences.map((g) => (
                  <View key={g} style={s.tag}>
                    <Text style={s.tagText}>{g}</Text>
                  </View>
                ))}
              </ScrollView>
              <View style={s.divider} />
            </>
          )}

          {/* Connect With New People */}
          {friendSuggestions.length > 0 && (
            <>
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
                    onSent={(clientId) =>
                      setFriendSuggestions((prev) =>
                        prev.filter((s) => s.client_id !== clientId),
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
    </View>
  );
};

export default ProfileMe;

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
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

  // Edit button
  editBtn: {
    position: "absolute",
    top: -20,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#1A1A1A",
    alignItems: "center",
    justifyContent: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
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
    marginBottom: 20,
  },

  // Stats
  statsRow: {
    flexDirection: "row",
    borderWidth: 1,
    borderColor: "#F1F5F9",
    borderRadius: 14,
    overflow: "hidden",
    marginBottom: 4,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    gap: 4,
  },
  statDivider: {
    width: 1,
    backgroundColor: "#F1F5F9",
  },
  statNum: {
    fontSize: 18,
    fontWeight: "800",
    color: "#0F172B",
  },
  statLabel: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },

  // Divider
  divider: {
    height: 1,
    backgroundColor: "#F1F5F9",
    marginVertical: 16,
  },

  // Goals
  goalsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 15,
    fontWeight: "700",
    color: "#0F172B",
  },
  tagsRow: {},
  tagsContent: {
    flexDirection: "row",
    gap: 8,
    paddingHorizontal: 2,
  },
  tag: {
    backgroundColor: "#F1F5F9",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 7,
  },
  tagText: {
    fontSize: 12,
    color: "#475569",
    fontWeight: "600",
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
});
