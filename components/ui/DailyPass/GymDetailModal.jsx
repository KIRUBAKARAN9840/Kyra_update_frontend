import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Modal,
  ScrollView,
  FlatList,
  ActivityIndicator,
  Animated,
  Linking,
  Platform,
} from "react-native";
import { Image } from "expo-image";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import ImageView from "react-native-image-viewing";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: screenWidth } = Dimensions.get("window");

// ── Format timings (same logic as gymdetails.jsx) ────────────────
const formatGymTimings = (timings) => {
  if (!timings || !Array.isArray(timings) || timings.length === 0) {
    return ["Timing not available"];
  }
  return timings
    .filter((t) => t?.startTime && t?.endTime)
    .map((timing) => {
      try {
        const startTime = new Date(timing.startTime).toLocaleTimeString(
          "en-US",
          { hour: "numeric", minute: "2-digit", hour12: true },
        );
        const endTime = new Date(timing.endTime).toLocaleTimeString("en-US", {
          hour: "numeric",
          minute: "2-digit",
          hour12: true,
        });
        const dayLabel = timing?.day || timing?.days || "Daily";
        const formattedDay =
          dayLabel && typeof dayLabel === "string" && dayLabel.length > 0
            ? dayLabel.charAt(0).toUpperCase() + dayLabel.slice(1).toLowerCase()
            : "Daily";
        return `${formattedDay} ${startTime} - ${endTime}`;
      } catch {
        return null;
      }
    })
    .filter(Boolean);
};

// ── Image Carousel ────────────────────────────────────────────────
const GymCarousel = ({ images }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isImageViewVisible, setIsImageViewVisible] = useState(false);
  const [imageViewIndex, setImageViewIndex] = useState(0);
  const flatListRef = useRef(null);
  const scrollX = useRef(new Animated.Value(0)).current;
  const isScrolling = useRef(false);

  // Filter out videos
  const imageList = useMemo(() => {
    if (!images || images.length === 0) return [];
    return images.filter(
      (img) =>
        !img.toLowerCase().includes(".mp4") &&
        !img.toLowerCase().includes(".mov") &&
        !img.toLowerCase().includes("video"),
    );
  }, [images]);

  useEffect(() => {
    if (imageList.length <= 1) return;
    const timer = setInterval(() => {
      if (!isScrolling.current) {
        const nextIndex = (activeIndex + 1) % imageList.length;
        flatListRef.current?.scrollToIndex({
          animated: true,
          index: nextIndex,
        });
      }
    }, 3000);
    return () => clearInterval(timer);
  }, [activeIndex, imageList.length]);

  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event) => {
        const slideIndex = Math.round(
          event.nativeEvent.contentOffset.x / screenWidth,
        );
        if (
          slideIndex !== activeIndex &&
          slideIndex >= 0 &&
          slideIndex < imageList.length
        ) {
          setActiveIndex(slideIndex);
        }
      },
    },
  );

  const handleImagePress = useCallback((index) => {
    setImageViewIndex(index);
    setIsImageViewVisible(true);
  }, []);

  const renderItem = useCallback(
    ({ item, index }) => (
      <TouchableOpacity
        style={styles.carouselSlide}
        activeOpacity={0.9}
        onPress={() => handleImagePress(index)}
      >
        <Image
          source={{ uri: item }}
          style={styles.carouselImage}
          contentFit="cover"
        />
      </TouchableOpacity>
    ),
    [handleImagePress],
  );

  if (imageList.length === 0) return null;

  return (
    <View style={styles.carouselContainer}>
      <FlatList
        ref={flatListRef}
        data={imageList}
        renderItem={renderItem}
        keyExtractor={(_, index) => String(index)}
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
        getItemLayout={(_, index) => ({
          length: screenWidth,
          offset: screenWidth * index,
          index,
        })}
        snapToInterval={screenWidth}
        decelerationRate="fast"
      />
      {imageList.length > 1 && (
        <View style={styles.indicatorContainer}>
          {imageList.map((_, index) => (
            <View
              key={index}
              style={[
                styles.indicator,
                {
                  opacity: index === activeIndex ? 1 : 0.4,
                  backgroundColor: "#4A4A4A",
                },
              ]}
            />
          ))}
        </View>
      )}

      <ImageView
        images={imageList.map((uri) => ({ uri }))}
        imageIndex={imageViewIndex}
        visible={isImageViewVisible}
        onRequestClose={() => setIsImageViewVisible(false)}
      />
    </View>
  );
};

