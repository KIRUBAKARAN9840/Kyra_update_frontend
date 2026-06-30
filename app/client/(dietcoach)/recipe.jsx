import React, { useCallback } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  BackHandler,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const ACCENT = "#00BC7D";

// Remove diacritical marks and normalize to ASCII
const normalizeText = (text) => {
  if (!text) return "";
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae");
};

const Recipe = () => {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();

  const mealName = normalizeText(params.mealName) || "Recipe";
  const mealCategory = params.mealCategory || "Breakfast";

  // Parse ingredients string into array (semicolon-separated from API)
  const ingredientsRaw = params.ingredients || "";
  const ingredientsList = ingredientsRaw
    ? ingredientsRaw
        .split(";")
        .map((s) => normalizeText(s.trim()))
        .filter(Boolean)
    : [];

  // Parse recipe string into steps (numbered steps from API like "1. ... 2. ..." or "1) ... 2) ...")
  const recipeRaw = params.recipe || "";
  const recipeSteps = recipeRaw
    ? recipeRaw
        .split(/(?:\d+\.\s*|\d+\)\s*)/)
        .map((s) => normalizeText(s.trim()))
        .filter(Boolean)
    : [];

  useFocusEffect(
    useCallback(() => {
      const onBackPress = () => {
        router.back();
        return true;
      };
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );
      return () => backHandler.remove();
    }, [router]),
  );

  return (
    <View style={[styles.root, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>
          {mealName}
        </Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Category badge */}
        <View style={styles.badgeRow}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{mealCategory}</Text>
          </View>
        </View>

        {/* Ingredients */}
        {ingredientsList.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ingredients</Text>
            {ingredientsList.map((item, index) => (
              <View key={index} style={styles.ingredientRow}>
                <View style={styles.bullet} />
                <Text style={styles.ingredientText}>{item}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Recipe Steps */}
        {recipeSteps.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Recipe</Text>
            {recipeSteps.map((step, index) => (
              <View key={index} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <Text style={styles.stepText}>{step}</Text>
              </View>
            ))}
          </View>
        )}

        {ingredientsList.length === 0 && recipeSteps.length === 0 && (
          <View style={styles.emptyState}>
            <Feather name="info" size={20} color="#999" />
            <Text style={styles.emptyText}>
              No recipe details available for this meal.
            </Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

export default Recipe;

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    backgroundColor: "#fff",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
  },
  backButton: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    flex: 1,
    textAlign: "center",
  },
  headerSpacer: {
    width: 34,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 40,
  },
  // Badge
  badgeRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  badge: {
    backgroundColor: ACCENT,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 5,
  },
  badgeText: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "600",
  },
  // Sections
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 14,
  },
  // Ingredients
  ingredientRow: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
  },
  bullet: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: ACCENT,
    marginRight: 12,
  },
  ingredientText: {
    fontSize: 14,
    color: "#444",
    flex: 1,
  },
  // Steps
  stepRow: {
    flexDirection: "row",
    marginBottom: 16,
  },
  stepNumber: {
    width: 26,
    height: 26,
    borderRadius: 13,
    backgroundColor: ACCENT,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 12,
    marginTop: 2,
  },
  stepNumberText: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  stepText: {
    fontSize: 14,
    color: "#444",
    lineHeight: 21,
    flex: 1,
  },
  // Empty state
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 40,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: "#999",
    textAlign: "center",
  },
});
