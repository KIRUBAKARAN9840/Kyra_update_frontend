import {
  StyleSheet,
  View,
  Dimensions,
  TouchableOpacity,
  BackHandler,
  ScrollView,
  Text,
  Linking,
  Animated,
} from "react-native";
import React, { useEffect, useRef } from "react";
import { Image } from "expo-image";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";

const { width, height } = Dimensions.get("window");

const getImageContainerHeight = () => {
  const aspectRatio = height / width;

  // For very tall screens (phones with high aspect ratio)
  if (aspectRatio > 2.15) {
    return height * 0.4;
  }
  // For medium aspect ratio phones
  else if (aspectRatio > 1.8) {
    return height * 0.43;
  }
  // For shorter screens (older phones, some tablets)
  else if (aspectRatio > 1.6) {
    return height * 0.47;
  }
  // For tablets and wide screens
  else {
    return height * 0.5;
  }
};

const FittbotCash = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const imageHeight = getImageContainerHeight();

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        router.replace("/client/rewardprogram");
        return true;
      },
    );

    return () => backHandler.remove();
  }, []);

  // Header opacity based on scroll
  const headerOpacity = scrollY.interpolate({
    inputRange: [0, imageHeight * 0.5, imageHeight],
    outputRange: [0, 0, 1],
    extrapolate: "clamp",
  });

  // Back arrow opacity (inverse of header)
  const backArrowOpacity = scrollY.interpolate({
    inputRange: [0, imageHeight * 0.5, imageHeight],
    outputRange: [1, 1, 0],
    extrapolate: "clamp",
  });

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Initial Back Arrow (visible when image is shown) */}
      <Animated.View
        style={[
          styles.backArrow,
          { top: insets.top + 10, opacity: backArrowOpacity },
        ]}
      >
        <TouchableOpacity
          onPress={() => router.replace("/client/rewardprogram")}
        >
          <Ionicons name="arrow-back" size={28} color="#000000" />
        </TouchableOpacity>
      </Animated.View>

      {/* Animated Header (visible when scrolled) */}
      <Animated.View
        style={[
          styles.header,
          {
            paddingTop: insets.top,
            opacity: headerOpacity,
          },
        ]}
      >
        <TouchableOpacity
          style={styles.headerBackButton}
          onPress={() => router.push("/client/rewardprogram")}
        >
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Fymble Cash</Text>
        <View style={styles.headerPlaceholder} />
      </Animated.View>

      <Animated.ScrollView
        style={styles.scrollView}
        showsVerticalScrollIndicator={false}
        onScroll={Animated.event(
          [{ nativeEvent: { contentOffset: { y: scrollY } } }],
          { useNativeDriver: true },
        )}
        scrollEventThrottle={16}
      >
        {/* Header Image */}
        <View style={styles.imageContainer}>
          <Image
            source={require("../../assets/images/cash_page.webp")}
            style={styles.image}
          />
        </View>

        {/* Content Container */}
        <View style={styles.contentContainer}>
          {/* How You Can Earn Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              How You Can Earn{" "}
              <Text style={styles.highlightText}>Fymble Cash</Text>
            </Text>

            {/* Referral Rewards Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Referral Rewards</Text>
              <Text style={styles.cardDescription}>
                Invite your friends to join Fymble and earn{" "}
                <Text style={styles.highlightText}>₹100 Fymble Cash</Text> per
                referral using your referral ID.
              </Text>
            </View>

            {/* Convert XP Points Card */}
            <View style={styles.card}>
              <Text style={styles.cardTitle}>Convert XP Points</Text>
              <Text style={styles.cardDescription}>
                Turn your Fitness progress into rewards.
              </Text>

              <View style={styles.xpConversion}>
                <Image
                  source={require("../../assets/images/XP 1.png")}
                  style={styles.coinIcon}
                />
                <Text style={styles.xpText}>1000 = </Text>
                <Text style={styles.xpAmount}>₹10 Fymble Cash</Text>
              </View>
            </View>
          </View>

          {/* How to Use Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              How to Use <Text style={styles.highlightText}>Fymble Cash</Text>
            </Text>

            <View style={styles.card}>
              <Text style={styles.useTitle}>
                Redeem your Fymble Cash to unlock real fitness benefits.
              </Text>

              <View style={styles.benefitItem}>
                <MaterialIcons name="check-circle" size={20} color="#28A745" />
                <View style={styles.benefitTextContainer}>
                  <Text style={styles.benefitTitle}>
                    Gym Memberships & Personal Training Plans
                  </Text>
                  <Text style={styles.benefitSubtext}>
                    10% of plan value, max ₹100 per transaction
                  </Text>
                </View>
              </View>

              <View style={styles.benefitItem}>
                <MaterialIcons name="check-circle" size={20} color="#28A745" />
                <View style={styles.benefitTextContainer}>
                  <Text style={styles.benefitTitle}>
                    Daily Passes & Fitness Classes
                  </Text>
                  <Text style={styles.benefitSubtext}>
                    Up to 10% of total pass cost
                  </Text>
                </View>
              </View>

              <Text style={styles.warningText}>
                Fymble Cash cannot be used for purchasing Fymble Nutrition Plan.
              </Text>
            </View>
          </View>

          {/* Footer Terms */}
          <View style={styles.footer}>
            <Text style={styles.footerText}>
              All Fymble Cash policies follow{" "}
              <Text
                style={styles.linkText}
                onPress={() =>
                  Linking.openURL("https://fymble.app/terms-and-conditions/")
                }
              >
                Fymble Terms & Conditions
              </Text>
              .{"\n"}Subject to change anytime
            </Text>
          </View>
        </View>
      </Animated.ScrollView>
    </View>
  );
};

