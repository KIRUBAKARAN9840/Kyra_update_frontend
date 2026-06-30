import React from "react";
import { Dimensions, StyleSheet, Text, View } from "react-native";
import { LineChart } from "react-native-chart-kit";

const { width } = Dimensions.get("window");

const MonthlyTrendChart = ({ monthlyData }) => {
  if (!monthlyData || !Array.isArray(monthlyData) || monthlyData.length === 0) {
    return (
      <View style={styles.emptyStateContainer}>
        <Text style={styles.emptyStateText}>No data available</Text>
        <Text style={styles.emptyStateSubText}>
          Data will appear here as you log your progress
        </Text>
      </View>
    );
  }

  // Filter out any invalid data points
  const validData = monthlyData.filter(
    (item) =>
      item && item.label && item.value !== undefined && item.value !== null
  );

  if (validData.length === 0) {
    return (
      <View style={styles.emptyStateContainer}>
        <Text style={styles.emptyStateText}>No valid data available</Text>
        <Text style={styles.emptyStateSubText}>
          Data will appear here as you log your progress
        </Text>
      </View>
    );
  }

  // Extract data safely with proper error handling
  let chartLabels = validData.map((item) => {
    try {
      return new Date(item.label).toLocaleDateString("en-US", {
        month: "short",
      });
    } catch (e) {
      return "";
    }
  });

  let chartValues = validData.map((item) => Number(item.value) || 0);

  // Ensure we have at least one valid value
  if (
    chartValues.every((val) => val === 0) &&
    chartLabels.every((label) => label === "")
  ) {
    return (
      <View style={styles.emptyStateContainer}>
        <Text style={styles.emptyStateText}>No valid data points</Text>
        <Text style={styles.emptyStateSubText}>
          Data will appear here as you log your progress
        </Text>
      </View>
    );
  }

  // Base chart configuration
  const enhancedChartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(255, 87, 87, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    barPercentage: 0.8,
    propsForDots: {
      r: "2",
      strokeWidth: "2",
      stroke: "#FF5757",
    },
    propsForLabels: {
      fontSize: 12,
      fontWeight: "500",
    },
  };

  // Handle edge cases for LineChart
  // Check if we need to duplicate the single point for LineChart
  // Only do this if we have exactly one data point
  if (chartValues.length === 1) {
    // LineChart needs at least 2 points
    chartValues = [...chartValues, chartValues[0]];
    chartLabels = [...chartLabels, chartLabels[0] + " "];
  }

  // Remove any duplicate entries that might have been introduced elsewhere
  // Create a map to track unique month-value combinations
  const uniqueEntries = new Map();
  const uniqueLabels = [];
  const uniqueValues = [];

  // Only keep the first occurrence of each month
  chartLabels.forEach((label, index) => {
    const key = label.trim(); // Normalize by trimming spaces
    if (!uniqueEntries.has(key)) {
      uniqueEntries.set(key, true);
      uniqueLabels.push(label);
      uniqueValues.push(chartValues[index]);
    }
  });

  // Replace with deduplicated arrays
  chartLabels = uniqueLabels;
  chartValues = uniqueValues;

  return (
    <LineChart
      data={{
        labels: chartLabels,
        datasets: [
          {
            data: chartValues,
            color: (opacity = 1) => `rgba(255, 87, 87, ${opacity})`,
            strokeWidth: 2,
          },
        ],
      }}
      width={width - 60}
      height={220}
      chartConfig={enhancedChartConfig}
      bezier
      style={{
        marginVertical: 8,
        borderRadius: 8,
      }}
      formatYLabel={(value) => Math.round(value).toString()}
      withInnerLines={false}
      withOuterLines={true}
      fromZero
    />
  );
};

export default MonthlyTrendChart;

const styles = StyleSheet.create({
  emptyStateContainer: {
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    padding: 20,
    marginVertical: 10,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#eee",
    height: 200,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#666",
    textAlign: "center",
  },
  emptyStateSubText: {
    fontSize: 14,
    color: "#888",
    textAlign: "center",
    marginTop: 8,
  },
});
