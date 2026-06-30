import React, { useEffect, useRef } from "react";
import { StyleSheet, View, Animated, Dimensions, Platform } from "react-native";
import { useIsFocused } from "@react-navigation/native";

const { width, height } = Dimensions.get("window");
const responsiveWidth = (percentage) => width * (percentage / 100);
const responsiveHeight = (percentage) => height * (percentage / 100);

const SkeletonHome = ({
  header = true,
  priority = "high", // "high", "medium", "low"
  type = "home", // "home", "mygym", "studios", "buddy", "water", "reminders", "analysis", "leaderboard"
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
        }),
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
        ]),
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

  // Header Section (same for all types)
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

        {/* KyraAI Assistant - Only for home page */}

        {/* Navigation Tabs */}
        <View style={styles.navTabs}>
          {[1, 2, 3, 4].map((item) => (
            <View key={item} style={styles.navTab}>
              <SkeletonBox style={styles.navIcon} pulse={false} />
              <SkeletonBox style={styles.navText} pulse={false} />
            </View>
          ))}
        </View>
      </>
    );
  };

  // HOME PAGE SKELETON (Priority: HIGH)
  const renderHomeSkeleton = () => (
    <View style={styles.homeContainer}>
      {/* User Greeting Card */}
      <View style={styles.userGreetingCard}>
        <View style={styles.greetingLeft}>
          <SkeletonBox style={styles.userAvatar} shimmer={true} pulse={true} />
          <View style={styles.greetingText}>
            <SkeletonBox style={styles.greetingLine1} shimmer={true} />
            <SkeletonBox style={styles.greetingLine2} pulse={false} />
          </View>
        </View>
        <View style={styles.greetingRight}>
          <SkeletonBox style={styles.xpBadge} pulse={true} />
          <SkeletonBox style={styles.rewardIcon} pulse={true} />
        </View>
      </View>

      {/* Weight Progress Card */}
      <View style={styles.progressCard}>
        <SkeletonBox style={styles.progressTitle} shimmer={true} />
        <View style={styles.progressContent}>
          <View style={styles.progressLeft}>
            <SkeletonBox
              style={styles.progressCircle}
              shimmer={true}
              pulse={true}
            />
            <View style={styles.progressStats}>
              <SkeletonBox style={styles.progressStat} pulse={false} />
              <SkeletonBox style={styles.progressStat} pulse={false} />
              <SkeletonBox style={styles.progressStat} pulse={false} />
            </View>
          </View>
          <View style={styles.progressCharacters}>
            <SkeletonBox style={styles.characterImage} pulse={true} />
          </View>
        </View>
      </View>

      {/* Scan Food Card */}
      <View style={styles.scanFoodCard}>
        <SkeletonBox style={styles.scanTitle} shimmer={true} />
        <View style={styles.scanContent}>
          <View style={styles.scanLeft}>
            <SkeletonBox style={styles.qrCode} pulse={true} />
            <View style={styles.foodIcons}>
              {[1, 2, 3, 4, 5].map((item) => (
                <SkeletonBox key={item} style={styles.foodIcon} pulse={false} />
              ))}
            </View>
          </View>
          <SkeletonBox style={styles.scanCharacter} pulse={true} />
        </View>
      </View>

      {/* Bottom Action Cards */}
      <View style={styles.bottomCards}>
        <SkeletonBox style={styles.actionCard} pulse={true} />
        <SkeletonBox style={styles.actionCard} pulse={true} />
      </View>
    </View>
  );

  // MY GYM SKELETON (Priority: MEDIUM)
  const renderMyGymSkeleton = () => (
    <View style={styles.myGymContainer}>
      {/* Trainer Card */}
      <View style={styles.trainerCard}>
        <SkeletonBox style={styles.trainerAvatar} pulse={true} />
        <View style={styles.trainerInfo}>
          <SkeletonBox style={styles.trainerLabel} pulse={false} />
          <SkeletonBox
            style={styles.trainerName}
            shimmer={priority === "high"}
          />
        </View>
      </View>

      {/* Stats Cards */}
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <SkeletonBox style={styles.statIcon} pulse={true} />
          <SkeletonBox style={styles.statNumber} pulse={true} />
          <SkeletonBox style={styles.statLabel} pulse={false} />
        </View>
        <View style={styles.statCard}>
          <SkeletonBox style={styles.statIcon} pulse={true} />
          <SkeletonBox style={styles.statNumber} pulse={true} />
          <SkeletonBox style={styles.statLabel} pulse={false} />
        </View>
      </View>

      {/* Service Icons Grid */}
      <View style={styles.servicesGrid}>
        {[1, 2, 3].map((item) => (
          <View key={item} style={styles.serviceItem}>
            <SkeletonBox
              style={styles.serviceIcon}
              pulse={priority !== "low"}
            />
            <SkeletonBox style={styles.serviceLabel} pulse={false} />
          </View>
        ))}
      </View>

      {/* Data Sharing Section */}
      <View style={styles.dataSharingSection}>
        <View style={styles.dataSharingHeader}>
          <SkeletonBox style={styles.dataSharingIcon} pulse={false} />
          <SkeletonBox
            style={styles.dataSharingTitle}
            pulse={priority !== "low"}
          />
          <SkeletonBox style={styles.toggleSwitch} pulse={true} />
        </View>
        <SkeletonBox style={styles.dataSharingDescription} pulse={false} />
      </View>
    </View>
  );

  // Fitness Studios SKELETON
  const renderStudiosSkeleton = () => (
    <View style={styles.studiosContainer}>
      {/* Search Section */}
      <View style={styles.searchSection}>
        <SkeletonBox style={styles.searchBar} pulse={priority !== "low"} />
        <SkeletonBox style={styles.filterButton} pulse={false} />
      </View>

      {/* Location Section */}
      <View style={styles.locationSection}>
        <SkeletonBox style={styles.locationInfo} pulse={priority !== "low"} />
        <SkeletonBox style={styles.changeButton} pulse={false} />
      </View>

      <SkeletonBox style={styles.gymsFoundText} pulse={false} />

      {/* Gym Cards */}
      {[1, 2].map((item) => (
        <View key={item} style={styles.gymCard}>
          <SkeletonBox style={styles.gymImage} pulse={priority !== "low"} />
          <View style={styles.gymDetails}>
            <SkeletonBox style={styles.gymName} pulse={priority !== "low"} />
            <SkeletonBox style={styles.gymLocation} pulse={false} />
            <SkeletonBox style={styles.servicesLabel} pulse={false} />
            <View style={styles.servicesBadges}>
              {[1, 2, 3, 4].map((badge) => (
                <SkeletonBox
                  key={badge}
                  style={styles.serviceBadge}
                  pulse={false}
                />
              ))}
            </View>
            <SkeletonBox style={styles.joinButton} pulse={priority !== "low"} />
          </View>
          <SkeletonBox style={styles.verifiedBadge} pulse={false} />
        </View>
      ))}
    </View>
  );

  // GYM BUDDY SKELETON
  const renderBuddySkeleton = () => (
    <View style={styles.buddyContainer}>
      {/* Tabs */}
      <View style={styles.buddyTabs}>
        {["Upcoming", "My Sessions", "Joined"].map((tab, index) => (
          <SkeletonBox
            key={tab}
            style={[styles.buddyTab, index === 0 && styles.activeTab]}
            pulse={false}
          />
        ))}
      </View>

      {/* Session Cards */}
      {[1, 2].map((item) => (
        <View key={item} style={styles.sessionCard}>
          <View style={styles.sessionHeader}>
            <SkeletonBox style={styles.userAvatarSmall} pulse={false} />
            <SkeletonBox style={styles.sessionUser} pulse={false} />
            <SkeletonBox style={styles.sessionDate} pulse={false} />
            <SkeletonBox
              style={styles.sessionBadge}
              pulse={priority !== "low"}
            />
          </View>

          <View style={styles.sessionContent}>
            <View style={styles.sessionDetails}>
              <SkeletonBox style={styles.sessionTime} pulse={false} />
              <SkeletonBox style={styles.sessionParticipants} pulse={false} />
              <SkeletonBox style={styles.sessionGender} pulse={false} />
              <SkeletonBox style={styles.sessionWorkout} pulse={false} />
              <SkeletonBox style={styles.participantsLabel} pulse={false} />
            </View>
            <SkeletonBox
              style={styles.sessionCharacter}
              pulse={priority !== "low"}
            />
          </View>
        </View>
      ))}

      {/* Add Button */}
      <SkeletonBox style={styles.addButton} pulse={priority !== "low"} />
    </View>
  );

  // WATER TRACKER SKELETON
  const renderWaterSkeleton = () => (
    <View style={styles.waterContainer}>
      {/* Water Image */}
      <View style={styles.waterImageContainer}>
        <SkeletonBox style={styles.waterImage} pulse={priority !== "low"} />
      </View>

      {/* Status text + Progress bar */}
      <SkeletonBox style={styles.waterStatusText} pulse={false} />
      <SkeletonBox style={styles.waterProgressBar} pulse={priority !== "low"} />

      {/* Scale labels */}
      <View style={styles.waterScaleRow}>
        {[0, 1, 2, 3, 4].map((i) => (
          <SkeletonBox key={i} style={styles.waterScaleLabel} pulse={false} />
        ))}
      </View>

      {/* Goal Row */}
      <View style={styles.waterGoalRow}>
        <SkeletonBox style={styles.waterGoalCard} pulse={false} />
        <SkeletonBox style={styles.waterSetGoalCard} pulse={false} />
      </View>

      {/* Add 250ml Button */}
      <SkeletonBox style={styles.waterAddButton} pulse={priority !== "low"} />

      {/* Last drink row */}
      <SkeletonBox style={styles.waterLastDrink} pulse={false} />

      {/* Streak section title */}
      <SkeletonBox style={styles.waterStreakTitle} pulse={false} />

      {/* Streak circles row */}
      <View style={styles.waterStreakRow}>
        {[0, 1, 2, 3, 4, 5, 6].map((i) => (
          <View key={i} style={styles.waterStreakItem}>
            <SkeletonBox style={styles.waterStreakCircle} pulse={priority !== "low"} />
            <SkeletonBox style={styles.waterStreakLabel} pulse={false} />
          </View>
        ))}
      </View>
    </View>
  );

  // REMINDERS SKELETON
  const renderRemindersSkeleton = () => (
    <View style={styles.remindersContainer}>
      {/* Water Reminder Card */}
      <View style={styles.waterReminderCard}>
        <View style={styles.reminderCardContent}>
          <SkeletonBox
            style={styles.reminderTitle}
            pulse={priority !== "low"}
          />
          <SkeletonBox style={styles.reminderSubtitle} pulse={false} />
          <SkeletonBox
            style={styles.setReminderButton}
            pulse={priority !== "low"}
          />
        </View>
        <SkeletonBox
          style={styles.reminderCharacters}
          pulse={priority !== "low"}
        />

        {/* Pagination Dots */}
        <View style={styles.reminderPagination}>
          {[1, 2, 3, 4].map((dot) => (
            <SkeletonBox key={dot} style={styles.paginationDot} pulse={false} />
          ))}
        </View>
      </View>

      {/* Reminder List Items */}
      {[1, 2].map((item) => (
        <View key={item} style={styles.reminderItem}>
          <SkeletonBox style={styles.reminderIcon} pulse={false} />
          <View style={styles.reminderDetails}>
            <SkeletonBox style={styles.reminderName} pulse={false} />
            <SkeletonBox style={styles.reminderCategory} pulse={false} />
            <SkeletonBox style={styles.reminderTime} pulse={false} />

            {/* Days of Week */}
            <View style={styles.daysRow}>
              {["M", "T", "W", "T", "F", "S", "S"].map((day, index) => (
                <SkeletonBox
                  key={day + index}
                  style={[
                    styles.dayCircle,
                    // index === 4 && styles.activeDayCircle,
                  ]}
                  pulse={false}
                />
              ))}
            </View>
          </View>
          <View style={styles.reminderActions}>
            <SkeletonBox style={styles.reminderActionIcon} pulse={false} />
            <SkeletonBox style={styles.reminderActionIcon} pulse={false} />
          </View>
        </View>
      ))}

      {/* Add Button */}
      {/* <SkeletonBox style={styles.addButton} pulse={priority !== "low"} /> */}
    </View>
  );

  // ANALYSIS SKELETON
  const renderAnalysisSkeleton = () => (
    <View style={styles.analysisContainer}>
      {/* Average Gym Time Card */}
      <View style={styles.avgTimeCard}>
        <SkeletonBox style={styles.avgTimeTitle} pulse={priority !== "low"} />
        <View style={styles.avgTimeContent}>
          <View style={styles.avgTimeStats}>
            <SkeletonBox style={styles.timeIcon} pulse={false} />
            <SkeletonBox style={styles.timeValue} pulse={priority !== "low"} />
          </View>
          <SkeletonBox
            style={styles.avgTimeCharacter}
            pulse={priority !== "low"}
          />
        </View>
      </View>

      {/* Monthly Trends */}
      <View style={styles.trendsCard}>
        <SkeletonBox style={styles.trendsTitle} pulse={priority !== "low"} />
        <SkeletonBox style={styles.trendsSubtitle} pulse={false} />

        {/* Chart Area */}
        <View style={styles.chartContainer}>
          <SkeletonBox
            style={styles.chartSkeleton}
            pulse={priority !== "low"}
          />

          {/* Chart Labels */}
          <View style={styles.chartLabels}>
            {["Mar", "Apr", "May", "Jun", "Jul", "Aug"].map((month) => (
              <SkeletonBox
                key={month}
                style={styles.chartLabel}
                pulse={false}
              />
            ))}
          </View>
        </View>
      </View>
    </View>
  );

  // LEADERBOARD SKELETON
  const renderLeaderboardSkeleton = () => (
    <View style={styles.leaderboardContainer}>
      {/* Trophy Header */}
      {/* <View style={styles.trophyHeader}>
        <SkeletonBox
          style={styles.trophyImage}
          pulse={priority !== "low"}
          gradient={true}
        />
      </View> */}

      {/* Time Period Tabs */}
      <View style={styles.periodTabs}>
        {["Today", "This Month", "Overall"].map((period, index) => (
          <SkeletonBox
            key={period}
            style={[styles.periodTab, index === 1 && styles.activePeriodTab]}
            pulse={false}
          />
        ))}
      </View>

      {/* Top 3 Winners */}
      <View style={styles.topWinnersCard}>
        <View style={styles.winnersRow}>
          {[1, 2, 3].map((position) => (
            <View key={position} style={styles.winnerItem}>
              <SkeletonBox
                style={styles.winnerAvatar}
                pulse={priority !== "low"}
              />
              <SkeletonBox style={styles.winnerName} pulse={false} />
              <SkeletonBox
                style={styles.winnerScore}
                pulse={priority !== "low"}
              />
            </View>
          ))}
        </View>
      </View>

      {/* Ranking List */}
      {[4, 5].map((rank) => (
        <View key={rank} style={styles.rankingItem}>
          <SkeletonBox style={styles.rankNumber} pulse={false} />
          <SkeletonBox style={styles.rankAvatar} pulse={false} />
          <View style={styles.rankDetails}>
            <SkeletonBox style={styles.rankName} pulse={false} />
            <SkeletonBox style={styles.rankLevel} pulse={false} />
          </View>
          <SkeletonBox style={styles.rankScore} pulse={priority !== "low"} />
        </View>
      ))}
    </View>
  );

  // Main render function
  const renderContent = () => {
    switch (type) {
      case "home":
        return renderHomeSkeleton();
      case "mygym":
        return renderMyGymSkeleton();
      case "studios":
        return renderStudiosSkeleton();
      case "buddy":
        return renderBuddySkeleton();
      case "water":
        return renderWaterSkeleton();
      case "reminders":
        return renderRemindersSkeleton();
      case "analysis":
        return renderAnalysisSkeleton();
      case "leaderboard":
        return renderLeaderboardSkeleton();
      default:
        return renderHomeSkeleton();
    }
  };

  return (
    <View style={styles.container}>
      {renderHeader()}
      <View style={styles.scrollableContent}>{renderContent()}</View>
    </View>
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
    paddingHorizontal: 15,
  },

  // Header styles (same as original)
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
    paddingVertical: 5,
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

  // HOME PAGE SKELETON STYLES
  homeContainer: {
    flex: 1,
  },
  userGreetingCard: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  greetingLeft: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  userAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  greetingText: {
    flex: 1,
  },
  greetingLine1: {
    width: "80%",
    height: 16,
    borderRadius: 4,
    marginBottom: 5,
  },
  greetingLine2: {
    width: "60%",
    height: 14,
    borderRadius: 4,
  },
  greetingRight: {
    alignItems: "center",
  },
  xpBadge: {
    width: 60,
    height: 20,
    borderRadius: 10,
    marginBottom: 5,
  },
  rewardIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
  },
  progressCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  progressTitle: {
    width: 120,
    height: 20,
    borderRadius: 4,
    marginBottom: 20,
  },
  progressContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  progressLeft: {
    // flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  progressCircle: {
    width: 60,
    height: 60,
    borderRadius: 50,
    // marginBottom: 15,
  },
  progressStats: {
    width: "50%",
    gap: 8,
  },
  progressStat: {
    // width: "80%",
    height: 14,
    borderRadius: 4,
  },
  progressCharacters: {
    flexDirection: "row",
    gap: 10,
  },
  characterImage: {
    width: 70,
    height: 70,
    borderRadius: 10,
  },
  scanFoodCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  scanTitle: {
    width: 100,
    height: 20,
    borderRadius: 4,
    marginBottom: 20,
  },
  scanContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  scanLeft: {
    // flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 20,
  },
  qrCode: {
    width: 60,
    height: 60,
    borderRadius: 10,
    marginBottom: 15,
  },
  foodIcons: {
    flexDirection: "row",
    gap: 10,
  },
  foodIcon: {
    width: 20,
    height: 20,
    borderRadius: 12,
  },
  scanCharacter: {
    width: 60,
    height: 60,
    borderRadius: 10,
  },
  bottomCards: {
    flexDirection: "row",
    gap: 15,
  },
  actionCard: {
    flex: 1,
    height: 60,
    borderRadius: 12,
  },

  // MY GYM SKELETON STYLES
  myGymContainer: {
    flex: 1,
    marginTop: 150,
  },
  trainerCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  trainerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
  },
  trainerInfo: {
    flex: 1,
  },
  trainerLabel: {
    width: 80,
    height: 12,
    borderRadius: 4,
    marginBottom: 5,
  },
  trainerName: {
    width: "70%",
    height: 18,
    borderRadius: 4,
  },
  statsRow: {
    flexDirection: "row",
    gap: 15,
    marginBottom: 20,
  },
  statCard: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    alignItems: "center",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  statIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginBottom: 10,
  },
  statNumber: {
    width: 30,
    height: 24,
    borderRadius: 4,
    marginBottom: 5,
  },
  statLabel: {
    width: 80,
    height: 12,
    borderRadius: 4,
  },
  servicesGrid: {
    flexDirection: "row",
    justifyContent: "space-around",
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  serviceItem: {
    alignItems: "center",
    flex: 1,
  },
  serviceIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginBottom: 10,
  },
  serviceLabel: {
    width: 60,
    height: 12,
    borderRadius: 4,
  },
  dataSharingSection: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  dataSharingHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  dataSharingIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 15,
  },
  dataSharingTitle: {
    flex: 1,
    height: 18,
    borderRadius: 4,
  },
  toggleSwitch: {
    width: 50,
    height: 30,
    borderRadius: 15,
  },
  dataSharingDescription: {
    width: "90%",
    height: 14,
    borderRadius: 4,
  },

  // Fitness Studios SKELETON STYLES
  studiosContainer: {
    flex: 1,
  },
  searchSection: {
    flexDirection: "row",
    marginBottom: 15,
    gap: 10,
  },
  searchBar: {
    flex: 1,
    height: 50,
    borderRadius: 25,
  },
  filterButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  locationSection: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#E8F5E8",
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
  },
  locationInfo: {
    width: "70%",
    height: 16,
    borderRadius: 4,
  },
  changeButton: {
    width: 60,
    height: 30,
    borderRadius: 15,
  },
  gymsFoundText: {
    width: 100,
    height: 16,
    borderRadius: 4,
    marginBottom: 20,
    alignSelf: "center",
  },
  gymCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    marginBottom: 20,
    overflow: "hidden",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    position: "relative",
  },
  gymImage: {
    width: "100%",
    height: 200,
  },
  gymDetails: {
    padding: 20,
  },
  gymName: {
    width: "80%",
    height: 18,
    borderRadius: 4,
    marginBottom: 5,
  },
  gymLocation: {
    width: "70%",
    height: 14,
    borderRadius: 4,
    marginBottom: 15,
  },
  servicesLabel: {
    width: 60,
    height: 12,
    borderRadius: 4,
    marginBottom: 10,
  },
  servicesBadges: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 15,
  },
  serviceBadge: {
    width: 60,
    height: 25,
    borderRadius: 12,
  },
  joinButton: {
    width: 80,
    height: 35,
    borderRadius: 17,
    alignSelf: "flex-end",
  },
  verifiedBadge: {
    position: "absolute",
    top: 15,
    left: 15,
    width: 70,
    height: 25,
    borderRadius: 12,
  },

  // GYM BUDDY SKELETON STYLES
  buddyContainer: {
    flex: 1,
    marginTop: 130,
  },
  buddyTabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 5,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  buddyTab: {
    flex: 1,
    height: 35,
    borderRadius: 8,
  },
  activeTab: {
    // backgroundColor: "#007AFF",
  },
  sessionCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  sessionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  userAvatarSmall: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 10,
  },
  sessionUser: {
    flex: 1,
    height: 16,
    borderRadius: 4,
  },
  sessionDate: {
    width: 60,
    height: 14,
    borderRadius: 4,
    marginRight: 10,
  },
  sessionBadge: {
    width: 80,
    height: 25,
    borderRadius: 12,
  },
  sessionContent: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  sessionDetails: {
    flex: 1,
    gap: 8,
  },
  sessionTime: {
    width: 80,
    height: 14,
    borderRadius: 4,
  },
  sessionParticipants: {
    width: 100,
    height: 14,
    borderRadius: 4,
  },
  sessionGender: {
    width: 70,
    height: 14,
    borderRadius: 4,
  },
  sessionWorkout: {
    width: 60,
    height: 14,
    borderRadius: 4,
  },
  participantsLabel: {
    width: 90,
    height: 14,
    borderRadius: 4,
  },
  sessionCharacter: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  addButton: {
    position: "absolute",
    bottom: 30,
    right: 30,
    width: 60,
    height: 60,
    borderRadius: 30,
  },

  // WATER SKELETON STYLES
  waterContainer: {
    flex: 1,
    paddingTop: 10,
  },
  waterImageContainer: {
    alignItems: "center",
    marginBottom: 16,
  },
  waterImage: {
    width: 290,
    height: 245,
    borderRadius: 12,
  },
  waterStatusText: {
    width: 120,
    height: 14,
    borderRadius: 4,
    alignSelf: "center",
    marginBottom: 10,
  },
  waterProgressBar: {
    height: 14,
    borderRadius: 7,
    marginHorizontal: 20,
    marginBottom: 6,
  },
  waterScaleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginHorizontal: 20,
    marginBottom: 20,
  },
  waterScaleLabel: {
    width: 28,
    height: 10,
    borderRadius: 3,
  },
  waterGoalRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 18,
    paddingHorizontal: 20,
  },
  waterGoalCard: {
    width: 110,
    height: 56,
    borderRadius: 10,
  },
  waterSetGoalCard: {
    width: 110,
    height: 56,
    borderRadius: 10,
  },
  waterAddButton: {
    height: 50,
    borderRadius: 14,
    width: "70%",
    alignSelf: "center",
    marginBottom: 10,
  },
  waterLastDrink: {
    width: 160,
    height: 14,
    borderRadius: 4,
    alignSelf: "center",
    marginBottom: 22,
  },
  waterStreakTitle: {
    width: 140,
    height: 16,
    borderRadius: 4,
    marginBottom: 12,
    marginLeft: 20,
  },
  waterStreakRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  waterStreakItem: {
    alignItems: "center",
  },
  waterStreakCircle: {
    width: 42,
    height: 42,
    borderRadius: 21,
    marginBottom: 4,
  },
  waterStreakLabel: {
    width: 28,
    height: 10,
    borderRadius: 3,
  },

  // REMINDERS SKELETON STYLES
  remindersContainer: {
    flex: 1,
    marginTop: 130,
  },
  waterReminderCard: {
    // backgroundColor: "#4DD0E1",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    position: "relative",
    height: 140,
  },
  reminderCardContent: {
    flex: 1,
    paddingRight: 80,
  },
  reminderTitle: {
    width: 120,
    height: 18,
    borderRadius: 4,
    marginBottom: 5,
  },
  reminderSubtitle: {
    width: 150,
    height: 14,
    borderRadius: 4,
    marginBottom: 15,
  },
  setReminderButton: {
    width: 100,
    height: 35,
    borderRadius: 17,
  },
  reminderCharacters: {
    position: "absolute",
    right: 20,
    top: 20,
    width: 60,
    height: 80,
    borderRadius: 10,
  },
  reminderPagination: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 15,
    gap: 5,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  reminderItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  reminderIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  reminderDetails: {
    flex: 1,
  },
  reminderName: {
    width: "80%",
    height: 16,
    borderRadius: 4,
    marginBottom: 5,
  },
  reminderCategory: {
    width: "50%",
    height: 12,
    borderRadius: 4,
    marginBottom: 5,
  },
  reminderTime: {
    width: "40%",
    height: 12,
    borderRadius: 4,
    marginBottom: 10,
  },
  daysRow: {
    flexDirection: "row",
    gap: 5,
  },
  dayCircle: {
    width: 25,
    height: 25,
    borderRadius: 12,
  },
  activeDayCircle: {
    backgroundColor: "#4DD0E1",
  },
  reminderActions: {
    flexDirection: "row",
    gap: 10,
  },
  reminderActionIcon: {
    width: 25,
    height: 25,
    borderRadius: 12,
  },

  // ANALYSIS SKELETON STYLES
  analysisContainer: {
    flex: 1,
  },
  avgTimeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
  },
  avgTimeTitle: {
    width: 120,
    height: 18,
    borderRadius: 4,
    marginBottom: 15,
  },
  avgTimeContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  avgTimeStats: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  timeIcon: {
    width: 30,
    height: 30,
    borderRadius: 15,
    marginRight: 10,
  },
  timeValue: {
    width: 150,
    height: 20,
    borderRadius: 4,
  },
  avgTimeCharacter: {
    width: 80,
    height: 80,
    borderRadius: 10,
  },
  trendsCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  trendsTitle: {
    width: 100,
    height: 18,
    borderRadius: 4,
    marginBottom: 10,
  },
  trendsSubtitle: {
    width: 60,
    height: 16,
    borderRadius: 4,
    marginBottom: 20,
  },
  chartContainer: {
    height: 200,
    position: "relative",
  },
  chartSkeleton: {
    width: "100%",
    height: 150,
    borderRadius: 8,
    marginBottom: 20,
  },
  chartLabels: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 10,
  },
  chartLabel: {
    width: 25,
    height: 12,
    borderRadius: 4,
  },

  // LEADERBOARD SKELETON STYLES
  leaderboardContainer: {
    flex: 1,
  },
  trophyHeader: {
    alignItems: "center",
    marginBottom: 20,
  },
  trophyImage: {
    width: "100%",
    height: 150,
    borderRadius: 15,
  },
  periodTabs: {
    flexDirection: "row",
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 5,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  periodTab: {
    flex: 1,
    height: 35,
    borderRadius: 8,
  },
  activePeriodTab: {
    // backgroundColor: "#007AFF",
  },
  topWinnersCard: {
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    marginBottom: 20,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  winnersRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  winnerItem: {
    alignItems: "center",
    flex: 1,
  },
  winnerAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginBottom: 10,
  },
  winnerName: {
    width: 80,
    height: 14,
    borderRadius: 4,
    marginBottom: 5,
  },
  winnerScore: {
    width: 40,
    height: 16,
    borderRadius: 4,
  },
  rankingItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 15,
    padding: 20,
    marginBottom: 15,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  rankNumber: {
    width: 20,
    height: 20,
    borderRadius: 4,
    marginRight: 15,
  },
  rankAvatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 15,
  },
  rankDetails: {
    flex: 1,
  },
  rankName: {
    width: "70%",
    height: 16,
    borderRadius: 4,
    marginBottom: 5,
  },
  rankLevel: {
    width: "50%",
    height: 12,
    borderRadius: 4,
  },
  rankScore: {
    width: 40,
    height: 18,
    borderRadius: 4,
  },
});

export default SkeletonHome;
