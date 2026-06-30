import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ScrollView,
  Image,
  FlatList,
  Platform,
} from "react-native";
import React, { useState, useEffect } from "react";
import TabHeader from "../../components/ui/TabHeader";
import { useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getPersonalTraining } from "../../services/clientApi";
import { safeGetAsyncStorage, safeParseInt, safeParseJSON } from "../../utils/safeHelpers";
import { useSafeAreaInsets } from "react-native-safe-area-context";
const { width, height } = Dimensions.get("window");

const PersonalTraining = () => {
  const tabs = [
    { id: "view_trainers", label: "Personal Trainers", icon: "" },

    {
      id: "view_plans",
      label: "PT Plans",
      icon: "",
    },
  ];
  const [activeTab, setActiveTab] = useState("view_trainers");
  const [trainers, setTrainers] = useState([]);
  const [plans, setPlans] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gymId, setGymId] = useState(null);
  const router = useRouter();
  const insets = useSafeAreaInsets();

  const getGymIdFromStorage = async () => {
    try {
      const storedGymId = await safeGetAsyncStorage("gym_id", null);
      if (storedGymId) {
        const parsedGymId = safeParseInt(storedGymId, null);
        setGymId(parsedGymId);
        return parsedGymId;
      }
    } catch (error) {
      console.error("Error getting gym_id from AsyncStorage:", error);
    }
    return null;
  };

  const formatWorkTimings = (workTimingsString) => {
    if (!workTimingsString) return "Timings not available";

    const timings = safeParseJSON(workTimingsString, null);
    if (!Array.isArray(timings) || timings.length === 0) {
      return "Timings not available";
    }

    return timings
      .map((timing) => `${timing?.startTime || ''} - ${timing?.endTime || ''}`)
      .join(", ");
  };

  const fetchPersonalTrainingData = async () => {
    try {
      setLoading(true);
      const gymIdFromStorage = await getGymIdFromStorage();

      if (!gymIdFromStorage) {
        console.error("No gym_id found in AsyncStorage");
        setLoading(false);
        return;
      }

      const response = await getPersonalTraining(gymIdFromStorage);

      if (response && response.status === 200 && response.data) {
        setTrainers(response.data.trainers || []);
        setPlans(response.data.plans || []);
      } else {
        console.error("Failed to fetch personal training data:", response);
      }
    } catch (error) {
      console.error("Error fetching personal training data:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPersonalTrainingData();
  }, []);

  const TrainerCard = ({ trainer }) => (
    <View style={styles.compactTrainerCard}>
      <View style={styles.trainerCardContent}>
        <View style={styles.trainerTopRow}>
          <Image
            source={{
              uri:
                trainer.profile_image ||
                "https://images.unsplash.com/photo-1581009146145-b5ef050c2e1e?w=150&h=150&fit=crop&crop=face",
            }}
            style={styles.compactTrainerImage}
          />
          <View style={styles.compactTrainerInfo}>
            <Text style={styles.compactTrainerName}>{trainer.full_name}</Text>
            <Text style={styles.compactTrainerExp}>
              Exp: {trainer.experience}
            </Text>
            <View style={styles.compactAvailabilityRow}>
              <Ionicons name="time-outline" size={14} color="#666" />
              <Text style={styles.compactAvailabilityText}>
                {formatWorkTimings(trainer.work_timings)}
              </Text>
            </View>
          </View>
        </View>

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.specialtiesScrollView}
          contentContainerStyle={styles.specialtiesScrollContent}
        >
          {trainer.specializations &&
            Array.isArray(trainer.specializations) &&
            trainer.specializations.map((specialty, index) => (
              <View key={index} style={styles.compactSpecialtyTag}>
                <Text style={styles.compactSpecialtyText}>{specialty}</Text>
              </View>
            ))}
        </ScrollView>
      </View>
    </View>
  );

  const PlanCard = ({ plan }) => (
    <View style={[styles.compactPlanCard]}>
      <View style={styles.cardContent}>
        <View style={styles.topRow}>
          <View style={styles.planDetails}>
            <Text style={styles.compactPlanName}>{plan.plan_name}</Text>
            <View style={styles.compactDurationBadge}>
              <Text style={[styles.durationText, { color: "#1976d2" }]}>
                {plan.duration} {plan.duration === 1 ? "Month" : "Months"}
              </Text>
            </View>
          </View>
          <View style={styles.compactPriceBox}>
            <Text style={styles.compactPrice}>₹{plan.amount}</Text>
          </View>
        </View>

        {plan.description && (
          <Text style={styles.planDescription}>{plan.description}</Text>
        )}

        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.servicesScrollView}
          contentContainerStyle={styles.servicesScrollContent}
        >
          {plan.services &&
            Array.isArray(plan.services) &&
            plan.services.map((service, index) => (
              <View
                key={index}
                style={[
                  styles.compactServiceTag,
                  {
                    borderColor: "#ddd",
                  },
                ]}
              >
                <Text style={[styles.compactServiceText, { color: "#1976d2" }]}>
                  {service}
                </Text>
              </View>
            ))}
        </ScrollView>
      </View>
    </View>
  );

  const renderTrainers = () => (
    <FlatList
      data={trainers}
      renderItem={({ item }) => <TrainerCard trainer={item} />}
      keyExtractor={(item) => item.profile_id.toString()}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContainer}
    />
  );

  const renderPlans = () => (
    <FlatList
      data={plans}
      renderItem={({ item }) => <PlanCard plan={item} />}
      keyExtractor={(item) => item.plan_id.toString()}
      showsVerticalScrollIndicator={false}
      contentContainerStyle={styles.listContainer}
    />
  );

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <TouchableOpacity
        style={[
          styles.backButtonContainer,
          { padding: width * 0.04, paddingTop: insets.top + 10 },
        ]}
        onPress={() => {
          router.push("/client/home");
        }}
      >
        <Ionicons name="arrow-back" size={20} color="#000" />
        <Text style={styles.backButtonText}>Personal Training</Text>
      </TouchableOpacity>

      {/* <TabHeader tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} /> */}

      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "view_trainers" && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab("view_trainers")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "view_trainers" && styles.activeTabText,
            ]}
          >
            Personal Trainers
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.tabButton,
            activeTab === "view_plans" && styles.activeTabButton,
          ]}
          onPress={() => setActiveTab("view_plans")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "view_plans" && styles.activeTabText,
            ]}
          >
            PT Plans
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.contentContainer}>
        {activeTab === "view_trainers" ? renderTrainers() : renderPlans()}
      </View>
    </View>
  );
};

