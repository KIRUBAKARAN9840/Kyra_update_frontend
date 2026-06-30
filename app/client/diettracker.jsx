import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  BackHandler,
  Dimensions,
  Platform,
  StatusBar,
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  Image,
  ScrollView,
} from "react-native";

import DietSelection from "../../components/ui/Diet/adddiet";
import CalorieTrackerCard from "../../components/ui/Diet/CalorieTrackerCard";

import { showToast } from "../../utils/Toaster";
import SkeletonDiet from "../../components/ui/Diet/skeletonDiet";

import { getMacrosAPI } from "../../services/clientApi";
import { getCachedLocation } from "../../services/locationCache";
import { ManualCalorieModal } from "../../components/ui/Home/progesspage/calculatecalories";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Image as ExpoImage } from "expo-image";
import FeedbackModal from "../../components/ui/FeedbackModal";
import { MaskedText } from "../../components/ui/MaskedText";

const { width } = Dimensions.get("window");

const DietTracker = () => {
  const router = useRouter();
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [gender, setGender] = useState("");

  const [macrosData, setMacrosData] = useState(null);
  const [macrosLoading, setMacrosLoading] = useState(true);
  const [manualMacrosModalVisible, setManualMacrosModalVisible] =
    useState(false);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [credits, setCredits] = useState(0);
  const [locationCoords, setLocationCoords] = useState(null);
  const [nutritionPurchased, setNutritionPurchased] = useState(false);
  const [dietPlanAssigned, setDietPlanAssigned] = useState(false);

  useEffect(() => {
    if (params?.showTarget === "true") {
      setTimeout(() => setShowTargetModal(true), 500);
    } else if (params?.showFeedback === "true") {
      setTimeout(() => setShowFeedbackModal(true), 500);
    }
  }, [params?.showTarget, params?.showFeedback]);

  useFocusEffect(
    useCallback(() => {
      fetchMacros();
    }, []),
  );

  const fetchMacros = async () => {
    setMacrosLoading(true);
    try {
      const res = await getMacrosAPI();
      if (res?.status === 200) {
        const overall = res.data.overall;
        const remaining = res.data.remaining;
        setCredits(res?.credits);
        setNutritionPurchased(res?.nutrition_purchased ?? false);
        setDietPlanAssigned(res?.diet_plan_assigned ?? false);
        setMacrosData({
          caloriesEaten: overall.calories?.actual ?? 0,
          caloriesTarget: overall.calories?.target ?? 0,
          caloriesLeft: remaining.calories ?? 0,
          protein: {
            eaten: overall.protein?.actual ?? 0,
            target: overall.protein?.target ?? 0,
            left: remaining.protein ?? 0,
          },
          carbs: {
            eaten: overall.carbs?.actual ?? 0,
            target: overall.carbs?.target ?? 0,
            left: remaining.carbs ?? 0,
          },
          fat: {
            eaten: overall.fat?.actual ?? 0,
            target: overall.fat?.target ?? 0,
            left: remaining.fat ?? 0,
          },
          fiber: {
            eaten: overall.fiber?.actual ?? 0,
            target: overall.fiber?.target ?? 0,
            left: remaining.fiber ?? 0,
          },
          sugar: {
            eaten: overall.sugar?.actual ?? 0,
            target: overall.sugar?.target ?? 0,
            left: remaining.sugar ?? 0,
          },
        });
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: res?.detail || "Something went wrong. Please try again later",
        });
      }
    } catch (error) {
      console.error("Error fetching macros:", error);
      showToast({
        type: "error",
        title: "Error",
        desc: "Failed to fetch macros data",
      });
    } finally {
      setMacrosLoading(false);
    }
  };

  const getGender = async () => {
    try {
      setGender(await AsyncStorage.getItem("gender"));
    } catch (err) {
      showToast({
        type: "error",
        title: "Something went wrong. Please try again later.",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getGender();
    getCachedLocation().then((coords) => {
      if (coords) setLocationCoords(coords);
    });
  }, []);

  const renderContent = () => {
    return (
      <>
        <DietSelection
          gender={gender}
          locationCoords={locationCoords}
          nutritionPurchased={nutritionPurchased}
          dietPlanAssigned={dietPlanAssigned}
        />
      </>
    );
  };

  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        router.replace("/client/home");
        return true;
      };

      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction,
      );

      return () => {
        backHandler.remove();
      };
    }, []),
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 10 }]}>
      {loading ? (
        <SkeletonDiet priority="high" type="home" />
      ) : (
        <>
          <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
            <TouchableOpacity
              onPress={() => router.replace("/client/home")}
              style={styles.backBtn}
              activeOpacity={0.7}
            >
              <Ionicons name="arrow-back" size={22} color="#000" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Diet Tracker</Text>
            <TouchableOpacity
              style={styles.earnBtn}
              activeOpacity={0.8}
              onPress={() => router.push("/client/credits")}
            >
              <Image
                source={require("../../assets/images/credit.png")}
                style={styles.earnIcon}
                contentFit="contain"
              />
              <View>
                <Text style={styles.earnLabel}>AI Credits</Text>
                <Text style={styles.earnAmount}>{credits}</Text>
              </View>
            </TouchableOpacity>
          </View>
          <ScrollView contentContainerStyle={{ paddingBottom: 50 }}>
            {macrosLoading ? (
              <View style={styles.macrosLoader}>
                <ActivityIndicator size="large" color="#007BFF" />
              </View>
            ) : (
              <CalorieTrackerCard
                data={macrosData ?? undefined}
                onTargetCal={() => setManualMacrosModalVisible(true)}
                onViewReport={() => router.push("/client/(diet)/report")}
              />
            )}
            {renderContent()}
          </ScrollView>

          <ManualCalorieModal
            visible={manualMacrosModalVisible}
            onClose={() => setManualMacrosModalVisible(false)}
            target={{
              calories: macrosData?.caloriesTarget ?? "",
              protein: macrosData?.protein?.target ?? "",
              carbs: macrosData?.carbs?.target ?? "",
              fat: macrosData?.fat?.target ?? "",
              fiber: macrosData?.fiber?.target ?? 0,
              sugar: macrosData?.sugar?.target ?? 0,
            }}
            getHomeData={fetchMacros}
            calculate={null}
          />

          {/* Target Achievement Modal */}
          <Modal
            animationType="fade"
            transparent={true}
            visible={showTargetModal}
            onRequestClose={() => setShowTargetModal(false)}
          >
            <View style={styles.achievementOverlay}>
              <View style={styles.achievementContent}>
                <TouchableOpacity
                  style={{
                    position: "absolute",
                    top: 10,
                    right: 10,
                    zIndex: 10,
                  }}
                  onPress={() => setShowTargetModal(false)}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>

                <ExpoImage
                  source={require("../../assets/images/modal/diet.webp")}
                  style={styles.achievementImage}
                  contentFit="contain"
                />

                <View style={styles.achievementTitleContainer}>
                  <MaskedText
                    bg1="#28A745"
                    bg2="#007BFF"
                    text="Great job!"
                    textStyle={styles.achievementTitleText}
                  >
                    Great job!
                  </MaskedText>
                </View>

                <View style={styles.achievementSubtitleContainer}>
                  <MaskedText
                    bg1="#28A745"
                    bg2="#007BFF"
                    text="You've hit your daily diet goal!"
                    textStyle={styles.achievementSubtitleText}
                  >
                    You've hit your daily diet goal!
                  </MaskedText>
                </View>

                <View style={styles.achievementTextContainer}>
                  <Text style={styles.achievementText}>You've consumed </Text>
                  <MaskedText
                    bg1="#28A745"
                    bg2="#007BFF"
                    text={`${Math.round(macrosData?.caloriesTarget ?? 0)}`}
                    textStyle={styles.achievementAmount}
                  >
                    {Math.round(macrosData?.caloriesTarget ?? 0)}
                  </MaskedText>
                  <Text style={styles.achievementText}>kcal today</Text>
                </View>

                <Text style={styles.achievementSubtext}>
                  Stay consistent — your body's loving the progress
                </Text>
              </View>
            </View>
          </Modal>

          {/* Feedback Modal */}
          <FeedbackModal
            visible={showFeedbackModal}
            onClose={() => setShowFeedbackModal(false)}
          />
        </>
      )}
    </View>
  );
};

