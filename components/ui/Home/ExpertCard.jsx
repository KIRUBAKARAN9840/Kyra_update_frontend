import React from "react";
import { View, Text, TouchableOpacity } from "react-native";
import { Image } from "expo-image";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import styles from "./homeStyles";

const ExpertCard = ({ showExpertCard }) => {
  const router = useRouter();

  if (!showExpertCard) return null;

  return (
    <>
      <View style={styles.dietPlansHeader}>
        <LinearGradient
          colors={["#EBF5FF", "#FFFFFF"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.membershipHeadingCard, { marginBottom: 0 }]}
        >
          <Text
            style={[
              styles.sectionHeading,
              { marginBottom: 0, flex: 1, textAlign: "left" },
            ]}
          >
            Fix Your Diet Now!
          </Text>
        </LinearGradient>
      </View>
      <TouchableOpacity
        activeOpacity={0.88}
        onPress={() => router.push("/client/expertNutrition")}
        style={styles.expertCardWrap}
      >
        <Image
          source={require("../../../assets/images/home/expert_card.webp")}
          style={styles.expertCardImg}
          contentFit="cover"
        />
      </TouchableOpacity>
    </>
  );
};

export default ExpertCard;
