import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import PieChart from "react-native-pie-chart";

const { width } = Dimensions.get("window");

const WorkoutDistributionChart = ({ protein, carbs, fats, calories, fiber, sugar }) => {
  const data = [
    {
      name: "Proteins",
      percentage: protein,
      width: 22,
      icon: require("../../../assets/images/diet/protein.png"),
      color: "#21A065",
    },
    {
      name: "Carbs",
      percentage: carbs,
      width: 22,
      icon: require("../../../assets/images/diet/carb.png"),
      color: "#38B59C",
    },
    {
      name: "Fats",
      percentage: fats,
      width: 17,
      icon: require("../../../assets/images/diet/fat.png"),
      color: "#108CB6",
    },
    {
      name: "Fiber",
      percentage: fiber,
      width: 17,
      icon: require("../../../assets/images/diet/fiber.png"),
      color: "#9C27B0", 
    },
    {
      name: "Sugar",
      percentage: sugar,
      width: 17,
      icon: require("../../../assets/images/diet/sugar.png"),
      color: "#FF9800", 
    },
  ];

  const series = data?.map((item) => item?.percentage);
  const sliceColors = data?.map((item) => item?.color);

  const total = series.reduce((sum, value) => sum + value, 0);

  return (
    <View style={styles.container}>
      {total !== 0 ? (
        <View style={styles.chartRow}>
          <View style={styles.chartWrapper}>
            <PieChart
              widthAndHeight={180}
              series={series}
              sliceColor={sliceColors}
              doughnut={true}
              coverRadius={0.75}
              coverFill={"#fff"}
              padAngle={0.12} // Increased padAngle significantly
              strokeWidth={4} // Increased strokeWidth
              stroke={"#fff"}
              innerRadius={60}
            />
            <View style={styles.centerLabelOverlay}>
              <Text style={styles.centerValue}>{"100%"}</Text>
              <Text style={styles.centerSubtext}>Total</Text>
            </View>
          </View>

          <View style={styles.legendList}>
            {data?.map((item) => (
              <View
                key={item?.name}
                style={[styles.legendItem, { backgroundColor: item?.color }]}
              >
                <Text style={styles.legendText}>
                  {item?.name}: {item?.percentage}%
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={styles.noDataContainer}>
          <Text style={styles.noDataText}>No data available yet</Text>
          <Text style={styles.noDataSubText}>
            Your nutritional data will appear here
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    paddingHorizontal: 10,
    width: width * 0.92,
    alignSelf: "center",
  },
  chartRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  chartWrapper: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  centerLabelOverlay: {
    position: "absolute",
    alignSelf: "center",
    alignItems: "center",
  },
  centerValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#0A0A0A",
  },
  centerSubtext: {
    fontSize: 12,
    color: "#999",
  },
  legendList: {
    justifyContent: "center",
    paddingLeft: 10,
  },
  legendItem: {
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
    marginBottom: 10,
    minWidth: 105,
    justifyContent: "center",
  },
  legendText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 12,
    textAlign: "center",
  },
  // No data states
  noDataContainer: {
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 20,
    width: "100%",
  },
  noDataText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
    marginBottom: 8,
  },
  noDataSubText: {
    fontSize: 14,
    color: "#888",
  },
  // No data states
  noDataContainer: {
    height: 180,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 20,
    width: "100%",
  },
  noDataText: {
    fontSize: 16,
    fontWeight: "500",
    color: "#666",
    marginBottom: 8,
  },
  noDataSubText: {
    fontSize: 14,
    color: "#888",
  },
});

export default WorkoutDistributionChart;
