import React from "react";
import { View, Text, StyleSheet, Dimensions, Image } from "react-native";
import { ProgressChart } from "react-native-chart-kit";
import NutritionProgressBar from "../NutritionProgressBar";
import { LinearGradient } from "expo-linear-gradient";

const { width } = Dimensions.get("window");

const DietSummaryCard = ({
  totalCalories = 0,
  consumedCalories = 0,
  macros,
}) => {
  return (
    <LinearGradient
      colors={["#007bff18", "#28a74616"]}
      start={{ x: 1, y: 1 }}
      end={{ x: 0, y: 0 }}
      style={styles.cardContainer}
    >
      <Text style={styles.title}>Diet Summary</Text>

      <View style={styles.container}>
        <LinearGradient
          colors={["#007BFF", "#28A745"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.outerCircle}
        >
          {/* <View style={styles.innerCircle}> */}
          <LinearGradient
            colors={["#007bff18", "#28a74616"]}
            start={{ x: 1, y: 1 }}
            end={{ x: 0, y: 0 }}
            style={[styles.innerCircle]}
          >
            <Text style={styles.consumedCalories}>{consumedCalories}</Text>
            <Text style={styles.totalCalories}>of {totalCalories} Kcal</Text>
            {/* </View> */}
          </LinearGradient>
        </LinearGradient>
      </View>

      <View style={styles.macrosContainer}>
        {macros?.map((macro, index) => (
          <View key={index} style={styles.macroItem}>
            <View style={styles.macroIconLabelRow}>
              <Image
                source={macro.icon}
                style={[styles.macroIcon, { width: macro.width }]}
              />
              <Text style={styles.macroLabel}>{macro.label}</Text>
            </View>

            <View style={styles.progressBackground}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${(macro.value / 200) * 100}%`,
                    backgroundColor: macro.color || "#4c6ef5",
                  },
                ]}
              />
            </View>
            <Text style={styles.macroValue}>{macro.value}g</Text>
          </View>
        ))}
      </View>
      {/* </View> */}
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#F8FCFF",
    borderRadius: 20,
    padding: 20,
    marginVertical: 10,
    width: width * 0.92,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    alignItems: "center",
  },
  title: {
    width: "100%",
    fontSize: 16,
    // fontWeight: '700',
    color: "#0A0A0A",
    // marginBottom: 8,
    textAlign: "left",
  },
  chartStyle: {
    marginTop: 8,
  },
  centerTextContainer: {
    position: "absolute",
    top: 80,
    alignItems: "center",
  },
  consumedCalories: {
    fontSize: 18,
    fontWeight: "700",
    color: "#0A0A0A",
  },
  totalCalories: {
    fontSize: 14,
    color: "#777",
  },
  macrosContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
    marginTop: 10,
  },
  macroItem: {
    alignItems: "center",
    flex: 1,
    marginHorizontal: 10,
  },
  macroIconLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  macroIcon: {
    // width: 12,
    height: 21,
    marginRight: 4,
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#0A0A0A",
  },
  macroValue: {
    fontSize: 12,
    fontWeight: "600",
    marginTop: 4,
    color: "#0A0A0A",
  },

  //////////////

  container: {
    alignItems: "center",
    justifyContent: "center",
    marginVertical: 10,
  },
  outerCircle: {
    width: width * 0.4,
    height: width * 0.4,
    borderRadius: (width * 0.5) / 2,
    alignItems: "center",
    justifyContent: "center",
    padding: 4,
  },
  innerCircle: {
    backgroundColor: "#fff",
    width: "92%",
    height: "92%",
    borderRadius: (width * 0.5 * 0.92) / 2,
    alignItems: "center",
    justifyContent: "center",
  },

  progressBackground: {
    width: "100%",
    height: 6,
    borderRadius: 10,
    backgroundColor: "#e0e0e0",
    overflow: "hidden",
    marginTop: 5,
    marginBottom: 5,
  },
  progressFill: {
    height: "100%",
    borderRadius: 10,
  },
});

export default DietSummaryCard;
