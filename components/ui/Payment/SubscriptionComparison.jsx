import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialIcons } from "@expo/vector-icons";
import { Image } from "expo-image";

const SubscriptionComparison = () => {
  const features = [
    {
      id: 1,
      name: "AI Coach -KyraAI",
      icon: "psychology",
      gold: true,
      platinum: true,
      diamond: true,
    },
    {
      id: 2,
      name: "Diet Image Uploads",
      icon: "camera-alt",
      gold: "Up to 15 per Day",
      platinum: "Unlimited",
      diamond: "Unlimited",
    },
    {
      id: 3,
      name: "Macro Tracking",
      icon: "analytics",
      gold: true,
      platinum: true,
      diamond: true,
    },
    {
      id: 4,
      name: "Water Intake Tracker",
      icon: "local-drink",
      gold: true,
      platinum: true,
      diamond: true,
    },
    {
      id: 5,
      name: "AI Food Detection",
      icon: "fastfood",
      gold: true,
      platinum: true,
      diamond: true,
    },
    {
      id: 6,
      name: "AI Personalized Plans",
      icon: "assignment",
      gold: "Advanced",
      platinum: "Advanced AI + Progress",
      diamond: "Advanced AI + Progress",
    },
    {
      id: 7,
      name: "AI Reports & Insights",
      icon: "trending-up",
      gold: true,
      platinum: true,
      diamond: true,
    },
    {
      id: 8,
      name: "Community Feed",
      icon: "chat",
      gold: true,
      platinum: true,
      diamond: true,
    },
    {
      id: 9,
      name: "Gym Buddy",
      icon: "people",
      gold: true,
      platinum: true,
      diamond: true,
    },
    {
      id: 10,
      name: "Live Gym Stats",
      icon: "emergency-share",
      gold: true,
      platinum: true,
      diamond: true,
    },
    {
      id: 11,
      name: "Nutrition Consultation",
      icon: "dining",
      gold: false,
      platinum: "1 Session",
      diamond: "2 Sessions",
    },
    {
      id: 12,
      name: "Customer Support",
      icon: "support-agent",
      gold: true,
      platinum: true,
      diamond: true,
    },
  ];

  const renderFeatureValue = (value, planType) => {
    if (value === true) {
      return (
        <View style={styles.checkContainer}>
          <MaterialIcons name="check-circle" size={14} color="#4CAF50" />
        </View>
      );
    } else if (value === false) {
      return (
        <View style={styles.checkContainer}>
          <MaterialIcons name="cancel" size={14} color="#F44336" />
        </View>
      );
    } else {
      return (
        <View
          style={[
            styles.textValueContainer,
            styles[`${planType}TextContainer`],
          ]}
        >
          <Text style={[styles.textValue, styles[`${planType}Text`]]}>
            {value}
          </Text>
        </View>
      );
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.tableContainer}>
        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.featureColumn}>
            <Text style={styles.featureHeaderText}>Feature</Text>
          </View>
          <View style={[styles.planColumn, styles.goldColumn]}>
            <Text style={styles.planHeaderText}>GOLD</Text>
            <Text style={styles.planDurationText}>1 Month</Text>
          </View>
          <View style={[styles.planColumn, styles.platinumColumn]}>
            <Text style={styles.planHeaderText}>PLATINUM</Text>
            <Text style={styles.planDurationText}>6 Months</Text>
          </View>
          <View style={[styles.planColumn, styles.diamondColumn]}>
            <Text style={styles.planHeaderText}>DIAMOND</Text>
            <Text style={styles.planDurationText}>1 Year</Text>
          </View>
        </View>

        {/* Feature Rows */}
        {features.map((feature, index) => (
          <View
            key={feature.id}
            style={[styles.featureRow, index % 2 === 1 && styles.alternateRow]}
          >
            <View style={styles.featureColumn}>
              <View style={styles.featureInfo}>
                <Text style={styles.featureName}>{feature.name}</Text>
              </View>
            </View>

            <View style={[styles.planColumn, styles.goldColumn]}>
              {renderFeatureValue(feature.gold, "gold")}
            </View>

            <View style={[styles.planColumn, styles.platinumColumn]}>
              {renderFeatureValue(feature.platinum, "platinum")}
            </View>

            <View style={[styles.planColumn, styles.diamondColumn]}>
              {renderFeatureValue(feature.diamond, "diamond")}
            </View>
          </View>
        ))}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#F8F9FA",
    paddingVertical: 10,
    alignItems: "center",
  },
  tableContainer: {
    backgroundColor: "#FFF",
    borderRadius: 8,
    overflow: "hidden",
    elevation: 3,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    width: 330,
  },
  headerRow: {
    flexDirection: "row",
    backgroundColor: "#F5F7FA",
    borderBottomWidth: 1,
    borderBottomColor: "#E1E8ED",
    height: 45,
  },
  featureRow: {
    flexDirection: "row",
    borderBottomWidth: 0.5,
    borderBottomColor: "#F0F3F7",
    minHeight: 37,
    alignItems: "center",
  },
  alternateRow: {
    backgroundColor: "#FAFBFC",
  },
  featureColumn: {
    width: 140,
    paddingHorizontal: 8,
    paddingVertical: 8,
    justifyContent: "center",
  },
  planColumn: {
    width: 63,
    paddingHorizontal: 4,
    paddingVertical: 8,
    alignItems: "center",
    justifyContent: "center",
  },
  goldColumn: {
    // borderLeftWidth: 1,
    // borderLeftColor: "#FFD700",
    backgroundColor: "#FFFBF0",
  },
  platinumColumn: {
    // borderLeftWidth: 1,
    // borderLeftColor: "#E5E7EB",
    backgroundColor: "#F8FAFF",
  },
  diamondColumn: {
    // borderLeftWidth: 1,
    // borderLeftColor: "#E91E63",
    backgroundColor: "#FFF0F5",
  },
  featureHeaderText: {
    fontSize: 11,
    fontWeight: "bold",
    color: "#333",
  },
  planHeaderText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 1,
    textAlign: "center",
  },
  planDurationText: {
    fontSize: 9,
    color: "#666",
    textAlign: "center",
  },
  featureInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  iconContainer: {
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#F0F4FF",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 6,
  },
  featureName: {
    fontSize: 10,
    color: "#333",
    fontWeight: "500",
    flex: 1,
    lineHeight: 12,
  },
  checkContainer: {
    alignItems: "center",
    justifyContent: "center",
  },
  textValueContainer: {
    paddingHorizontal: 3,
    paddingVertical: 3,
    borderRadius: 3,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 20,
    width: 55,
  },
  goldTextContainer: {
    backgroundColor: "#FFF8E1",
  },
  platinumTextContainer: {
    backgroundColor: "#E3F2FD",
  },
  diamondTextContainer: {
    backgroundColor: "#FCE4EC",
  },
  textValue: {
    fontSize: 7,
    fontWeight: "600",
    textAlign: "center",
    lineHeight: 9,
  },
  goldText: {
    color: "#F57F17",
  },
  platinumText: {
    color: "#1565C0",
  },
  diamondText: {
    color: "#C2185B",
  },
});

export default SubscriptionComparison;