export default DietTracker;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  macrosLoader: {
    height: 150,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 10,
  },
  backBtn: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    letterSpacing: 0.5,
    flex: 1,
    marginLeft: 10,
  },
  earnBtn: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#C7DAFF",
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
    gap: 5,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 3,
  },
  earnIcon: {
    width: 22,
    height: 22,
  },
  earnLabel: {
    fontSize: 10,
    color: "#525252",
    lineHeight: 13,
  },
  earnAmount: {
    fontSize: 12,
    fontWeight: "700",
    color: "#191919",
    lineHeight: 15,
  },
  achievementOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.6)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  achievementContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 30,
    width: "90%",
    maxWidth: 400,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  achievementImage: {
    width: 180,
    height: 160,
    marginBottom: 20,
  },
  achievementTitleContainer: {
    marginBottom: 8,
  },
  achievementTitleText: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  achievementSubtitleContainer: {
    marginBottom: 8,
  },
  achievementSubtitleText: {
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
  achievementTextContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10,
    gap: 3,
  },
  achievementText: {
    fontSize: 12,
    color: "#333",
    textAlign: "center",
  },
  achievementAmount: {
    fontSize: 16,
    fontWeight: "700",
  },
  achievementSubtext: {
    fontSize: 10,
    color: "#868686",
    marginTop: 5,
    marginBottom: 25,
    textAlign: "center",
  },
});
