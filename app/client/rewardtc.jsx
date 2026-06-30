import {
  StyleSheet,
  View,
  Dimensions,
  TouchableOpacity,
  BackHandler,
  ScrollView,
  Text,
  Animated,
} from "react-native";
import React, { useEffect, useRef } from "react";
import { Image } from "expo-image";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

const getImageContainerHeight = () => {
  const aspectRatio = height / width;

  if (aspectRatio > 2.15) {
    return height * 0.4;
  } else if (aspectRatio > 1.8) {
    return height * 0.43;
  } else if (aspectRatio > 1.6) {
    return height * 0.47;
  } else {
    return height * 0.5;
  }
};

const RewardTC = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const scrollY = useRef(new Animated.Value(0)).current;
  const imageHeight = getImageContainerHeight();

  useEffect(() => {
    const backHandler = BackHandler.addEventListener(
      "hardwareBackPress",
      () => {
        router.back();
        return true;
      },
    );

    return () => backHandler.remove();
  }, []);

  const headerOpacity = scrollY.interpolate({
    inputRange: [0, imageHeight * 0.5, imageHeight],
    outputRange: [0, 0, 1],
    extrapolate: "clamp",
  });

  const backArrowOpacity = scrollY.interpolate({
    inputRange: [0, imageHeight * 0.5, imageHeight],
    outputRange: [1, 1, 0],
    extrapolate: "clamp",
  });

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* Initial Back Arrow */}
      <Animated.View
        style={[
          styles.backArrow,
          { top: insets.top + 10, opacity: backArrowOpacity },
        ]}
      >
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-back" size={28} color="#000000" />
        </TouchableOpacity>
      </Animated.View>

      {/* Animated Header */}
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
          onPress={() => router.back()}
        >
          <Ionicons name="arrow-back" size={24} color="#000000" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Terms & Conditions</Text>
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
            source={require("../../assets/images/tc_page.webp")}
            style={styles.image}
          />
        </View>

        <View style={{ position: "relative", marginTop: 30 }}>
          <Image
            source={require("../../assets/images/contest/reward_box.webp")}
            style={{
              width: 60,
              height: 60,
              position: "absolute",
              top: -15,
              left: 15,
              zIndex: 1,
            }}
            contentFit="contain"
          />
          <View style={[styles.fittbotRewardsCard, { marginTop: 0 }]}>
            <View
              style={[
                styles.fittbotRewardsContent,
                { paddingVertical: 10, marginLeft: 55 },
              ]}
            >
              <View style={styles.fittbotRewardsTextContainer}>
                <Text style={styles.fittbotRewardsTitle}>
                  <Text style={styles.fittbotBrand}>Fymble</Text> Mega Fitness
                  Rewards Program
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Content Container */}
        <View style={styles.contentContainer}>
          {/* Title */}

          <Text style={styles.subtitle}>Terms & Conditions</Text>
          {/* <Text style={styles.lastUpdated}>Last Updated: 1st January 2026</Text> */}

          {/* Important Highlight */}
          <View style={styles.highlightBox}>
            <LinearGradient
              colors={["#FFD700", "#FFA500"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.starIconContainer}
            >
              <MaterialIcons name="emoji-events" size={32} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.highlightTextContainer}>
              <Text style={styles.highlightTextBold}>
                MORE ENTRIES = HIGHER CHANCES!
              </Text>
              <Text style={styles.highlightTextNormal}>
                Win the iPhone 17 Pro Max by earning maximum entries
              </Text>
            </View>
          </View>

          {/* 1. Program Overview */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberBadgeText}>1</Text>
              </View>
              <Text style={styles.sectionTitle}>Program Overview</Text>
            </View>
            <Text style={styles.paragraph}>
              The Fymble Mega Fitness Rewards Program is a limited-period
              promotional initiative designed to encourage fitness participation
              through the Fymble platform.
            </Text>

            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Program Period:</Text>
                <Text style={styles.infoValue}>
                  26th Jan 2026 - 14th Aug 2026
                </Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Lucky Draw Date:</Text>
                <Text style={styles.infoValue}>15th August 2026</Text>
              </View>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Eligibility:</Text>
                <Text style={styles.infoValue}>
                  Users who join the Program and complete eligible purchases via
                  Fymble app
                </Text>
              </View>
            </View>
          </View>

          {/* 2. Joining */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberBadgeText}>2</Text>
              </View>
              <Text style={styles.sectionTitle}>Joining the Program</Text>
            </View>

            <View style={styles.warningBox}>
              <MaterialIcons name="info" size={20} color="#FF5757" />
              <Text style={styles.warningText}>
                Participation is not automatic. You must join the Program to be
                eligible.
              </Text>
            </View>

            <Text style={styles.paragraph}>To be eligible:</Text>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Click "Participate Now" button and Confirm your participation on
                or after January 26 , 2026 in Rewards page within the app
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Accept the Terms & Conditions to participate.
              </Text>
            </View>
          </View>

          {/* 3. Eligible Purchases */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberBadgeText}>3</Text>
              </View>
              <Text style={styles.sectionTitle}>
                Eligible Purchases for Entries
              </Text>
            </View>
            <Text style={styles.paragraph}>
              Each successful, non-refunded transaction generates Lucky Draw
              Entries in the following categories:
            </Text>

            <View style={styles.categoryBox}>
              <Text style={styles.categoryText}>✓ Daily Gym Pass</Text>
              <Text style={styles.categoryText}>✓ Fitness Class Booking</Text>
              <Text style={styles.categoryText}>✓ Gym Membership</Text>
              <Text style={styles.categoryText}>✓ AI Food Calorie Scanner</Text>
              <Text style={styles.categoryText}>✓ AI Diet Coach</Text>
              <Text style={styles.categoryText}>✓ Fymble Nutrition Plan</Text>
              <Text style={styles.categoryText}>✓ Nutrition Consultation</Text>
              <Text style={styles.categoryText}>
                ✓ Refer & Earn (With referred user Purchase)
              </Text>
            </View>

            <View style={styles.noteBox}>
              <Text style={styles.noteText}>
                Each Purchase generates Unique, Non-transferable Entry IDs based
                on the type of purchase.
              </Text>
            </View>
          </View>

          {/* 4. Daily Gym Pass */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberBadgeText}>4</Text>
              </View>
              <Text style={styles.sectionTitle}>
                Daily Gym Pass – Entry Rules
              </Text>
            </View>

            <View style={styles.entryCard}>
              <View style={styles.entryRow}>
                <Text style={styles.entryType}>1-Day Pass</Text>
                <Text style={styles.entryValue}>= 1 Entry</Text>
              </View>
              <View style={styles.entryRow}>
                <Text style={styles.entryType}>Multi-Day Pass (2+ days)</Text>
                <Text style={styles.entryValue}>=Entries Based on Days</Text>
              </View>
            </View>

            <View style={styles.importantBox}>
              <View style={styles.iconTextRow}>
                <MaterialIcons name="push-pin" size={16} color="#FF8800" />
                <Text style={styles.importantText}>
                  Entries are credited as per number of days of daily gym pass
                  purchased.
                </Text>
              </View>
              <View style={styles.iconTextRow}>
                <MaterialIcons name="push-pin" size={16} color="#FF8800" />
                <Text style={styles.importantText}>
                  If user purchases 7-day pass, they get 7 entries.
                </Text>
              </View>
              <View style={styles.iconTextRow}>
                <MaterialIcons name="push-pin" size={16} color="#FF8800" />
                <Text style={styles.importantText}>
                  Maximum: Up to 100 Daily Gym Pass entries per user
                </Text>
              </View>
            </View>
          </View>

          {/* 5. Session Booking */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberBadgeText}>5</Text>
              </View>
              <Text style={styles.sectionTitle}>
                Fitness Class Booking – Entry Rules
              </Text>
            </View>

            <Text style={styles.paragraph}>
              Fymble offers multiple fitness class types including Zumba, Yoga,
              Personal Training, Aerobics, Martial Arts, Pilates, Dance, and
              more.
            </Text>

            <View style={styles.entryCard}>
              <View style={styles.entryRow}>
                <Text style={styles.entryType}>1 Fitness Class Booking</Text>
                <Text style={styles.entryValue}>= 1 Entry</Text>
              </View>
              <View style={styles.entryRow}>
                <Text style={styles.entryType}>
                  Multi Fitness Classes (2+ Classes)
                </Text>
                <Text style={styles.entryValue}>=Entries Based on Classes</Text>
              </View>
            </View>

            <View style={styles.importantBox}>
              <View style={styles.iconTextRow}>
                <MaterialIcons name="push-pin" size={16} color="#FF8800" />
                <Text style={styles.importantText}>
                  Entries are credited as per number of Fitness Classes
                  purchased.
                </Text>
              </View>
              <View style={styles.iconTextRow}>
                <MaterialIcons name="push-pin" size={16} color="#FF8800" />
                <Text style={styles.importantText}>
                  Example: If user purchases 7 Zumba Classes, they get 7
                  entries.
                </Text>
              </View>
              <View style={styles.iconTextRow}>
                <MaterialIcons name="push-pin" size={16} color="#FF8800" />
                <Text style={styles.importantText}>
                  Example: If user purchases 3 Zumba Classes & 4 Yoga Classes,
                  they get 7 entries.
                </Text>
              </View>
              <View style={styles.iconTextRow}>
                <MaterialIcons name="push-pin" size={16} color="#FF8800" />
                <Text style={styles.importantText}>
                  Maximum: Up to 100 Fitness Class entries per user
                </Text>
              </View>
            </View>
          </View>

          {/* 6. Membership */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberBadgeText}>6</Text>
              </View>
              <Text style={styles.sectionTitle}>
                Gym Membership – Entry Rules
              </Text>
            </View>

            <Text style={styles.paragraph}>
              Entries are awarded based on the duration of the membership plan
              purchased at a gym.
            </Text>

            <View style={styles.entryCard}>
              <View style={styles.entryRow}>
                <Text style={styles.entryType}>1–2 Months Plan</Text>
                <Text style={styles.entryValue}>= 1 Entry</Text>
              </View>
              <View style={styles.entryRow}>
                <Text style={styles.entryType}>3–5 Months Plan</Text>
                <Text style={styles.entryValue}>= 2 Entries</Text>
              </View>
              <View style={styles.entryRow}>
                <Text style={styles.entryType}>6–11 Months Plan</Text>
                <Text style={styles.entryValue}>= 3 Entries</Text>
              </View>
              <View style={styles.entryRow}>
                <Text style={styles.entryType}>12+ Months Plan</Text>
                <Text style={styles.entryValueLarge}>= 4 Entries</Text>
              </View>
            </View>

            <View style={styles.importantBox}>
              <View style={styles.iconTextRow}>
                <MaterialIcons name="push-pin" size={16} color="#FF8800" />
                <Text style={styles.importantText}>
                  Maximum: Up to 15 Membership entries per user
                </Text>
              </View>
            </View>
          </View>

          {/* 7. AI Food Calorie Scanner */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberBadgeText}>7</Text>
              </View>
              <Text style={styles.sectionTitle}>
                AI Food Calorie Scanner – Entry Rules
              </Text>
            </View>

            <View style={styles.entryCard}>
              <View style={styles.entryRow}>
                <Text style={styles.entryType}>AI Food Scanner Purchase</Text>
                <Text style={styles.entryValue}>= 1 Entry</Text>
              </View>
            </View>

            <View style={styles.importantBox}>
              <View style={styles.iconTextRow}>
                <MaterialIcons name="push-pin" size={16} color="#FF8800" />
                <Text style={styles.importantText}>
                  Maximum: Up to 4 AI Food Scanner entries per user
                </Text>
              </View>
            </View>
          </View>

          {/* 8. AI Diet Coach */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberBadgeText}>8</Text>
              </View>
              <Text style={styles.sectionTitle}>
                AI Diet Coach – Entry Rules
              </Text>
            </View>

            <View style={styles.entryCard}>
              <View style={styles.entryRow}>
                <Text style={styles.entryType}>AI Diet Coach Purchase</Text>
                <Text style={styles.entryValue}>= 1 Entry</Text>
              </View>
            </View>

            <View style={styles.importantBox}>
              <View style={styles.iconTextRow}>
                <MaterialIcons name="push-pin" size={16} color="#FF8800" />
                <Text style={styles.importantText}>
                  Maximum: Up to 4 AI Diet Coach entries per user
                </Text>
              </View>
            </View>
          </View>

          {/* 9. Fymble Nutrition */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberBadgeText}>9</Text>
              </View>
              <Text style={styles.sectionTitle}>
                Fymble Nutrition – Entry Rules
              </Text>
            </View>

            <View style={styles.entryCard}>
              <View style={styles.entryRow}>
                <Text style={[styles.entryType, { fontSize: 13 }]}>
                  Basic Nutrition Consultation(₹199)
                </Text>
                <Text style={styles.entryValueLarge}>= 1 Entry</Text>
              </View>
              <View style={styles.entryRow}>
                <Text style={styles.entryType}>1 Month Nutrition Plan</Text>
                <Text style={styles.entryValueLarge}>= 3 Entries</Text>
              </View>
              <View style={styles.entryRow}>
                <Text style={styles.entryType}>3 Month Nutrition Plan</Text>
                <Text style={styles.entryValueLarge}>= 3 Entries</Text>
              </View>
            </View>

            <View style={styles.importantBox}>
              <View style={styles.iconTextRow}>
                <MaterialIcons name="push-pin" size={16} color="#FF8800" />
                <Text style={styles.importantText}>
                  Maximum: Up to 15 Fymble Nutrition entries per user
                </Text>
              </View>
            </View>
          </View>

          {/* 10. Referral Bonus */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberBadgeText}>10</Text>
              </View>
              <Text style={styles.sectionTitle}>Referral Bonus Entries</Text>
            </View>

            <View style={styles.referralBox}>
              <View style={styles.iconTitleRow}>
                <MaterialIcons name="card-giftcard" size={20} color="#FF1493" />
                <Text style={styles.referralTitle}>
                  Referral Bonus Structure
                </Text>
              </View>
              <View style={{ marginTop: 4 }} />
              <Text style={styles.referralText}>
                Refer 3 unique friends →{" "}
                <Text style={styles.boldRed}>1 bonus entry</Text>
              </Text>
              <Text style={styles.referralText}>
                Maximum:{" "}
                <Text style={styles.boldRed}>25 referral bonus entries</Text>{" "}
                (requires 75 successful referrals)
              </Text>

              <Text style={styles.paragraph}>Each referred friend must:</Text>
              <View style={styles.bulletItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>
                  Register using your referral code
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>
                  Complete any eligible purchase (Daily Pass/Fitness Class/Gym
                  Membership/Fymble Nutrition)
                </Text>
              </View>
              <View style={styles.bulletItem}>
                <Text style={styles.bullet}>•</Text>
                <Text style={styles.bulletText}>
                  Have a successful, non-refunded transaction
                </Text>
              </View>
            </View>
          </View>

          {/* 11. Entry Limits */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberBadgeText}>11</Text>
              </View>
              <Text style={styles.sectionTitle}>Entry Limits Per User</Text>
            </View>

            <View style={styles.tableContainer}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderText}>Category</Text>
                <Text style={[styles.tableHeaderText, { textAlign: "right" }]}>
                  Max Entries
                </Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>Daily Pass</Text>
                <Text style={styles.tableCellValue}>Up to 100</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>Fitness Class Booking</Text>
                <Text style={styles.tableCellValue}>Up to 100</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>Membership Plans</Text>
                <Text style={styles.tableCellValue}>Up to 15</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>AI Food Calorie Scanner</Text>
                <Text style={styles.tableCellValue}>Up to 4</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>AI Diet Coach</Text>
                <Text style={styles.tableCellValue}>Up to 4</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>Fymble Nutrition Plan</Text>
                <Text style={styles.tableCellValue}>Up to 15</Text>
              </View>
              <View style={styles.tableRow}>
                <Text style={styles.tableCell}>Referral Bonus</Text>
                <Text style={styles.tableCellValue}>Up to 25</Text>
              </View>
            </View>

            <View style={styles.noteBox}>
              <Text style={styles.noteText}>
                Purchases beyond these limits will not generate additional
                entries, but you may continue using Fymble services normally.
              </Text>
            </View>
          </View>

          {/* 12. Entry Validation */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberBadgeText}>12</Text>
              </View>
              <Text style={styles.sectionTitle}>
                Entry Validation & Display
              </Text>
            </View>

            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Each eligible entry generates a unique Entry ID
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                All Entry IDs are visible in your Rewards Program Dashboard
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Entry IDs are non-transferable, non-editable, and locked after
                confirmation
              </Text>
            </View>
          </View>

          {/* 13. Invalid Entries */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberBadgeText}>13</Text>
              </View>
              <Text style={styles.sectionTitle}>
                Invalid & Disqualified Entries
              </Text>
            </View>

            <View style={styles.warningBox}>
              <MaterialIcons name="warning" size={20} color="#FF5757" />
              <Text style={styles.warningText}>
                Entries will be cancelled if the transaction is refunded, or if
                fraudulent activity is detected
              </Text>
            </View>

            <Text style={styles.paragraph}>
              Entries will be cancelled or revoked if:
            </Text>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Transaction is cancelled or refunded
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Duplicate, fake, or self-referrals detected
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Fraudulent activity or misuse identified
              </Text>
            </View>
          </View>

          {/* 14. Lucky Draw */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberBadgeText}>14</Text>
              </View>
              <Text style={styles.sectionTitle}>
                Lucky Draw Process & Transparency
              </Text>
            </View>

            <View style={styles.liveDrawBox}>
              <MaterialIcons name="location-on" size={28} color="#FF0000" />
              <Text style={styles.liveDrawText}>
                The Lucky Draw will be conducted LIVE at a physical venue on
                15th August 2026. Venue details will be announced soon.
              </Text>
            </View>

            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Registered users will be notified with venue details once
                finalised
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Can't attend in person? The draw will also be streamed LIVE on
                the official Fymble YouTube Channel
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Winners will be announced publicly on Aug 15, 2026
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Winners announced using partial Entry ID
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Draw outcome is final and binding
              </Text>
            </View>
          </View>

          {/* 15. Rewards */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberBadgeText}>15</Text>
              </View>
              <Text style={styles.sectionTitle}>Rewards & Fulfilment</Text>
            </View>

            <View style={styles.prizeCard}>
              <View style={styles.iconTitleRowCenter}>
                <MaterialIcons name="emoji-events" size={24} color="#FFD700" />
                <Text style={styles.prizeTitle}>Prizes</Text>
              </View>
              <View style={styles.prizeItem}>
                <View style={styles.prizeRankContainer}>
                  <MaterialIcons name="looks-one" size={20} color="#FFD700" />
                  <Text style={styles.prizeRank}>1st Prize:</Text>
                </View>
                <Text style={styles.prizeName}>Apple iPhone 17 Pro Max</Text>
              </View>
              <View style={styles.prizeItem}>
                <View style={styles.prizeRankContainer}>
                  <MaterialIcons name="looks-two" size={20} color="#C0C0C0" />
                  <Text style={styles.prizeRank}>2nd Prize:</Text>
                </View>
                <Text style={styles.prizeName}>Apple AirPods 4</Text>
              </View>
              <View style={styles.prizeItem}>
                <View style={styles.prizeRankContainer}>
                  <MaterialIcons name="looks-3" size={20} color="#CD7F32" />
                  <Text style={styles.prizeRank}>3rd Prize:</Text>
                </View>
                <Text style={styles.prizeName}>
                  Boult Thrux Smartwatch (GPS)
                </Text>
              </View>
              <View style={styles.prizeItem}>
                <View style={styles.prizeRankContainer}>
                  <MaterialIcons name="star" size={18} color="#FF5757" />
                  <Text style={styles.prizeRank}>10 Consolation Prizes:</Text>
                </View>
                <Text style={styles.prizeName}>Smart Cup Water Bottle</Text>
              </View>
            </View>

            <View style={styles.warningBox}>
              <MaterialIcons name="info" size={18} color="#FF5757" />
              <Text style={styles.warningTextSmall}>
                Rewards are non-transferable, non-exchangeable, and not
                redeemable for cash
              </Text>
            </View>
          </View>

          {/* 16. Legal */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberBadgeText}>16</Text>
              </View>
              <Text style={styles.sectionTitle}>Legal & Disclaimer</Text>
            </View>

            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                This is a promotional reward activity, not a lottery or gambling
                scheme
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>Participation is voluntary</Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                Fymble reserves the right to modify, suspend, or terminate the
                Program
              </Text>
            </View>
            <View style={styles.bulletItem}>
              <Text style={styles.bullet}>•</Text>
              <Text style={styles.bulletText}>
                All disputes subject to Bengaluru jurisdiction only
              </Text>
            </View>
          </View>

          {/* 17. Support */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.numberBadge}>
                <Text style={styles.numberBadgeText}>17</Text>
              </View>
              <Text style={styles.sectionTitle}>Customer Support</Text>
            </View>

            <View style={styles.supportCard}>
              <View style={styles.supportItem}>
                <MaterialIcons name="email" size={20} color="#28A745" />
                <Text style={styles.supportText}>support@fymble.app</Text>
              </View>
              <View style={styles.supportItem}>
                <MaterialIcons name="schedule" size={20} color="#28A745" />
                <Text style={styles.supportText}>
                  Mon-Sat | 10:00 AM - 6:30 PM
                </Text>
              </View>
            </View>
          </View>

          {/* Final Message */}
          <View style={styles.finalMessage}>
            <Text style={styles.finalMessageText}>
              "This reward program is designed to promote fitness participation
              and fair engagement. Transparency, fairness, and user trust are
              our top priorities."
            </Text>
          </View>

          {/* Disclaimer */}
          <View style={styles.disclaimerCard}>
            <View style={styles.disclaimerHeader}>
              <Ionicons name="information-circle" size={20} color="#FF5757" />
              <Text style={styles.disclaimerTitle}>Rewards Disclaimer</Text>
            </View>
            <Text style={styles.disclaimerText}>
              The Fymble Mega Fitness Rewards Program is a promotional campaign.
              Rewards are offered for eligible in-app participation and
              engagement only. Rewards do not represent or guarantee any health,
              fitness, or medical outcome. Selection of winners is subject to
              applicable terms and conditions.
            </Text>
          </View>

          {/* Bottom Reminder */}
          <View style={styles.bottomReminder}>
            <LinearGradient
              colors={["#FFD700", "#FFA500"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.bottomIconContainer}
            >
              <MaterialIcons name="emoji-events" size={28} color="#FFFFFF" />
            </LinearGradient>
            <View style={styles.bottomTextContainer}>
              <Text style={styles.bottomReminderTextBold}>
                MAXIMIZE YOUR ENTRIES!
              </Text>
              <Text style={styles.bottomReminderTextNormal}>
                More entries = Higher chances of winning the iPhone 17 Pro Max
              </Text>
            </View>
          </View>
        </View>
      </Animated.ScrollView>
    </View>
  );
};

