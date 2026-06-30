import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Animated, Dimensions, Platform } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");
const responsiveWidth = (percentage) => width * (percentage / 100);
const responsiveHeight = (percentage) => height * (percentage / 100);

const SkeletonProfile = ({
  priority = "medium", // "high", "medium", "low"
  type = "profile", // "profile", "gym"
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const isFocused = useIsFocused();

  // Determine animation type based on priority
  const shouldUseShimmer = priority === "high";
  const shouldUsePulse = priority === "high" || priority === "medium";
  const shouldAnimate = isFocused;

  useEffect(() => {
    if (!shouldAnimate) {
      shimmerAnim.stopAnimation();
      pulseAnim.stopAnimation();
      return;
    }

    let shimmerAnimation, pulseAnimation;

    if (shouldUseShimmer) {
      shimmerAnimation = Animated.loop(
        Animated.timing(shimmerAnim, {
          toValue: 1,
          duration: 1200,
          useNativeDriver: true,
        })
      );
      shimmerAnimation.start();
    }

    if (shouldUsePulse) {
      pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: priority === "high" ? 800 : 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 0,
            duration: priority === "high" ? 800 : 1000,
            useNativeDriver: true,
          }),
        ])
      );
      pulseAnimation.start();
    }

    return () => {
      shimmerAnimation?.stop();
      pulseAnimation?.stop();
    };
  }, [
    shimmerAnim,
    pulseAnim,
    shouldAnimate,
    shouldUseShimmer,
    shouldUsePulse,
    priority,
  ]);

  const translateX = shimmerAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width],
  });

  const opacity = shouldUsePulse
    ? pulseAnim.interpolate({
        inputRange: [0, 1],
        outputRange: priority === "high" ? [0.3, 0.8] : [0.4, 0.7],
      })
    : new Animated.Value(0.5);

  const SkeletonBox = ({
    style,
    shimmer = false,
    pulse = true,
    gradient = false,
  }) => {
    const useShimmerForThis = shimmer && shouldUseShimmer;
    const usePulseForThis = pulse && shouldUsePulse;

    if (priority === "low") {
      return (
        <View style={[styles.skeletonBase, style]}>
          <View
            style={[
              styles.skeletonContent,
              styles.staticContent,
              gradient && styles.gradientContent,
            ]}
          />
        </View>
      );
    }

    return (
      <View style={[styles.skeletonBase, style]}>
        <Animated.View
          style={[
            styles.skeletonContent,
            usePulseForThis ? { opacity } : styles.staticContent,
            gradient && styles.gradientContent,
          ]}
        />
        {useShimmerForThis && (
          <Animated.View
            style={[
              styles.shimmerOverlay,
              {
                transform: [{ translateX }],
              },
            ]}
          />
        )}
      </View>
    );
  };

  // Header Section
  const renderHeader = () => (
    <View style={styles.headerSection}>
      <SkeletonBox style={styles.backButton} pulse={false} />
      <SkeletonBox
        style={styles.headerTitle}
        shimmer={priority === "high"}
        pulse={priority !== "low"}
      />
      <View style={styles.headerSpacer} />
    </View>
  );

  // PROFILE PAGE SKELETON
  const renderProfileSkeleton = () => (
    <View style={styles.profileContainer}>
      {/* Profile Image Section */}
      <View style={styles.profileImageSection}>
        <View style={styles.profileImageContainer}>
          <SkeletonBox
            style={styles.profileImage}
            shimmer={priority === "high"}
            pulse={priority !== "low"}
          />
        </View>
        <SkeletonBox
          style={styles.profileName}
          shimmer={priority === "high"}
          pulse={priority !== "low"}
        />
      </View>

      {/* Tabs Section */}
      <View style={styles.tabsSection}>
        {["Personal Details", "Fitness Details", "Gym Details"].map(
          (tab, index) => (
            <SkeletonBox key={tab} style={[styles.tabItem]} pulse={false} />
          )
        )}
      </View>

      {/* Profile Details Cards */}
      <View style={styles.detailsContainer}>
        {[
          { label: "Phone Number", width: "60%" },
          { label: "Email ID", width: "80%" },
          { label: "Gender", width: "40%" },
          { label: "Date of Birth", width: "50%" },
        ].map((detail, index) => (
          <View key={index} style={styles.detailCard}>
            <SkeletonBox style={styles.detailIcon} pulse={false} />
            <View style={styles.detailContent}>
              <SkeletonBox style={styles.detailLabel} pulse={false} />
              <SkeletonBox
                style={[styles.detailValue, { width: detail.width }]}
                pulse={false}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  // GYM MEMBERSHIP PAGE SKELETON
  const renderGymSkeleton = () => (
    <View style={styles.gymContainer}>
      {/* QR Code Section */}
      <View style={styles.qrCodeSection}>
        <View style={styles.qrCodeContainer}>
          <SkeletonBox
            style={styles.qrCodeBackground}
            pulse={priority !== "low"}
          />
          <SkeletonBox
            style={styles.qrCodePattern}
            shimmer={priority === "high"}
            pulse={priority !== "low"}
          />
          <SkeletonBox
            style={styles.gymLogoCenter}
            pulse={priority !== "low"}
          />
        </View>
      </View>

      {/* Info Message */}
      <View style={styles.infoMessageContainer}>
        <SkeletonBox style={styles.infoIcon} pulse={false} />
        <View style={styles.infoTextContainer}>
          <SkeletonBox style={styles.infoTextLine1} pulse={false} />
          <SkeletonBox style={styles.infoTextLine2} pulse={false} />
          <SkeletonBox style={styles.infoTextLine3} pulse={false} />
          <SkeletonBox style={styles.infoTextLine4} pulse={false} />
        </View>
      </View>

      {/* Membership Status */}
      <View style={styles.membershipStatusContainer}>
        <SkeletonBox
          style={styles.membershipStatusText}
          pulse={priority !== "low"}
        />
      </View>

      {/* Your Details Section */}
      <View style={styles.yourDetailsSection}>
        <SkeletonBox
          style={styles.yourDetailsTitle}
          pulse={priority !== "low"}
        />

        {/* Details Cards */}
        {[
          { label: "Name", width: "60%" },
          { label: "Contact", width: "50%" },
          { label: "Email", width: "70%" },
        ].map((detail, index) => (
          <View key={index} style={styles.gymDetailCard}>
            <SkeletonBox style={styles.gymDetailIcon} pulse={false} />
            <View style={styles.gymDetailContent}>
              <SkeletonBox style={styles.gymDetailLabel} pulse={false} />
              <SkeletonBox
                style={[styles.gymDetailValue, { width: detail.width }]}
                pulse={false}
              />
            </View>
          </View>
        ))}
      </View>
    </View>
  );

  // Main render function
  const renderContent = () => {
    switch (type) {
      case "gym":
        return renderGymSkeleton();
      default:
        return renderProfileSkeleton();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <View style={styles.scrollableContent}>{renderContent()}</View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F7",
    paddingTop: Platform.OS === "ios" ? 0 : 25,
  },
  skeletonBase: {
    overflow: "hidden",
    backgroundColor: "#F0F0F0",
  },
  skeletonContent: {
    width: "100%",
    height: "100%",
    backgroundColor: "#E1E9EE",
  },
  staticContent: {
    opacity: 0.5,
  },
  gradientContent: {
    backgroundColor: "#D0D8DD",
  },
  shimmerOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(255, 255, 255, 0.6)",
    width: 50,
  },
  scrollableContent: {
    flex: 1,
    paddingHorizontal: 20,
  },

  // Header styles
  headerSection: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  backButton: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  headerTitle: {
    width: 80,
    height: 20,
    borderRadius: 4,
  },
  headerSpacer: {
    width: 24,
  },

  // PROFILE PAGE SKELETON STYLES
  profileContainer: {
    flex: 1,
    paddingTop: 20,
  },
  profileImageSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  profileImageContainer: {
    position: "relative",
    marginBottom: 15,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
  },
  editIconBadge: {
    position: "absolute",
    bottom: 5,
    right: 5,
    width: 35,
    height: 35,
    borderRadius: 17,
  },
  profileName: {
    width: 120,
    height: 24,
    borderRadius: 4,
  },
  tabsSection: {
    flexDirection: "row",
    marginBottom: 30,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  tabItem: {
    flex: 1,
    height: 40,
    borderRadius: 4,
    marginRight: 10,
    marginBottom: 10,
  },
  activeTab: {
    backgroundColor: "#4CAF50",
  },
  detailsContainer: {
    marginBottom: 30,
  },
  detailCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  detailIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    marginRight: 15,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    width: 80,
    height: 12,
    borderRadius: 4,
    marginBottom: 8,
  },
  detailValue: {
    height: 16,
    borderRadius: 4,
  },
  actionButtonsContainer: {
    gap: 15,
    paddingBottom: 30,
  },
  actionButton: {
    height: 50,
    borderRadius: 12,
  },
  editButton: {
    backgroundColor: "#42A5F5",
  },
  passwordButton: {
    backgroundColor: "#5A6C7D",
  },
  deleteButton: {
    backgroundColor: "#FF5757",
  },

  // GYM MEMBERSHIP SKELETON STYLES
  gymContainer: {
    flex: 1,
    paddingTop: 20,
  },
  qrCodeSection: {
    alignItems: "center",
    marginBottom: 30,
  },
  qrCodeContainer: {
    position: "relative",
    width: 250,
    height: 250,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  qrCodeBackground: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 10,
  },
  qrCodePattern: {
    width: 200,
    height: 200,
    borderRadius: 8,
  },
  gymLogoCenter: {
    position: "absolute",
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  infoMessageContainer: {
    flexDirection: "row",
    backgroundColor: "#E8F4FD",
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
  },
  infoIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    marginRight: 15,
    marginTop: 2,
  },
  infoTextContainer: {
    flex: 1,
  },
  infoTextLine1: {
    width: "90%",
    height: 14,
    borderRadius: 4,
    marginBottom: 5,
  },
  infoTextLine2: {
    width: "85%",
    height: 14,
    borderRadius: 4,
    marginBottom: 5,
  },
  infoTextLine3: {
    width: "80%",
    height: 14,
    borderRadius: 4,
    marginBottom: 5,
  },
  infoTextLine4: {
    width: "60%",
    height: 14,
    borderRadius: 4,
  },
  membershipStatusContainer: {
    alignItems: "center",
    marginBottom: 30,
  },
  membershipStatusText: {
    width: 250,
    height: 16,
    borderRadius: 4,
  },
  yourDetailsSection: {
    flex: 1,
  },
  yourDetailsTitle: {
    width: 100,
    height: 20,
    borderRadius: 4,
    marginBottom: 20,
  },
  gymDetailCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  gymDetailIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    marginRight: 15,
  },
  gymDetailContent: {
    flex: 1,
  },
  gymDetailLabel: {
    width: 60,
    height: 12,
    borderRadius: 4,
    marginBottom: 8,
  },
  gymDetailValue: {
    height: 16,
    borderRadius: 4,
  },
});

export default SkeletonProfile;
