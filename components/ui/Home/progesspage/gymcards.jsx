import React, { useEffect, useRef, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Image,
  Alert,
  TouchableOpacity,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import MaskedView from "@react-native-masked-view/masked-view";
import {
  isFittbotPremium,
  isGymPremium,
  isPureFreemium,
} from "../../../../config/access";
import JoinGym from "../../Payment/joingym";
import PremiumBadge from "../../Payment/premiumbadge";
import { useRouter } from "expo-router";
import HomeBMICard from "./bmicard";

const InfoCard = ({
  type,
  title,
  description,
  value,
  total,
  secondaryValue,
  onPress,
  gender,
  liveDescription,
  onChangeTab,
  liveCount,
  liveDes,
  plan,
}) => {
  const [des, setDes] = useState(null);
  const percentage = (Number(liveDes) / Number(total)) * 100;
  // if (percentage <= 30) {
  //   setDes("Perfect time to hit the gym – not too crowded!");
  // } else if (percentage > 30 && percentage <= 60) {
  //   setDes("Moderate Crowd, Maximum Momentum – Own Every Rep!");
  // } else {
  //   setDes("Full house, No worries - turn the buzz into gains");
  // }
  const isLive = type === "live";
  const [socket, setSocket] = useState(null);

  const [user, setUser] = useState(null);
  const ws = useRef(null);
  const router = useRouter();
  const goTo = (live) => {
    if (live) {
      if (isPureFreemium(plan)) {
        if (Platform.OS === "android") {
          router.push("/client/subscription");
          return;
        } else if (Platform.OS === "ios") {
          return;
        }
      } else if (isFittbotPremium(plan)) {
        onChangeTab("Fitness Studios");
        return;
      } else if (isGymPremium(plan)) {
        onChangeTab("My Gym");
        return;
      }
    } else {
      if (isPureFreemium(plan)) {
        if (Platform.OS === "android") {
          router.push("/client/subscription");
          return;
        } else if (Platform.OS === "ios") {
          return;
        }
      } else if (isFittbotPremium(plan)) {
        onChangeTab("Fitness Studios");
        return;
      } else if (isGymPremium(plan)) {
        onChangeTab("Leaderboard");
        return;
      }
    }
  };

  return (
    <TouchableOpacity
      style={[styles.card, { height: isGymPremium(plan) ? 130 : 175 }]}
      onPress={() => goTo(isLive)}
    >
      <LinearGradient
        colors={["#FFFFFF", "#FFFFFF"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.cardHeader}
      >
        <MaskedView maskElement={<Text style={styles.cardTitle}>{title}</Text>}>
          <LinearGradient
            colors={["#1A1A1A", "#1A1A1A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={{ height: 20 }}
          >
            <Text style={[styles.cardTitle, { opacity: 0 }]}>{title}</Text>
          </LinearGradient>
        </MaskedView>
      </LinearGradient>

      {/* Card content based on type */}
      <View style={styles.cardContent}>
        {isLive ? (
          // Live Update Card Content
          <View style={styles.liveContainer}>
            <View style={styles.liveStatusContainer}>
              {isGymPremium(plan) && <View style={styles.liveIndicator} />}
              <View style={styles.cardBottom}>
                {isGymPremium(plan) && (
                  <>
                    <Text style={styles.valueText}>{liveCount}</Text>
                    <Text style={styles.valueTextComplete}>/{total}</Text>
                  </>
                )}
              </View>
            </View>
            {!isGymPremium(plan) && (
              <View style={{ marginTop: 10 }}>
                {/* <Text>Join Gym</Text> */}
                {isPureFreemium(plan) ? (
                  <PremiumBadge size={12} get={true} />
                ) : (
                  <JoinGym size={12} />
                )}
                <Text style={{ fontSize: 12 }}>& unlock this feature</Text>
              </View>
            )}
          </View>
        ) : (
          // {/* // </View> */}
          // Leaderboard Card Content
          <View style={styles.cardBottom}>
            <View style={styles.leaderboardContainer}>
              {isGymPremium(plan) && (
                <>
                  <Text style={styles.rankLabel}>Your Rank</Text>
                  <Text style={styles.rankValue}>
                    <Text style={styles.rankNumber}>{value}</Text>
                    {secondaryValue ? (
                      <Text style={styles.rankTotal}>/{secondaryValue}</Text>
                    ) : (
                      <Text style={styles.rankTotal}>/{"NA"}</Text>
                    )}
                  </Text>
                </>
              )}
            </View>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
};

// Main component that renders both cards
const FitnessInfoCards = ({
  liveTitle = "Gym Live Update",
  liveValue = 0,
  totalValue = 0,
  leaderboardTitle = "Leaderboard",
  leaderboardValue = "NA",
  leaderboardTotal = "NA",
  gender,
  onLivePress,
  onLeaderboardPress,
  onChangeTab,
  liveCount,
  liveDes,
  plan,
  bmi,
  steps,
  goal,
  distance,
}) => {
  const getLeaderboardDescription = () => {
    if (leaderboardValue == 1) {
      return "On top today – push harder for tomorrow!";
    } else if (leaderboardValue == "NA") {
      return "Your name belongs here—log today, lead tomorrow";
    } else {
      return "Start logging your diet and workout, start climbing!";
    }
  };

  return (
    <View style={styles.container}>
      {/* BMI Card */}
      <View style={{ width: "50%" }}>
        <HomeBMICard
          bmi={bmi}
          steps={steps}
          goal={goal}
          distance={distance}
          plan={plan}
        />
      </View>

      {/* Live Update Card */}
      <InfoCard
        type="live"
        title={liveTitle}
        total={totalValue}
        value={liveValue || 0}
        onPress={onLivePress}
        liveDescription
        onChangeTab={onChangeTab}
        liveCount={liveCount}
        liveDes={liveDes}
        plan={plan}
      />

      {/* Leaderboard Card */}
      {/* <InfoCard
        type="leaderboard"
        title={leaderboardTitle}
        description={getLeaderboardDescription()}
        value={leaderboardValue}
        secondaryValue={leaderboardTotal}
        onPress={onLeaderboardPress}
        gender={gender}
        onChangeTab={onChangeTab}
        plan={plan}
      /> */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 14,
  },
  card: {
    width: "48%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 2, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    overflow: Platform.OS === "ios" ? "visible" : "hidden",
    position: "relative",
    height: 130,

    // justifyContent: "center",
  },
  cardHeader: {
    padding: 7,
    alignItems: "center",
    borderBottomWidth: Platform.OS === "ios" ? 1 : 0,
    borderBottomColor: "#ddd",
    elevation: 2,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "normal",
  },
  cardDescription: {
    fontSize: 12,
    color: "#555555",
    textAlign: "center",
    paddingHorizontal: 8,
    paddingTop: 12,
    paddingBottom: 8,
    // minHeight: 50,
  },
  cardContent: {
    alignItems: "center",
    justifyContent: "center",
    // height: "100%",
    marginTop: 10,
  },
  // Live card styles
  liveContainer: {
    alignItems: "center",
  },
  liveStatusContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 0,
  },
  liveIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#FF5459",
    marginRight: 4,
  },
  liveText: {
    color: "#333333",
    fontSize: 14,
    fontWeight: "500",
  },
  valueText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FF5757",
    // marginVertical: 8,
  },

  valueTextComplete: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#66666",
    // marginVertical: 8,
  },
  iconContainer: {
    alignItems: "center",
    marginLeft: 5,
    marginTop: 10,
  },

  peopleIcon: {
    width: 65,
    height: 74,
    resizeMode: "contain",
  },
  leaderboardContainer: {
    alignItems: "center",
  },
  rankLabel: {
    fontSize: 10,
    color: "#333333",
    // marginBottom: 4,
  },
  cardBottom: {
    flexDirection: "row",
    alignItems: "center",
  },
  rankValue: {
    marginBottom: 8,
  },
  rankNumber: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#5B2B9B",
  },
  rankTotal: {
    fontSize: 12,
    color: "#333333",
  },
  podiumContainer: {
    marginTop: 4,
  },
  podiumIcon: {
    width: 90,
    height: 80,
    marginLeft: 5,
    resizeMode: "contain",
  },
});

export default FitnessInfoCards;
