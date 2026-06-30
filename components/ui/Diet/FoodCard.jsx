import { Image } from "expo-image";
import React from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import StepperButton from "./StepperButton";
import RightArrowIcon from "../../right_arrow";
import { usePathname, useRouter } from "expo-router";

const FoodCard = ({
  id,
  image,
  title,
  calories,
  carbs,
  fat,
  fiber = 0,
  sugar = 0,
  calcium = 0,
  magnesium = 0,
  iron = 0,
  sodium = 0,
  potassium = 0,
  protein,
  quantity,
  time,
  timeAdded,
  onAdd,
  updateFoodQuantity,
  showAddFoodButton,
  viewAllFood,
  isSelected,
}) => {
  const [addFood, setAddFood] = React.useState(isSelected || false);
  const [foodCount, setFoodCount] = React.useState(1);
  const pathname = usePathname();

  const nutrients = [
    {
      value: calories,
      unit: "kcal",
      icon: require("../../../assets/images/diet/calorie.png"),
      cal: true,
    },
    {
      value: protein,
      unit: "g",
      icon: require("../../../assets/images/diet/protein.png"),
    },
    {
      value: carbs,
      unit: "g",
      icon: require("../../../assets/images/diet/carb.png"),
    },
    {
      value: fat,
      unit: "g",
      icon: require("../../../assets/images/diet/fat.png"),
      small: true,
    },
    {
      value: fiber,
      unit: "g",
      icon: require("../../../assets/images/diet/fiber.png"),
      fib: true,
    },
    {
      value: sugar,
      unit: "g",
      icon: require("../../../assets/images/diet/sugar.png"),
      fib: true,
    },
  ];

  React.useEffect(() => {
    setAddFood(isSelected);
  }, [isSelected]);

  const handleFoodCount = (count) => {
    setFoodCount(count);
    updateFoodQuantity(id, count);
  };

  const handleCardPress = () => {
    if (!time && !addFood) {
      setAddFood(true);
      onAdd();
    }
  };

  const handleAddButtonPress = (e) => {
    e.stopPropagation();

    if (!time) {
      onAdd();
      if (addFood) {
        setFoodCount(1);
      }
    }
  };

  const getLabel = (index) => {
    const labels = ["Calories", "Proteins", "Carbs", "Fats", "Fiber", "Sugar"];
    return labels[index] || "";
  };

  if (!id) {
    return null;
  }

  const handleNothing = (e) => {
    if (pathname === "/client/allfoods") {
      handleAddButtonPress(e);
    }
  };

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={viewAllFood ? (e) => handleNothing(e) : handleCardPress}
      activeOpacity={0.8}
    >
      <View style={styles.container}>
        {/* Food Image */}
        <Image
          source={image || require("../../../assets/images/Tiramisu.png")}
          style={styles.image}
        />

        {/* Content */}
        <View style={styles.content}>
          {/* Title Row */}
          <View style={styles.titleRow}>
            <Text style={styles.title}>{title}</Text>
            <Text style={styles.quantity}>{quantity}</Text>

            <TouchableOpacity
              onPress={handleAddButtonPress}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              {time ? (
                <Text style={styles.timeText}>{time}</Text>
              ) : (
                <>
                  {!showAddFoodButton && (
                    <Text style={!addFood ? styles.addText : styles.removeText}>
                      {!addFood ? "+Add" : "- Remove"}
                    </Text>
                  )}
                </>
              )}
            </TouchableOpacity>
          </View>

          {/* Nutrition Grid - only show when not added */}
          {!addFood && (
            <View style={styles.nutritionContainer}>
              {nutrients.map((item, index) => (
                <View style={styles.nutritionItem} key={index}>
                  <View style={styles.iconContainer}>
                    <Image
                      source={item.icon}
                      style={[
                        styles.nutritionIcon,
                        item?.cal && styles.extra,
                        item?.small && styles.extraSmall,
                      ]}
                    />
                  </View>
                  <Text style={styles.nutritionText}>
                    {item.value}
                    <Text style={styles.unitText}> {item.unit}</Text>
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Stepper for selected food */}
          {addFood && (
            <View style={styles.stepperContainer}>
              <StepperButton foodCount={foodCount} onChange={handleFoodCount} />
            </View>
          )}
        </View>
      </View>

      {/* Micronutrients - Full width below image and macros - only show when not added */}
      {!addFood && (
        <View style={styles.micronutrientsSection}>
          <View style={styles.micronutrientsHeader}>
            <Text style={styles.micronutrientsTitle}>Micro Nutrients</Text>
            <View style={styles.micronutrientsDivider} />
          </View>
          <View style={styles.micronutrientsRow}>
            <View style={styles.microItem}>
              <Text style={styles.microValue}>
                {Math.round(calcium || 0)}mg
              </Text>
              <Text style={styles.microLabel}>Calcium</Text>
            </View>
            <View style={styles.microItem}>
              <Text style={styles.microValue}>
                {Math.round(magnesium || 0)}mg
              </Text>
              <Text style={styles.microLabel}>Magnesium</Text>
            </View>
            <View style={styles.microItem}>
              <Text style={styles.microValue}>{Math.round(sodium || 0)}mg</Text>
              <Text style={styles.microLabel}>Sodium</Text>
            </View>
            <View style={styles.microItem}>
              <Text style={styles.microValue}>
                {Math.round(potassium || 0)}mg
              </Text>
              <Text style={styles.microLabel}>Potassium</Text>
            </View>
            <View style={styles.microItem}>
              <Text style={styles.microValue}>{Math.round(iron || 0)}mg</Text>
              <Text style={styles.microLabel}>Iron</Text>
            </View>
          </View>
        </View>
      )}

      {/* LinearGradient nutrition section when food is added */}
      {addFood && (
        <View style={styles.nutri}>
          <LinearGradient
            colors={["#28a7461e", "#007bff1d"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.nutrition_2}
          >
            {nutrients.map((item, index) => (
              <View style={styles.row} key={index}>
                <Image
                  source={item.icon}
                  style={[
                    styles.icon,
                    // { width: 22 },
                    item?.cal && styles.extra,
                    item?.small && styles.extraSmall,
                    item?.fib && styles.extraLarge,
                  ]}
                />
                <Text style={styles.label}>{getLabel(index)}</Text>
                <Text style={styles.value}>{item.value * foodCount}</Text>
              </View>
            ))}
          </LinearGradient>

          {/* Micronutrients Row - Expanded State */}
          <View style={styles.micronutrientsSection}>
            <View style={styles.micronutrientsHeader}>
              <Text style={styles.micronutrientsTitle}>Micro Nutrients</Text>
              <View style={styles.micronutrientsDivider} />
            </View>
            <View style={styles.micronutrientsRow}>
              <View style={styles.microItem}>
                <Text style={styles.microValue}>
                  {Math.round((calcium || 0) * foodCount)}mg
                </Text>
                <Text style={styles.microLabel}>Calcium</Text>
              </View>
              <View style={styles.microItem}>
                <Text style={styles.microValue}>
                  {Math.round((magnesium || 0) * foodCount)}mg
                </Text>
                <Text style={styles.microLabel}>Magnesium</Text>
              </View>
              <View style={styles.microItem}>
                <Text style={styles.microValue}>
                  {Math.round((sodium || 0) * foodCount)}mg
                </Text>
                <Text style={styles.microLabel}>Sodium</Text>
              </View>
              <View style={styles.microItem}>
                <Text style={styles.microValue}>
                  {Math.round((potassium || 0) * foodCount)}mg
                </Text>
                <Text style={styles.microLabel}>Potassium</Text>
              </View>
              <View style={styles.microItem}>
                <Text style={styles.microValue}>
                  {Math.round((iron || 0) * foodCount)}mg
                </Text>
                <Text style={styles.microLabel}>Iron</Text>
              </View>
            </View>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
};

export default FoodCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 12,
    marginVertical: 4,
    marginHorizontal: 16,
    elevation: 2,
    shadowColor: "#000",
    shadowOpacity: 0.06,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
  },
  container: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  image: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  title: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1f2937",
    marginRight: 8,
  },
  quantity: {
    fontSize: 10,
    color: "#9ca3af",
    marginRight: "auto",
  },
  addText: {
    color: "#10b981",
    fontWeight: "600",
    fontSize: 10,
  },
  removeText: {
    color: "#ef4444",
    fontWeight: "600",
    fontSize: 8,
  },
  timeText: {
    color: "#6b7280",
    fontWeight: "500",
    fontSize: 12,
  },
  nutritionContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
  },
  nutritionItem: {
    flexDirection: "row",
    alignItems: "center",
    width: "32%",
    marginBottom: 6,
  },
  iconContainer: {
    width: 26,
    height: 26,
    borderRadius: 14,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 4,
  },
  nutritionIcon: {
    width: 16,
    height: 14,
  },
  extra: {
    width: 12,
    height: 18,
  },
  extraSmall: {
    width: 14,
    height: 18,
  },
  nutritionText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#1f2937",
  },
  unitText: {
    fontSize: 8,
    fontWeight: "400",
    color: "#6b7280",
  },
  stepperContainer: {
    alignItems: "center",
    marginTop: 8,
  },
  nutri: {
    marginTop: 10,
  },
  nutrition_2: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-around",
    width: "100%",
    borderRadius: 12,
    paddingVertical: 8,
    backgroundColor: "#fff",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 3,
  },
  row: {
    alignItems: "center",
  },
  icon: {
    width: 20,
    height: 21,
  },
  label: {
    fontSize: 10,
    color: "#666",
  },
  value: {
    fontSize: 10,
  },
  extraLarge: {
    width: 24,
  },
  // Micronutrients styles
  micronutrientsSection: {
    marginTop: 2,
    paddingTop: 2,
  },
  micronutrientsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  micronutrientsTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginRight: 4,
  },
  micronutrientsDivider: {
    flex: 1,
    height: 1,
    backgroundColor: "#e0e0e0",
  },
  micronutrientsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  microItem: {
    alignItems: "center",
    flex: 1,
  },
  microValue: {
    fontSize: 10,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  microLabel: {
    fontSize: 10,
    color: "#666",
    textAlign: "center",
  },
});