export default PersonalTraining;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  backButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: "#e1e5e9",
    backgroundColor: "#fff",
  },
  backButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000",
  },
  contentContainer: {
    flex: 1,
    backgroundColor: "#f8f9fa",
  },
  listContainer: {
    padding: width * 0.04,
    paddingBottom: 20,
  },

  // Compact Trainer Card Styles
  compactTrainerCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: "hidden",
  },
  trainerCardContent: {
    padding: 16,
  },
  trainerTopRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  compactTrainerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  compactTrainerInfo: {
    flex: 1,
  },
  compactTrainerName: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1a1a1a",
    marginBottom: 4,
    marginTop: 5,
  },
  compactTrainerExp: {
    fontSize: 12,
    color: "#7f8c8d",
    marginBottom: 6,
  },
  compactAvailabilityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  compactAvailabilityText: {
    fontSize: 11,
    color: "#666",
    fontWeight: "500",
  },
  specialtiesScrollView: {
    marginTop: 4,
  },
  specialtiesScrollContent: {
    paddingRight: 16,
  },
  compactSpecialtyTag: {
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "#ddd",
    marginRight: 8,
  },
  compactSpecialtyText: {
    fontSize: 10,
    color: "#1976d2",
    fontWeight: "600",
  },

  // Compact Modern Plan Card Styles
  compactPlanCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
    overflow: "hidden",
  },
  cardContent: {
    padding: 16,
  },
  topRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  planDetails: {
    flex: 1,
  },
  compactPlanName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B4B4B",
    marginBottom: 15,
  },
  compactDurationBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    borderColor: "#ddd",
    borderWidth: 1,
  },
  durationText: {
    fontSize: 11,
    fontWeight: "600",
  },
  compactPriceBox: {
    alignItems: "flex-end",
  },
  compactPrice: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000000",
    lineHeight: 24,
  },
  planDescription: {
    fontSize: 12,
    color: "#666",
    marginBottom: 8,
    lineHeight: 16,
  },
  servicesScrollView: {
    marginBottom: 4,
  },
  servicesScrollContent: {
    paddingRight: 16,
  },
  compactServiceTag: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    marginRight: 8,
  },
  compactServiceText: {
    fontSize: 10,
    fontWeight: "600",
    whiteSpace: "nowrap",
  },
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 10,
    marginTop: Platform.OS === "ios" ? 10 : 10,
    marginBottom: 10,
  },
  tabButton: {
    alignItems: "center",
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#ddd",
    width: "48%",
    borderRadius: 7,
  },
  activeTabButton: {
    borderColor: "#1976d2",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1976d2",
  },
  activeTabText: {
    color: "#1976d2",
    fontWeight: "600",
  },
});
