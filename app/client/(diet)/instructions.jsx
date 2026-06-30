import { MaterialIcons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useMemo } from "react";
import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const Instructions = () => {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { instructions } = useLocalSearchParams();

  const bulletPoints = useMemo(() => {
    if (!instructions) return [];
    // Split by newlines, literal \n, or inline bullet chars (•, ●, -, *)
    return instructions
      .replace(/\\n/g, "\n")
      .split(/\n+|(?:\s*[•●►▸]\s*)/)
      .map((line) =>
        line
          .replace(/^[\s\-*]+/, "")
          .replace(/^\d+[\.\)]\s*/, "")
          .trim(),
      )
      .filter((line) => line.length > 0);
  }, [instructions]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <MaterialIcons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Instructions</Text>
        <View style={styles.headerButton} />
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <MaterialIcons name="description" size={20} color="#007AFF" />
            <Text style={styles.cardTitle}>From Your Nutritionist</Text>
          </View>

          {bulletPoints.map((point, index) => (
            <View key={index} style={styles.bulletRow}>
              <View style={styles.bulletDot} />
              <Text style={styles.bulletText}>{point}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </View>
  );
};

export default Instructions;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
  },
  headerButton: {
    padding: 4,
    width: 36,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  card: {
    backgroundColor: "#F8FCFF",
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: "#D0E4FF",
    paddingHorizontal: 12,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E8F0FE",
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
    paddingRight: 4,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#007AFF",
    marginTop: 7,
    marginRight: 6,
    flexShrink: 0,
  },
  bulletText: {
    flex: 1,
    fontSize: 13,
    color: "#333",
    lineHeight: 22,
  },
});