// ── Main Modal ────────────────────────────────────────────────────
const GymDetailModal = ({
  visible,
  onClose,
  gymData,
  loading,
  onBookNow,
  onBookLater,
  onAlreadyMember,
  gymName,
  hideBookNow = false,
}) => {
  const insets = useSafeAreaInsets();
  const [timingsExpanded, setTimingsExpanded] = useState(false);

  const formattedTimings = useMemo(
    () => formatGymTimings(gymData?.gym_timings || gymData?.operating_hours),
    [gymData],
  );

  const fullAddress = useMemo(() => {
    return [
      gymData?.address?.door_no,
      gymData?.address?.building,
      gymData?.address?.street,
      gymData?.address?.area,
      gymData?.address?.city,
      gymData?.address?.state,
      gymData?.address?.pincode,
    ]
      .filter(Boolean)
      .join(", ");
  }, [gymData]);

  const handleAddressPress = useCallback(() => {
    const latitude = gymData?.latitude;
    const longitude = gymData?.longitude;
    if (!latitude || !longitude) return;
    const url = `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url);
  }, [gymData]);

  // Images from gym_pics array
  const images = useMemo(() => {
    if (gymData?.gym_pics && gymData.gym_pics.length > 0) {
      return gymData.gym_pics.map((p) => p.image_url).filter(Boolean);
    }
    return [];
  }, [gymData]);

  const services = gymData?.services || [];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.backdrop}>
        <TouchableOpacity
          style={styles.backdropTouchable}
          activeOpacity={1}
          onPress={onClose}
        />
        <View style={styles.sheet}>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.headerTitle} numberOfLines={1}>
              {gymData?.gym_name || gymName || ""}
            </Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color="#333" />
            </TouchableOpacity>
          </View>

          {/* Content */}
          {loading ? (
            <View style={styles.loaderContainer}>
              <ActivityIndicator size="large" color="#FF5757" />
              <Text style={styles.loaderText}>Loading gym details...</Text>
            </View>
          ) : gymData ? (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              {/* Carousel */}
              <GymCarousel images={images} />

              {/* Info section */}
              <View style={styles.infoSection}>
                {/* Address */}
                {fullAddress ? (
                  <TouchableOpacity
                    style={styles.infoRow}
                    onPress={handleAddressPress}
                    activeOpacity={0.7}
                  >
                    <View style={styles.iconWrapper}>
                      <MaterialIcons
                        name="location-on"
                        size={18}
                        color="#007BFF"
                      />
                    </View>
                    <View style={styles.infoContent}>
                      <Text style={[styles.infoText, { color: "#007BFF" }]}>
                        {fullAddress}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ) : null}

                {/* Operating Hours */}
                <TouchableOpacity
                  style={styles.infoRow}
                  onPress={() => {
                    if (formattedTimings.length > 1) {
                      setTimingsExpanded((prev) => !prev);
                    }
                  }}
                  disabled={formattedTimings.length <= 1}
                  activeOpacity={formattedTimings.length > 1 ? 0.7 : 1}
                >
                  <View style={styles.iconWrapper}>
                    <MaterialIcons name="alarm" size={18} color="#666" />
                  </View>
                  <View style={[styles.infoContent, styles.timingsRow]}>
                    <Text style={styles.timingsText}>
                      {timingsExpanded
                        ? formattedTimings.join("\n")
                        : formattedTimings[0]}
                    </Text>
                    {formattedTimings.length > 1 && (
                      <MaterialIcons
                        name={
                          timingsExpanded
                            ? "keyboard-arrow-up"
                            : "keyboard-arrow-down"
                        }
                        size={18}
                        color="#666"
                      />
                    )}
                  </View>
                </TouchableOpacity>

                {/* Services */}
                {services.length > 0 && (
                  <View
                    style={[
                      styles.servicesSection,
                      hideBookNow && {
                        paddingBottom: Math.max(insets.bottom + 18, 28),
                      },
                    ]}
                  >
                    <Text style={styles.sectionLabel}>Services</Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={styles.servicesScroll}
                    >
                      {services.map((service, index) => (
                        <View key={index} style={styles.serviceChip}>
                          <Text style={styles.serviceChipText}>{service}</Text>
                        </View>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
            </ScrollView>
          ) : null}

          {/* Footer Buttons */}
          {!loading && gymData && !hideBookNow && (
            <View
              style={[
                styles.footer,
                { paddingBottom: Math.max(insets.bottom + 18, 28) },
              ]}
            >
              {onBookLater ? (
                <View style={styles.footerRow}>
                  <View style={styles.footerTopRow}>
                    {onAlreadyMember && (
                      <TouchableOpacity
                        style={[styles.bookLaterBtn, styles.footerTopBtn]}
                        onPress={onAlreadyMember}
                        activeOpacity={0.85}
                      >
                        <Text style={styles.bookLaterText}>
                          Already a Member
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[styles.bookLaterBtn, styles.footerTopBtn]}
                      onPress={onBookLater}
                      activeOpacity={0.85}
                    >
                      <Text style={styles.bookLaterText}>I'll Book Later</Text>
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity
                    style={styles.bookNowBtn}
                    onPress={onBookNow}
                    activeOpacity={0.85}
                  >
                    <Text style={styles.bookNowText}>
                      Book Now & Create Session
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.bookNowBtn}
                  onPress={onBookNow}
                  activeOpacity={0.85}
                >
                  <Text style={styles.bookNowText}>Book Now</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default GymDetailModal;

const styles = StyleSheet.create({
  // ── Modal shell ────────────────────────────────────────────────
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "flex-end",
  },
  backdropTouchable: {
    flex: 1,
  },
  sheet: {
    backgroundColor: "#FFFFFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    minHeight: "50%",
    maxHeight: "88%",
    overflow: "hidden",
  },

  // ── Header ─────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
  },
  headerTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginRight: 8,
  },
  closeBtn: {
    padding: 4,
  },

  // ── Loader ─────────────────────────────────────────────────────
  loaderContainer: {
    height: 260,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loaderText: {
    fontSize: 14,
    color: "#777",
  },

  // ── Carousel ───────────────────────────────────────────────────
  carouselContainer: {
    height: 240,
    position: "relative",
    marginTop: 10,
  },
  carouselSlide: {
    width: screenWidth - 20,
    height: 200,
    position: "relative",
    overflow: "hidden",
    borderRadius: 16,
    marginHorizontal: 10,
  },
  carouselImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  indicatorContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 8,
    gap: 5,
  },
  indicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },

  // ── Info section ───────────────────────────────────────────────
  scrollContent: {
    paddingBottom: 16,
  },
  infoSection: {
    paddingHorizontal: 16,
    paddingTop: 12,
    gap: 10,
    overflow: "hidden",
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 0,
    width: "100%",
  },
  iconWrapper: {
    width: 28,
    alignItems: "center",
    alignSelf: "flex-start",
    paddingTop: 10,
  },
  infoContent: {
    flex: 1,
    backgroundColor: "#F6F6F6",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  infoText: {
    fontSize: 13,
    color: "#333",
    lineHeight: 20,
  },
  timingsRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  timingsText: {
    flex: 1,
    fontSize: 13,
    color: "rgba(65,65,65,0.7)",
    lineHeight: 20,
  },

  // ── Services ───────────────────────────────────────────────────
  servicesSection: {
    marginTop: 4,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  servicesScroll: {
    flexDirection: "row",
    gap: 8,
    paddingRight: 4,
  },
  serviceChip: {
    borderWidth: 1,
    borderColor: "#E0E0E0",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#F9F9F9",
  },
  serviceChipText: {
    fontSize: 13,
    color: "#444",
    fontWeight: "500",
  },

  // ── Footer ─────────────────────────────────────────────────────
  footer: {
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 0.5,
    borderTopColor: "#E5E5E5",
  },
  footerRow: {
    gap: 10,
  },
  footerTopRow: {
    flexDirection: "row",
    gap: 10,
  },
  footerTopBtn: {
    flex: 1,
  },
  bookNowBtn: {
    backgroundColor: "#FF5757",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
  },
  bookNowText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  bookLaterBtn: {
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  bookLaterText: {
    fontSize: 16,
    color: "#374151",
  },
});
