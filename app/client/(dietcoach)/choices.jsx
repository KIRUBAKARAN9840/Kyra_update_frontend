import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  BackHandler,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Feather, Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter, useFocusEffect } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { MaskedText } from "../../../components/ui/MaskedText";
import { getDietCoachFoodsByPreferenceAPI } from "../../../services/clientApi";

const ACCENT = "#00BC7D";
const GRADIENT_1 = "#00BC7D";
const GRADIENT_2 = "#00BBA7";

const { width } = Dimensions.get("window");
const GRID_GAP = 10;
const CARD_SIZE = (width - 40 - GRID_GAP * 2) / 3;

const Choices = () => {
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [selected, setSelected] = useState([]);
  const [foods, setFoods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const preference = params.preference || "Non-vegetarian";

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

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      const res = await getDietCoachFoodsByPreferenceAPI(preference);
      if (cancelled) return;
      if (res?.status === 200 && Array.isArray(res?.data)) {
        setFoods(res.data);
      } else {
        setError(res?.detail || "Failed to load foods");
        setFoods([]);
      }
      setLoading(false);
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [preference]);

  const toggleFood = (id) => {
    setSelected((prev) =>
      prev.includes(id) ? prev.filter((a) => a !== id) : [...prev, id],
    );
  };

  const getLabel = (id) => {
    const item = foods.find((f) => f.id === id);
    return item ? item.label : String(id);
  };

  const handleContinue = () => {
    const labels = selected.map((id) => getLabel(id));
    router.push({
      pathname: "/client/(dietcoach)/medical",
      params: {
        ...params,
        choices: labels.join(","),
      },
    });
  };

  const canContinue = true;

  return (
    <LinearGradient
      colors={["#ECFDF5", "#FFFFFF", "#F0FDFA"]}
      locations={[0, 0.5, 1]}
      start={[0, 0]}
      end={[1, 1]}
      style={[styles.root, { paddingTop: insets.top }]}
    >
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <Feather name="arrow-left" size={24} color={ACCENT} />
        </TouchableOpacity>
        <View style={styles.stepIndicator}>
          <Text style={styles.stepText}>
            Step 7 of 8
            <Text style={styles.stepOptional}>  ·  Optional</Text>
          </Text>
        </View>
        <View style={styles.headerSpacer} />
      </View>

      <View style={styles.titleContainer}>
        <Text style={styles.titleText}>Select your </Text>
        <MaskedText
          bg1={GRADIENT_1}
          bg2={GRADIENT_2}
          text="preferences"
          textStyle={styles.titleTextBold}
        />
      </View>
      <View style={styles.subtitleSpacer} />

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <View style={styles.stateContainer}>
            <ActivityIndicator size="large" color={ACCENT} />
            <Text style={styles.stateText}>Loading dishes...</Text>
          </View>
        ) : error ? (
          <View style={styles.stateContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : foods.length === 0 ? (
          <View style={styles.stateContainer}>
            <Text style={styles.stateText}>
              No dishes available for {preference}
            </Text>
          </View>
        ) : (
          <View style={styles.grid}>
            {foods.map((item) => {
              const isActive = selected.includes(item.id);
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[styles.card, isActive && styles.cardActive]}
                  onPress={() => toggleFood(item.id)}
                  activeOpacity={0.7}
                >
                  {isActive && (
                    <View style={styles.cardCheck}>
                      <Ionicons
                        name="checkmark-circle"
                        size={18}
                        color={ACCENT}
                      />
                    </View>
                  )}
                  <Image
                    source={{ uri: item.image_url }}
                    style={styles.cardImage}
                    resizeMode="cover"
                  />
                  <Text
                    style={[
                      styles.cardLabel,
                      isActive && styles.cardLabelActive,
                    ]}
                    numberOfLines={1}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        {selected.length > 0 && (
          <View style={styles.chipsSection}>
            <Text style={styles.chipsLabel}>
              Selected: {selected.length}
            </Text>
            <View style={styles.chipsRow}>
              {selected.map((id) => (
                <View key={id} style={styles.chipWrapper}>
                  <LinearGradient
                    colors={[GRADIENT_1, GRADIENT_2]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.chip}
                  >
                    <View style={styles.chipDot} />
                    <Text style={styles.chipText}>{getLabel(id)}</Text>
                    <TouchableOpacity
                      onPress={() => toggleFood(id)}
                      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                    >
                      <Feather name="x" size={14} color="#fff" />
                    </TouchableOpacity>
                  </LinearGradient>
                </View>
              ))}
            </View>
          </View>
        )}
      </ScrollView>

      <View
        style={[styles.bottomContainer, { paddingBottom: insets.bottom + 20 }]}
      >
        <TouchableOpacity
          style={styles.continueButtonWrapper}
          onPress={handleContinue}
          activeOpacity={0.85}
          disabled={!canContinue}
        >
          <LinearGradient
            colors={
              canContinue ? [GRADIENT_1, GRADIENT_2] : ["#EEEEEE", "#EEEEEE"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.continueButton}
          >
            <Text
              style={[
                styles.continueButtonText,
                !canContinue && styles.disabledButtonText,
              ]}
            >
              {selected.length === 0 ? "Skip" : "Continue"}
            </Text>
            <Feather
              name="arrow-right"
              size={16}
              color={canContinue ? "white" : "#454545"}
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

export default Choices;

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 15,
  },
  backButton: {
    padding: 5,
  },
  stepIndicator: {
    flex: 1,
    alignItems: "center",
  },
  stepText: {
    fontSize: 14,
    color: "#6A7282",
    fontWeight: "500",
  },
  headerSpacer: {
    width: 34,
  },
  titleContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 20,
    marginTop: 0,
    flexWrap: "wrap",
  },
  titleText: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  titleTextBold: {
    fontSize: 24,
    fontWeight: "700",
  },
  stepOptional: {
    color: ACCENT,
    fontWeight: "600",
  },
  subtitleSpacer: {
    height: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  stateContainer: {
    paddingVertical: 60,
    alignItems: "center",
    justifyContent: "center",
  },
  stateText: {
    marginTop: 12,
    fontSize: 13,
    color: "#666",
  },
  errorText: {
    fontSize: 13,
    color: "#E74C3C",
    textAlign: "center",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: GRID_GAP,
    justifyContent: "flex-start",
  },
  card: {
    width: CARD_SIZE,
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#eee",
    position: "relative",
    overflow: "hidden",
    paddingBottom: 10,
  },
  cardActive: {
    borderColor: ACCENT,
    backgroundColor: "#FFFFFF",
  },
  cardImage: {
    width: CARD_SIZE - 4,
    height: CARD_SIZE - 20,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    marginBottom: 8,
  },
  cardLabel: {
    fontSize: 11,
    fontWeight: "600",
    color: "#666",
    textAlign: "center",
    paddingHorizontal: 4,
  },
  cardLabelActive: {
    color: "#333",
  },
  cardCheck: {
    position: "absolute",
    top: 6,
    right: 6,
    zIndex: 2,
    backgroundColor: "#fff",
    borderRadius: 9,
  },
  chipsSection: {
    marginTop: 20,
  },
  chipsLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 8,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chipWrapper: {
    borderRadius: 20,
    overflow: "hidden",
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    gap: 6,
  },
  chipDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#fff",
  },
  chipText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#fff",
  },
  bottomContainer: {
    paddingHorizontal: 20,
    paddingTop: 10,
  },
  continueButtonWrapper: {
    borderRadius: 12,
    overflow: "hidden",
    width: "75%",
    alignSelf: "center",
  },
  continueButton: {
    flexDirection: "row",
    paddingVertical: 14,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    gap: 6,
  },
  continueButtonText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  disabledButtonText: {
    color: "#454545",
  },
});
