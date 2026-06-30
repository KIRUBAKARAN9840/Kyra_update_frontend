import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Dimensions,
  Platform,
  StatusBar,
  Alert,
  SectionList,
  Image,
  Animated,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import GradientButton2 from "../GradientButton2";
import { toIndianISOString } from "../../../utils/basicUtilFunctions";

const { width } = Dimensions.get("window");

const renderFoodCard = ({ item }) => {
  const macros = [
    {
      label: "Calories",
      value: item?.calories || 0,
      width: 13,
      // color: nutritionColors.protein,
      icon: require("../../../assets/images/diet/calorie.png"),
    },
    {
      label: "Protein",
      value: item?.protein || 0,
      width: 22,
      // color: nutritionColors.protein,
      icon: require("../../../assets/images/diet/protein.png"),
    },
    {
      label: "Carbs",
      value: item?.carbs || 0,
      width: 24,
      // color: nutritionColors.carbs,
      icon: require("../../../assets/images/diet/carb.png"),
    },

    {
      label: "Fat",
      value: item?.fat || 0,
      width: 17,
      // color: nutritionColors.fat,
      icon: require("../../../assets/images/diet/fat.png"),
    },
    {
      label: "Fiber",
      value: item?.fiber || 0,
      width: 17,
      // color: nutritionColors.fiber,
      icon: require("../../../assets/images/diet/fiber.png"),
    },
    {
      label: "Sugar",
      value: item?.sugar || 0,
      width: 17,
      // color: nutritionColors.sugar,
      icon: require("../../../assets/images/diet/sugar.png"),
    },
  ];

  return (
    <LinearGradient
      colors={["#eef5ff", "#f0faf5"]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.foodCard}
    >
      {/* <View style={styles.foodCard}> */}
      <View style={styles.foodCardHeader}>
        <View style={styles.foodTitleContainer}>
          <Text style={styles.foodCardTitle}>{item.name}</Text>
          {item.quantity > 1 && (
            <Text style={styles.quantityText}>(Quantity: {item.quantity})</Text>
          )}
        </View>
      </View>
      <View style={styles.nutritionContainer}>
        {macros?.map((item, index) => {
          return (
            <React.Fragment key={`macro-${index}`}>
              <View style={styles.nutritionItem}>
                <Image
                  source={item.icon}
                  style={[styles.macroIcon, { width: item.width }]}
                />
                <Text style={styles.nutritionValue}>
                  {Math.round(item.value)}
                </Text>
                <Text style={styles.nutritionLabel}>{item.label}</Text>
              </View>
              {index < macros.length - 1 && (
                <View style={styles.nutritionDivider} />
              )}
            </React.Fragment>
          );
        })}
      </View>
    </LinearGradient>
  );
};

const renderSectionHeader = ({ section: { title } }) => (
  <View style={styles.timeHeader}>
    {/* <Text style={styles.timeHeaderText}>{title}</Text> */}
    <GradientButton2
      title={`Time: ${title}`}
      fromColor={"#28A745"}
      toColor={"#007BFF"}
      mainContainerStyle={{ alignItems: "left", justifyContent: "left" }}
      disable
    />
  </View>
);

const FoodLogCard = ({ selectedDate, consumedFoods }) => {
  const groupFoodsByTime = (foods) => {
    if (!foods || foods.length === 0) {
      return [];
    }

    const groupedFoods = foods
      .filter((food) => {
        const formattedSelectedDate =
          selectedDate instanceof Date
            ? toIndianISOString(selectedDate).split("T")[0]
            : selectedDate;
        return food.date === formattedSelectedDate;
      })
      .reduce((groups, food) => {
        const timeKey = food.timeAdded || "Unknown";
        if (!groups[timeKey]) {
          groups[timeKey] = [];
        }
        groups[timeKey].push(food);
        return groups;
      }, {});

    return Object.entries(groupedFoods)
      .map(([time, items]) => ({
        title: time,
        data: items,
      }))
      .sort((a, b) => b.title.localeCompare(a.title));
  };

  return (
    <View style={styles.card}>
      <Text style={styles.cardTitle}>Food Log</Text>
      <View style={styles.cardContent}>
        <SectionList
          sections={groupFoodsByTime(consumedFoods)}
          renderItem={renderFoodCard}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item, index) => index}
          contentContainerStyle={styles.foodList}
          stickySectionHeadersEnabled={true}
          scrollEnabled={false}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No foods added for this date</Text>
            </View>
          }
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: "white",
    borderRadius: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: "bold",
    paddingHorizontal: 15,
    paddingTop: 15,
  },
  cardContent: {
    padding: 10,
  },
  nutritionRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 20,
  },
  nutritionItem2: {
    flex: 1,
    marginHorizontal: 5,
  },
  nutritionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 5,
  },
  nutritionLabel2: {
    fontSize: 12,
    fontWeight: "500",
  },
  nutritionValue2: {
    fontSize: 12,
    color: "#666",
  },
  progressContainer: {
    height: 8,
    backgroundColor: "#E0E0E0",
    borderRadius: 4,
    overflow: "hidden",
  },
  progressBar: {
    height: "100%",
  },
  foodList: {
    paddingVertical: 5,
  },
  foodCard: {
    backgroundColor: "white",
    borderRadius: 15,
    padding: 15,
    margin: 5,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  foodCardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 10,
  },
  foodTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  foodCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    marginLeft: 8,
  },
  nutritionContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 10,
  },
  nutritionItem: {
    alignItems: "center",
    flex: 1,
  },
  nutritionValue: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
  },
  nutritionLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 4,
  },
  nutritionDivider: {
    width: 1,
    height: "100%",
    backgroundColor: "#E0E0E0",
  },
  quantityText: {
    fontSize: 12,
    color: "#666",
    // marginTop: 8,
    marginLeft: 6,
  },
  timeHeader: {
    // backgroundColor: '#f5f5f5',
    // width: '100%',
    // padding: 10,
    paddingHorizontal: 5,
    borderRadius: 8,
    marginTop: 10,
    marginBottom: 5,
    width: "38%",
    display: "flex",
    alignItems: "left",
    justifyContent: "left",
  },
  timeHeaderText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#666",
  },
  emptyContainer: {
    padding: 20,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 14,
    color: "#666",
    fontStyle: "italic",
  },
  macroIcon: {
    // width: 12,
    height: 21,
    marginRight: 4,
  },
});

export default FoodLogCard;