export default FittbotCash;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8F9FA",
  },
  scrollView: {
    flex: 1,
  },
  imageContainer: {
    width: "100%",
    height: getImageContainerHeight(),
  },
  image: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  backArrow: {
    position: "absolute",
    left: 15,
    zIndex: 10,
    padding: 5,
  },
  header: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFFFFF",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingBottom: 12,
    zIndex: 100,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  headerBackButton: {
    padding: 5,
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000000",
    flex: 1,
    textAlign: "center",
  },
  headerPlaceholder: {
    width: 40,
  },
  contentContainer: {
    paddingHorizontal: 0,
    paddingBottom: 20,
  },
  section: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: "400",
    color: "#1A1A1A",
    marginBottom: 16,
    paddingLeft: 16,
    borderWidth: 1,
    borderColor: "#ddd",
    paddingVertical: 5,
  },
  highlightText: {
    color: "#FF5757",
    fontWeight: "600",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    marginHorizontal: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B4B4B",
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 13,
    color: "#666",
    marginBottom: 12,
    lineHeight: 20,
  },
  rewardItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 2,
  },
  bulletPoint: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FF5757",
    marginRight: 8,
    marginTop: 1,
  },
  rewardAmount: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF5757",
  },
  rewardText: {
    fontSize: 12,
    color: "#666",
    flex: 1,
    lineHeight: 20,
  },
  xpConversion: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: "#F3F4F6",
  },
  coinIcon: {
    width: 24,
    height: 24,
    marginRight: 8,
  },
  xpText: {
    fontSize: 16,
    color: "#333",
    fontWeight: "500",
  },
  xpAmount: {
    fontSize: 16,
    color: "#FF5757",
    fontWeight: "700",
  },
  useTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B4B4B",
    marginBottom: 16,
    lineHeight: 18,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  benefitTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  benefitTitle: {
    fontSize: 12,
    fontWeight: "500",
    color: "#4B4B4B",
    marginBottom: 4,
    lineHeight: 18,
  },
  benefitSubtext: {
    fontSize: 12,
    color: "#999",
    lineHeight: 18,
  },
  warningText: {
    fontSize: 10,
    color: "#FF5757",
    marginTop: 8,
    lineHeight: 19,
    fontWeight: "500",
  },
  footer: {
    marginTop: 24,
    marginBottom: 20,
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    lineHeight: 18,
  },
  linkText: {
    color: "#007BFF",
    textDecorationLine: "underline",
  },
});
