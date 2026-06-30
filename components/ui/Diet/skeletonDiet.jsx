import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Animated, Dimensions } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const SkeletonDiet = ({
  header = true,
  priority = "medium", // "high", "medium", "low"
  type = "home", // "home", "reports", "analysis"
}) => {
  const shimmerAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(0)).current;
  const isFocused = useIsFocused();

  // Determine animation type based on priority
  const shouldUseShimmer = priority === "high";
  const shouldUsePulse = priority === "high" || priority === "medium";
  const shouldAnimate = isFocused; // Only animate when screen is focused

  useEffect(() => {
    if (!shouldAnimate) {
      // Stop animations when not focused
      shimmerAnim.stopAnimation();
      pulseAnim.stopAnimation();
      return;
    }

    let shimmerAnimation, pulseAnimation;

    // Shimmer animation (only for high priority)
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

    // Pulse animation (for high and medium priority)
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

  const SkeletonBox = ({ style, shimmer = false, pulse = true }) => {
    const useShimmerForThis = shimmer && shouldUseShimmer;
    const usePulseForThis = pulse && shouldUsePulse;

    if (priority === "low") {
      return (
        <View style={[styles.skeletonBase, style]}>
          <View style={[styles.skeletonContent, styles.staticContent]} />
        </View>
      );
    }

    return (
      <View style={[styles.skeletonBase, style]}>
        <Animated.View
          style={[
            styles.skeletonContent,
            usePulseForThis ? { opacity } : styles.staticContent,
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

  // Render header section (common for all types)
  const renderHeader = () => {
    if (!header) return null;

    return (
      <>
        <View style={styles.headerSection}>
          <SkeletonBox
            style={styles.headerTitle}
            shimmer={priority === "high"}
            pulse={priority !== "low"}
          />
          <SkeletonBox style={styles.headerBadge} pulse={priority !== "low"} />
        </View>

        {/* KyraAI Assistant */}
        <View style={styles.kyraSection}>
          <View style={styles.kyraMessageContainer}>
            <SkeletonBox
              style={styles.kyraMessage}
              shimmer={priority === "high"}
              pulse={priority !== "low"}
            />
          </View>
          <SkeletonBox style={styles.kyraAvatar} pulse={priority !== "low"} />
        </View>

        {/* Navigation Tabs */}
        <View style={styles.navTabs}>
          {[1, 2, 3].map((item) => (
            <View key={item} style={styles.navTab}>
              <SkeletonBox style={styles.navIcon} pulse={false} />
              <SkeletonBox style={styles.navText} pulse={false} />
            </View>
          ))}
        </View>
      </>
    );
  };

  // Render diet home skeleton
  const renderHomeSkeleton = () => (
    <View style={styles.content}>
      {/* Diet Action Cards */}
      {[1, 2, 3].map((item, index) => (
        <View key={item} style={styles.dietCard}>
          <View style={styles.dietCardContent}>
            <View style={styles.dietCardLeft}>
              <SkeletonBox
                style={[
                  styles.dietCardTitle,
                  {
                    width: index === 0 ? "75%" : index === 1 ? "65%" : "70%",
                  },
                ]}
                shimmer={priority === "high" && index === 0}
                pulse={priority !== "low"}
              />
              <SkeletonBox style={styles.dietCardSubtitle1} pulse={false} />
              <SkeletonBox style={styles.dietCardSubtitle2} pulse={false} />
              <SkeletonBox
                style={styles.dietCardButton}
                pulse={priority !== "low"}
              />
            </View>
            <SkeletonBox
              style={styles.dietCardImage}
              pulse={priority !== "low"}
            />
          </View>
        </View>
      ))}
    </View>
  );

  // Render diet reports skeleton
  const renderReportsSkeleton = () => (
    <View style={[styles.content, { paddingTop: -200 }]}>
      {/* Date Navigator */}
      <View style={styles.dateNavigatorSection}>
        <View style={styles.dateNavigator}>
          <SkeletonBox style={styles.navArrow} pulse={false} />
          <SkeletonBox style={styles.dateTitle} shimmer={priority === "high"} />
          <SkeletonBox style={styles.navArrow} pulse={false} />
        </View>

        {/* Week day strip */}
        <View style={styles.weekDayStrip}>
          {[1, 2, 3, 4, 5, 6, 7].map((item) => (
            <View key={item} style={styles.weekDayItem}>
              <SkeletonBox style={styles.weekDayCircle} pulse={false} />
              <SkeletonBox style={styles.weekDayText} pulse={false} />
            </View>
          ))}
        </View>
      </View>

      {/* Diet Progress Tracker */}
      <View style={styles.dietProgressSection}>
        <SkeletonBox
          style={styles.progressTitle}
          shimmer={priority === "high"}
        />

        {/* Main Semicircular Progress */}
        <View style={styles.mainProgressContainer}>
          <SkeletonBox
            style={styles.semicircleProgress}
            pulse={priority !== "low"}
          />

          {/* Center content */}
          <View style={styles.progressCenterContent}>
            <SkeletonBox style={styles.goalLabel} pulse={false} />
            <SkeletonBox
              style={styles.calorieValue}
              pulse={priority !== "low"}
            />
            <SkeletonBox style={styles.calorieTarget} pulse={false} />
          </View>
        </View>

        {/* Small Circular Progress Indicators */}
        <View style={styles.smallCirclesContainer}>
          {[1, 2, 3, 4, 5].map((item) => (
            <View key={item} style={styles.smallProgressItem}>
              <SkeletonBox
                style={styles.smallCircle}
                pulse={priority !== "low"}
              />
              <SkeletonBox style={styles.smallIcon} pulse={false} />
              <SkeletonBox style={styles.smallLabel} pulse={false} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  // Render diet analysis skeleton
  const renderAnalysisSkeleton = () => (
    <View style={styles.content}>
      {/* Streak Summary Card */}
      <View style={styles.streakSection}>
        {/* Main Streak Card */}
        <View style={styles.streakCard}>
          <View style={styles.streakContent}>
            <SkeletonBox style={styles.streakIcon} pulse={priority !== "low"} />
            <SkeletonBox
              style={styles.streakNumber}
              shimmer={priority === "high"}
            />
          </View>
          <SkeletonBox style={styles.streakLabel} pulse={false} />
        </View>

        {/* Bottom Stats Cards */}
        <View style={styles.statsCardsRow}>
          {[1, 2, 3].map((item) => (
            <View key={item} style={styles.statsCard}>
              <SkeletonBox style={styles.statsIcon} pulse={false} />
              <SkeletonBox style={styles.statsLabel} pulse={false} />
              <SkeletonBox
                style={styles.statsValue}
                pulse={priority !== "low"}
              />
            </View>
          ))}
        </View>
      </View>

      {/* Diet Progress Tracker (same as reports) */}
      <View style={styles.dietProgressSection}>
        <SkeletonBox
          style={styles.progressTitle}
          shimmer={priority === "high"}
        />

        {/* Main Semicircular Progress */}
        <View style={styles.mainProgressContainer}>
          <SkeletonBox
            style={styles.semicircleProgress}
            pulse={priority !== "low"}
          />

          {/* Center content */}
          <View style={styles.progressCenterContent}>
            <SkeletonBox style={styles.goalLabel} pulse={false} />
            <SkeletonBox
              style={styles.calorieValue}
              pulse={priority !== "low"}
            />
            <SkeletonBox style={styles.calorieTarget} pulse={false} />
          </View>
        </View>

        {/* Small Circular Progress Indicators */}
        <View style={styles.smallCirclesContainer}>
          {[1, 2, 3, 4, 5].map((item) => (
            <View key={item} style={styles.smallProgressItem}>
              <SkeletonBox
                style={styles.smallCircle}
                pulse={priority !== "low"}
              />
              <SkeletonBox style={styles.smallIcon} pulse={false} />
              <SkeletonBox style={styles.smallLabel} pulse={false} />
            </View>
          ))}
        </View>
      </View>
    </View>
  );

  // Main render function
  const renderContent = () => {
    switch (type) {
      case "reports":
        return renderReportsSkeleton();
      case "analysis":
        return renderAnalysisSkeleton();
      default:
        return renderHomeSkeleton();
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
    paddingTop: 40,
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
    paddingHorizontal: 15,
  },

  // Header styles (same as workout)
  headerSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 15,
  },
  headerTitle: {
    width: 80,
    height: 24,
    borderRadius: 4,
  },
  headerBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  kyraSection: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  kyraMessageContainer: {
    flex: 1,
    marginRight: 15,
  },
  kyraMessage: {
    width: "85%",
    height: 45,
    borderRadius: 25,
  },
  kyraAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  navTabs: {
    flexDirection: "row",
    justifyContent: "space-around",
    paddingHorizontal: 20,
    paddingVertical: 20,
    backgroundColor: "transparent",
    marginBottom: 15,
  },
  navTab: {
    alignItems: "center",
    flex: 1,
  },
  navIcon: {
    width: 28,
    height: 28,
    borderRadius: 6,
    marginBottom: 8,
  },
  navText: {
    width: 60,
    height: 12,
    borderRadius: 6,
  },

  // Common styles
  content: {
    flex: 1,
  },

  // Diet home skeleton styles
  dietCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 15,
    padding: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  dietCardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  dietCardLeft: {
    flex: 1,
    paddingRight: 20,
  },
  dietCardTitle: {
    height: 22,
    borderRadius: 4,
    marginBottom: 12,
  },
  dietCardSubtitle1: {
    width: "90%",
    height: 14,
    borderRadius: 4,
    marginBottom: 6,
  },
  dietCardSubtitle2: {
    width: "75%",
    height: 14,
    borderRadius: 4,
    marginBottom: 16,
  },
  dietCardButton: {
    width: 90,
    height: 32,
    borderRadius: 16,
  },
  dietCardImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },

  // Date navigator styles (same as workout reports)
  dateNavigatorSection: {
    backgroundColor: "#fff",
    borderRadius: 15,
    marginBottom: 15,
    padding: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    marginTop: 220,
  },
  dateNavigator: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 15,
  },
  navArrow: {
    width: 24,
    height: 24,
    borderRadius: 4,
  },
  dateTitle: {
    width: 120,
    height: 20,
    borderRadius: 4,
  },
  weekDayStrip: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  weekDayItem: {
    alignItems: "center",
  },
  weekDayCircle: {
    width: 35,
    height: 35,
    borderRadius: 20,
    marginBottom: 5,
  },
  weekDayText: {
    width: 25,
    height: 12,
    borderRadius: 6,
  },

  // Diet progress tracker styles
  dietProgressSection: {
    backgroundColor: "#fff",
    borderRadius: 20,
    padding: 20,
    marginBottom: 15,
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  progressTitle: {
    width: 120,
    height: 18,
    borderRadius: 4,
    marginBottom: 20,
  },
  mainProgressContainer: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 20,
    position: "relative",
  },
  semicircleProgress: {
    width: 230,
    height: 115,
    borderRadius: 115,
  },
  progressCenterContent: {
    position: "absolute",
    alignItems: "center",
    justifyContent: "center",
    top: 30,
  },
  goalLabel: {
    width: 40,
    height: 14,
    borderRadius: 4,
    marginBottom: 8,
  },
  calorieValue: {
    width: 80,
    height: 20,
    borderRadius: 4,
    marginBottom: 6,
  },
  calorieTarget: {
    width: 100,
    height: 14,
    borderRadius: 4,
  },
  smallCirclesContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 20,
  },
  smallProgressItem: {
    alignItems: "center",
    flex: 1,
  },
  smallCircle: {
    width: 50,
    height: 50,
    borderRadius: 30,
    marginBottom: 8,
  },
  smallIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginBottom: 6,
  },
  smallLabel: {
    width: 40,
    height: 12,
    borderRadius: 4,
  },

  // Streak section styles (for analysis)
  streakSection: {
    marginBottom: 20,
  },
  streakCard: {
    backgroundColor: "#fff",

    borderRadius: 20,
    padding: 20,
    alignItems: "center",
    marginBottom: 20,
  },
  streakContent: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  streakIcon: {
    width: 30,
    height: 30,
    borderRadius: 4,
    marginRight: 10,
  },
  streakNumber: {
    width: 50,
    height: 28,
    borderRadius: 4,
  },
  streakLabel: {
    width: 80,
    height: 16,
    borderRadius: 4,
  },
  statsCardsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  statsCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    width: width * 0.28,
    alignItems: "center",
    paddingVertical: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statsIcon: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginBottom: 8,
  },
  statsLabel: {
    width: 50,
    height: 12,
    borderRadius: 4,
    marginBottom: 6,
  },
  statsValue: {
    width: 30,
    height: 16,
    borderRadius: 4,
  },
});

export default SkeletonDiet;