export default RewardTC;

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
    paddingHorizontal: 16,
    paddingBottom: 30,
    paddingTop: 20,
  },
  mainTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
    textAlign: "center",
    marginBottom: 15,
  },
  lastUpdated: {
    fontSize: 12,
    color: "#999",
    textAlign: "center",
    marginBottom: 20,
  },
  highlightBox: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    borderWidth: 3,
    borderColor: "#FFD700",
    elevation: 5,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  starIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  highlightTextContainer: {
    flex: 1,
  },
  highlightTextBold: {
    fontSize: 16,
    fontWeight: "800",
    color: "#FF5757",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  highlightTextNormal: {
    fontSize: 13,
    fontWeight: "500",
    color: "#666",
    lineHeight: 18,
  },
  highlightText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FF5757",
    marginLeft: 12,
    flex: 1,
    lineHeight: 22,
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 10,
  },
  numberBadge: {
    width: 24,
    height: 24,
    borderRadius: 16,
    backgroundColor: "#FF5757",
    justifyContent: "center",
    alignItems: "center",
  },
  numberBadgeText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  sectionNumber: {
    fontSize: 18,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A1A",
    flex: 1,
  },
  paragraph: {
    fontSize: 14,
    color: "#4B4B4B",
    lineHeight: 22,
    marginBottom: 12,
  },
  infoCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 14,
    marginTop: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  infoRow: {
    marginBottom: 10,
  },
  infoLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
    marginBottom: 3,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  warningBox: {
    backgroundColor: "#FFF0F0",
    borderRadius: 8,
    padding: 12,
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#FF5757",
  },
  warningText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FF5757",
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  warningTextSmall: {
    fontSize: 12,
    fontWeight: "500",
    color: "#FF5757",
    marginLeft: 8,
    flex: 1,
    lineHeight: 18,
  },
  bulletItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 8,
    paddingLeft: 8,
  },
  bullet: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FF5757",
    marginRight: 10,
    marginTop: 2,
  },
  bulletText: {
    fontSize: 14,
    color: "#4B4B4B",
    flex: 1,
    lineHeight: 22,
  },
  categoryBox: {
    backgroundColor: "#E8F5E9",
    borderRadius: 10,
    padding: 14,
    marginVertical: 10,
  },
  categoryText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#28A745",
    marginBottom: 6,
  },
  noteBox: {
    backgroundColor: "#E3F2FD",
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
  },
  noteText: {
    fontSize: 12,
    color: "#0066CC",
    fontWeight: "500",
    lineHeight: 20,
  },
  entryCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    padding: 16,
    marginVertical: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  entryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  entryType: {
    fontSize: 14,
    color: "#4B4B4B",
    fontWeight: "500",
    flex: 1,
  },
  entryValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FF5757",
  },
  entryValueLarge: {
    fontSize: 18,
    fontWeight: "700",
    color: "#FF5757",
  },
  importantBox: {
    backgroundColor: "#FFF9E6",
    borderRadius: 8,
    padding: 12,
    marginTop: 10,
  },
  importantText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FF8800",
    lineHeight: 20,
    flex: 1,
  },
  iconTextRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    marginBottom: 6,
  },
  iconTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
  },
  iconTitleRowCenter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    marginBottom: 14,
  },
  highlightCard: {
    backgroundColor: "#E8F5E9",
    borderRadius: 10,
    padding: 14,
    marginVertical: 10,
    borderWidth: 2,
    borderColor: "#28A745",
  },
  highlightCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#28A745",
  },
  highlightCardText: {
    fontSize: 14,
    color: "#1A1A1A",
    marginBottom: 6,
    lineHeight: 21,
  },
  boldRed: {
    fontWeight: "700",
    color: "#FF5757",
  },
  exampleBox: {
    backgroundColor: "#F5F5F5",
    borderRadius: 8,
    padding: 12,
    marginVertical: 10,
  },
  exampleTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#666",
  },
  exampleText: {
    fontSize: 13,
    color: "#4B4B4B",
    marginBottom: 3,
  },
  exampleTextBold: {
    fontSize: 13,
    color: "#FF5757",
    fontWeight: "700",
    marginTop: 6,
  },
  rewardNote: {
    backgroundColor: "#FFF9E6",
    borderRadius: 8,
    padding: 12,
    marginVertical: 10,
  },
  rewardNoteText: {
    fontSize: 13,
    color: "#FF8800",
    fontWeight: "500",
    lineHeight: 20,
    flex: 1,
  },
  subText: {
    fontSize: 13,
    color: "#666",
    marginTop: 8,
    fontStyle: "italic",
  },
  referralBox: {
    backgroundColor: "#FFF0F5",
    borderRadius: 10,
    padding: 14,
    marginVertical: 10,
    borderWidth: 2,
    borderColor: "#FF69B4",
  },
  referralTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FF1493",
  },
  referralText: {
    fontSize: 14,
    color: "#4B4B4B",
    marginBottom: 6,
    lineHeight: 21,
  },
  tableContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    overflow: "hidden",
    marginVertical: 10,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
  },
  tableHeader: {
    flexDirection: "row",
    backgroundColor: "#FF5757",
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
  tableRow: {
    flexDirection: "row",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  tableCell: {
    flex: 1,
    fontSize: 14,
    color: "#4B4B4B",
  },
  tableCellValue: {
    flex: 1,
    fontSize: 14,
    fontWeight: "600",
    color: "#FF5757",
    textAlign: "right",
  },
  liveDrawBox: {
    backgroundColor: "#FFEBEE",
    borderRadius: 10,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    marginVertical: 10,
    borderWidth: 2,
    borderColor: "#FF0000",
  },
  liveDrawText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#D32F2F",
    marginLeft: 12,
    flex: 1,
    lineHeight: 21,
  },
  prizeCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginVertical: 10,
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  prizeTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  prizeItem: {
    marginBottom: 12,
    paddingVertical: 6,
  },
  prizeRankContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 4,
  },
  prizeRank: {
    fontSize: 14,
    fontWeight: "600",
    color: "#666",
  },
  prizeName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1A1A1A",
    flex: 1,
  },
  supportCard: {
    backgroundColor: "#E8F5E9",
    borderRadius: 10,
    padding: 14,
    marginVertical: 10,
  },
  supportItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
  },
  supportText: {
    fontSize: 14,
    color: "#1A1A1A",
    fontWeight: "500",
    marginLeft: 12,
  },
  finalMessage: {
    backgroundColor: "#E3F2FD",
    borderRadius: 10,
    padding: 16,
    marginVertical: 16,
    borderLeftWidth: 4,
    borderLeftColor: "#2196F3",
  },
  finalMessageText: {
    fontSize: 14,
    color: "#0D47A1",
    fontStyle: "italic",
    lineHeight: 22,
    textAlign: "center",
  },
  bottomReminder: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 18,
    flexDirection: "row",
    alignItems: "center",
    marginTop: 10,
    borderWidth: 3,
    borderColor: "#FFD700",
    elevation: 5,
    shadowColor: "#FFD700",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
  bottomIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 14,
  },
  bottomTextContainer: {
    flex: 1,
  },
  bottomReminderTextBold: {
    fontSize: 15,
    fontWeight: "800",
    color: "#FF5757",
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  bottomReminderTextNormal: {
    fontSize: 12,
    fontWeight: "500",
    color: "#666",
    lineHeight: 17,
  },
  bottomReminderText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FF5757",
    textAlign: "center",
    marginTop: 10,
    lineHeight: 22,
  },
  fittbotRewardsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    marginHorizontal: 8,
    marginTop: 10,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  fittbotRewardsContent: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  rewardBoxIcon: {
    width: 40,
    height: 40,
    marginRight: 8,
  },
  fittbotRewardsTextContainer: {
    flex: 1,
  },
  fittbotRewardsTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
    marginBottom: 4,
  },
  fittbotBrand: {
    color: "#FF5757",
  },
  fittbotRewardsSubtitle: {
    fontSize: 12,
    color: "#454545",
  },
  disclaimerCard: {
    backgroundColor: "#FFF9F0",
    borderRadius: 12,
    marginVertical: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: "#FFE4C4",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  disclaimerHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 8,
  },
  disclaimerTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FF5757",
  },
  disclaimerText: {
    fontSize: 12,
    color: "#5D4E37",
    lineHeight: 18,
    textAlign: "left",
  },
});
