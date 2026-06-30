import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Animated, Dimensions } from "react-native";
import { useIsFocused } from "@react-navigation/native";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const SkeletonWorkout = ({
  header = false,
  priority = "medium", // "high", "medium", "low"
  type = "workout", // "workout", "reports", "analysis", "transformation"
  gap,
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
            duration: priority === "high" ? 800 : 1000, // Slower for medium priority
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
        outputRange: priority === "high" ? [0.3, 0.8] : [0.4, 0.7], // Less contrast for medium priority
      })
    : new Animated.Value(0.5); // Static opacity for low priority

  const SkeletonBox = ({ style, shimmer = false, pulse = true }) => {
    // Determine if this specific element should animate based on priority and props
    const useShimmerForThis = shimmer && shouldUseShimmer;
    const usePulseForThis = pulse && shouldUsePulse;

    if (priority === "low") {
      // Static skeleton for low priority
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
          {[1, 2, 3, 4].map((item) => (
            <View key={item} style={styles.navTab}>
              <SkeletonBox
                style={styles.navIcon}
                pulse={false} // Nav icons are always static for performance
              />
              <SkeletonBox
                style={styles.navText}
                pulse={false} // Nav text is always static for performance
              />
            </View>
          ))}
        </View>
      </>
    );
  };

  // Render workout skeleton (original)
  const renderWorkoutSkeleton = () => (
    <View style={[styles.content, { marginTop: 25 }]}>
      {[1, 2, 3, 4, 5].map((item, index) => (
        <View key={item} style={styles.workoutCard}>
          <View style={styles.cardContent}>
            <View style={styles.cardLeft}>
              <SkeletonBox
                style={[
                  styles.cardTitle,
                  {
                    width: index === 0 ? "70%" : index === 1 ? "85%" : "65%",
                  },
                ]}
                shimmer={priority === "high" && index === 0}
                pulse={priority !== "low"}
              />
              <SkeletonBox style={styles.cardSubtitle1} pulse={false} />
              <SkeletonBox style={styles.cardSubtitle2} pulse={false} />
              <SkeletonBox
                style={styles.cardButton}
                pulse={priority !== "low"}
              />
            </View>
            <SkeletonBox
              style={styles.cardCharacter}
              pulse={priority !== "low"}
            />
          </View>
        </View>
      ))}
    </View>
  );

  // Render reports skeleton
  const renderReportsSkeleton = () => (
    <View style={styles.contentReport}>
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

      {/* Entry/Exit Section */}
      <View style={styles.entryExitSection}>
        <View style={styles.entryExitCard}>
          <SkeletonBox
            style={styles.characterImage}
            pulse={priority !== "low"}
          />
          <SkeletonBox style={styles.timeText} pulse={false} />
          <SkeletonBox style={styles.labelText} pulse={false} />
        </View>

        <View style={styles.durationCard}>
          <SkeletonBox style={styles.durationText} pulse={priority !== "low"} />
        </View>

        <View style={styles.entryExitCard}>
          <SkeletonBox
            style={styles.characterImage}
            pulse={priority !== "low"}
          />
          <SkeletonBox style={styles.timeText} pulse={false} />
          <SkeletonBox style={styles.labelText} pulse={false} />
        </View>
      </View>

      {/* Workout Details Section */}
      <View style={styles.sectionCard}>
        <SkeletonBox
          style={styles.sectionTitle}
          shimmer={priority === "high"}
        />
        <View style={styles.tabStrip}>
          {[1, 2, 3].map((item) => (
            <SkeletonBox key={item} style={styles.tabItem} pulse={false} />
          ))}
        </View>
        <SkeletonBox style={styles.noDataText} pulse={false} />
      </View>

      {/* Progress Section */}
      <View style={styles.sectionCard}>
        <SkeletonBox
          style={styles.sectionTitle}
          shimmer={priority === "high"}
        />
        <View style={styles.progressStatsRow}>
          {[1, 2, 3].map((item) => (
            <View key={item} style={styles.progressStat}>
              <SkeletonBox
                style={styles.progressImage}
                pulse={priority !== "low"}
              />
              <SkeletonBox style={styles.statValue} pulse={false} />
              <SkeletonBox style={styles.statLabel} pulse={false} />
            </View>
          ))}
        </View>
      </View>

      {/* Photo Section */}
      <View style={styles.sectionCard}>
        <SkeletonBox
          style={styles.sectionTitle}
          shimmer={priority === "high"}
        />
        <View style={styles.photoGrid}>
          <SkeletonBox
            style={styles.uploadPhotoTile}
            pulse={priority !== "low"}
          />
          <SkeletonBox style={styles.photoTile} pulse={false} />
          <SkeletonBox style={styles.photoTile} pulse={false} />
        </View>
      </View>
    </View>
  );

  // Render analysis skeleton
  const renderAnalysisSkeleton = () => (
    <View style={styles.content}>
      {/* Progress Comments Section */}
      <View style={styles.progressCommentsSection}>
        <SkeletonBox
          style={styles.progressTitle}
          shimmer={priority === "high"}
        />
        <SkeletonBox
          style={styles.progressSubtitle}
          pulse={priority !== "low"}
        />

        {/* Comment Cards */}
        {[1, 2, 3].map((item) => (
          <View key={item} style={styles.commentCard}>
            <SkeletonBox style={styles.commentIcon} pulse={false} />
            <SkeletonBox style={styles.commentText} pulse={false} />
          </View>
        ))}
      </View>

      {/* Overall Workout Data Section */}
      <View style={styles.sectionCard}>
        <SkeletonBox
          style={styles.sectionTitle}
          shimmer={priority === "high"}
        />
        <View style={styles.chartContainer}>
          <SkeletonBox
            style={styles.chartSkeleton}
            pulse={priority !== "low"}
          />
        </View>
      </View>

      {/* Aggregated Insights Section */}
      <View style={styles.sectionCard}>
        <SkeletonBox
          style={styles.sectionTitle}
          shimmer={priority === "high"}
        />
        <View style={styles.tabStrip}>
          {[1, 2, 3].map((item) => (
            <SkeletonBox key={item} style={styles.tabItem} pulse={false} />
          ))}
        </View>
        <View style={styles.chartContainer}>
          <SkeletonBox
            style={styles.barChartSkeleton}
            pulse={priority !== "low"}
          />
        </View>
      </View>

      {/* Muscle Group Insights Section */}
      <View style={styles.sectionCard}>
        <SkeletonBox
          style={styles.sectionTitle}
          shimmer={priority === "high"}
        />
        <SkeletonBox
          style={styles.dropdownSkeleton}
          pulse={priority !== "low"}
        />
        <View style={styles.tabStrip}>
          {[1, 2].map((item) => (
            <SkeletonBox key={item} style={styles.tabItem} pulse={false} />
          ))}
        </View>
        <View style={styles.chartContainer}>
          <SkeletonBox
            style={styles.chartSkeleton}
            pulse={priority !== "low"}
          />
        </View>
      </View>
    </View>
  );

  // Render transformation skeleton
  const renderTransformationSkeleton = () => (
    <View style={styles.content}>
      {/* Transformation Journey Section */}
      <View style={styles.sectionCard}>
        <SkeletonBox
          style={styles.sectionTitle}
          shimmer={priority === "high"}
        />

        {/* Date Selection */}
        <View style={styles.dateSelectionRow}>
          <SkeletonBox style={styles.dateInput} pulse={priority !== "low"} />
          <SkeletonBox style={styles.dateInput} pulse={priority !== "low"} />
        </View>

        <SkeletonBox style={styles.helperText} pulse={false} />
        <SkeletonBox
          style={styles.transformationButton}
          shimmer={priority === "high"}
        />
      </View>

      {/* Upload Section */}
      <View style={styles.sectionCard}>
        <SkeletonBox
          style={styles.sectionTitle}
          shimmer={priority === "high"}
        />
        <SkeletonBox style={styles.uploadButton} pulse={priority !== "low"} />
      </View>
    </View>
  );

  // Render gym buttons (for workout and reports)
  const renderGymButtons = () => {
    if (type === "reports" || type === "analysis" || type === "transformation")
      return null;

    return (
      <View style={styles.gymButtonsSection}>
        <View style={styles.gymButtonsContainer}>
          <View style={styles.gymButtonWrapper}>
            <SkeletonBox
              style={styles.gymButton}
              shimmer={priority === "high"}
              pulse={priority !== "low"}
            />
          </View>
          <View style={styles.gymButtonWrapper}>
            <SkeletonBox
              style={styles.gymButton}
              shimmer={priority === "high"}
              pulse={priority !== "low"}
            />
          </View>
        </View>
      </View>
    );
  };

  // Main render function
  const renderContent = () => {
    switch (type) {
      case "reports":
        return renderReportsSkeleton();
      case "analysis":
        return renderAnalysisSkeleton();
      case "transformation":
        return renderTransformationSkeleton();
      default:
        return renderWorkoutSkeleton();
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      {renderHeader()}
      <View style={styles.scrollableContent}>{renderContent()}</View>
      {renderGymButtons()}
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

  // Header styles
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
  sectionCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    marginBottom: 15,
    padding: 15,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  sectionTitle: {
    width: "60%",
    height: 20,
    borderRadius: 4,
    marginBottom: 15,
  },

  // Workout skeleton styles (original)
  workoutCard: {
    backgroundColor: "#fff",
    borderRadius: 20,
    marginBottom: 15,
    padding: 20,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    marginHorizontal: 5,
  },
  cardContent: {
    flexDirection: "row",
    alignItems: "center",
  },
  cardLeft: {
    flex: 1,
    paddingRight: 20,
  },
  cardTitle: {
    height: 22,
    borderRadius: 4,
    marginBottom: 12,
  },
  cardSubtitle1: {
    width: "95%",
    height: 14,
    borderRadius: 4,
    marginBottom: 6,
  },
  cardSubtitle2: {
    width: "70%",
    height: 14,
    borderRadius: 4,
    marginBottom: 16,
  },
  cardButton: {
    width: 85,
    height: 32,
    borderRadius: 16,
  },
  cardCharacter: {
    width: 90,
    height: 90,
    borderRadius: 12,
  },

  // Reports skeleton styles
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
  },
  contentReport: {
    flex: 1,
    marginTop: 130,
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
  entryExitSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  entryExitCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 15,
    alignItems: "center",
    flex: 0.3,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  durationCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 15,
    justifyContent: "center",
    alignItems: "center",
    flex: 0.35,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  characterImage: {
    width: 80,
    height: 80,
    borderRadius: 10,
    marginBottom: 10,
  },
  timeText: {
    width: 50,
    height: 14,
    borderRadius: 4,
    marginBottom: 5,
  },
  labelText: {
    width: 60,
    height: 12,
    borderRadius: 4,
  },
  durationText: {
    width: 80,
    height: 16,
    borderRadius: 4,
  },
  tabStrip: {
    flexDirection: "row",
    marginBottom: 15,
  },
  tabItem: {
    width: 80,
    height: 30,
    borderRadius: 8,
    marginRight: 10,
  },
  noDataText: {
    width: "60%",
    height: 16,
    borderRadius: 4,
    alignSelf: "center",
  },
  progressStatsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressStat: {
    alignItems: "center",
    flex: 1,
    marginHorizontal: 5,
  },
  progressImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginBottom: 10,
  },
  statValue: {
    width: 60,
    height: 16,
    borderRadius: 4,
    marginBottom: 5,
  },
  statLabel: {
    width: 50,
    height: 12,
    borderRadius: 4,
  },
  photoGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  uploadPhotoTile: {
    width: "30%",
    height: 80,
    borderRadius: 10,
    marginBottom: 10,
  },
  photoTile: {
    width: "30%",
    height: 80,
    borderRadius: 10,
    marginBottom: 10,
  },

  // Analysis skeleton styles
  progressCommentsSection: {
    backgroundColor: "rgba(41,125,179,0.09)",
    borderRadius: 15,
    padding: 15,
    marginBottom: 15,
  },
  progressTitle: {
    width: 80,
    height: 16,
    borderRadius: 4,
    marginBottom: 8,
  },
  progressSubtitle: {
    width: 200,
    height: 18,
    borderRadius: 4,
    marginBottom: 15,
  },
  commentCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  commentIcon: {
    width: 24,
    height: 24,
    borderRadius: 4,
    marginRight: 12,
  },
  commentText: {
    flex: 1,
    height: 14,
    borderRadius: 4,
  },
  chartContainer: {
    height: 200,
    backgroundColor: "#fff",
    borderRadius: 10,
    padding: 15,
  },
  chartSkeleton: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  barChartSkeleton: {
    width: "100%",
    height: "100%",
    borderRadius: 8,
  },
  dropdownSkeleton: {
    width: "100%",
    height: 50,
    borderRadius: 8,
    marginBottom: 15,
  },

  // Transformation skeleton styles
  dateSelectionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  dateInput: {
    width: "47%",
    height: 50,
    borderRadius: 8,
  },
  helperText: {
    width: "80%",
    height: 14,
    borderRadius: 4,
    alignSelf: "center",
    marginBottom: 20,
  },
  transformationButton: {
    width: "100%",
    height: 50,
    borderRadius: 8,
  },
  uploadButton: {
    width: "100%",
    height: 150,
    borderRadius: 10,
  },

  // Gym buttons styles
  gymButtonsSection: {
    backgroundColor: "#F7F7F7",
    paddingTop: 10,
  },
  gymButtonsContainer: {
    flexDirection: "row",
    paddingHorizontal: 20,
    paddingVertical: 15,
    gap: 15,
  },
  gymButtonWrapper: {
    flex: 1,
  },
  gymButton: {
    height: 50,
    borderRadius: 12,
  },
});

export default SkeletonWorkout;
