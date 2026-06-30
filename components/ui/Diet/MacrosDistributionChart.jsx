import { LinearGradient } from "expo-linear-gradient";
import React from "react";
import { View, Text, StyleSheet, Dimensions } from "react-native";
import { PieChart } from "react-native-chart-kit";

const { width } = Dimensions.get("window");

const MacrosDistributionChart = ({ macrosData }) => {
  const pieData = macrosData.map((macro, index) => ({
    name: macro.name,
    population: macro.percentage,
    color: macro.color,
    legendFontColor: "#0A0A0A",
    legendFontSize: 12,
  }));

  return (
    <LinearGradient
      colors={["#007bff18", "#28a74616"]}
      start={{ x: 1, y: 1 }}
      end={{ x: 0, y: 0 }}
      style={styles.cardContainer}
    >
      <Text style={styles.title}>Macros Distribution</Text>
      <View
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexDirection: "row",
          //   backgroundColor: 'pink',
          marginLeft: "55%",
        }}
      >
        <PieChart
          data={pieData}
          width={width * 0.85}
          height={180}
          chartConfig={{
            backgroundGradientFrom: "#fff",
            backgroundGradientTo: "#fff",
            color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
            propsForBackgroundLines: { stroke: "transparent" },
          }}
          accessor={"population"}
          backgroundColor={"transparent"}
          //   paddingLeft={'0'}
          //   absolute
          hasLegend={false}
        />
      </View>

      <View style={styles.labelsRow}>
        {macrosData?.map((macro, index) => {
          if (macro.name === "grey") {
            return null;
          }
          return (
            <View key={index} style={styles.labelItem}>
              <Text style={[styles.labelText, { color: macro.color }]}>
                {macro.name}
              </Text>
              <Text style={styles.percentText}>
                {Number(macro.percentage)?.toFixed(2)}%
              </Text>
            </View>
          );
        })}
      </View>
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
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    width: "100%",
    fontSize: 16,
    // fontWeight: '700',
    color: "#0A0A0A",
    // marginBottom: 8,
    textAlign: "left",
  },
  labelsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 10,
    width: "100%",
  },
  labelItem: {
    alignItems: "center",
  },
  labelText: {
    fontSize: 14,
    fontWeight: "500",
    marginBottom: 2,
  },
  percentText: {
    fontSize: 12,
    fontWeight: "500",
    color: "#555",
  },
});

export default MacrosDistributionChart;
