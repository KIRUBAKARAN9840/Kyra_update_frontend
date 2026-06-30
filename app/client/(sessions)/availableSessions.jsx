import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  BackHandler,
  Image,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import NewOwnerHeader from "../../../components/ui/Header/NewOwnerHeader";
import SessionCardsSkeleton from "../../../components/ui/loaders/sessionCardsSkeleton";
import { showToast } from "../../../utils/Toaster";
import { getAvailableSessionsAPI } from "../../../services/clientApi";
import { MaterialIcons } from "@expo/vector-icons";
import axiosInstance from "../../../services/axiosInstance";

const AvailableSessions = () => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSessionOfferEligible, setIsSessionOfferEligible] = useState(false);

  const gymId = params.gymId ? parseInt(params.gymId) : null;

  // Check session offer eligibility on mount
  useEffect(() => {
    const checkEligibility = async () => {
      if (!gymId) return;

      try {
        const response = await axiosInstance.post("/offer_eligibility/check", {
          gym_id: gymId,
          mode: "session",
        });

        setIsSessionOfferEligible(response.data.is_eligible === true);
      } catch (error) {
        console.error("[AVAILABLE_SESSIONS] Eligibility check failed:", error);
        // On error, default to not eligible (safer)
        setIsSessionOfferEligible(false);
      }
    };

    checkEligibility();
  }, [gymId]);

  const fetchAllSessions = async () => {
    setLoading(true);
    try {
      if (!gymId) {
        showToast({
          type: "error",
          title: "Gym ID is not available",
        });
        setLoading(false);
        return;
      }
      const response = await getAvailableSessionsAPI(gymId);

      if (response?.status === 200) {
        // const activeSessions = response.data?.filter(
        //   (session) => session.isActive === true
        // );

        setSessions(response?.data || []);
      } else {
        showToast({
          type: "error",
          title: "Error fetching Sessions",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error fetching Sessions",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAllSessions();
  }, []);

  const handleBack = () => {
    router.push({
      pathname: "/client/gymdetails",
      params: {
        gym_id: params.gymId,
        passPrice: params.passPrice,
        discountPrice: params.discountPrice,
        discount: params.discount,
      },
    });
  };

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        handleBack();
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress,
      );

      return () => subscription.remove();
    }, [params.gymId, params.passPrice, params.discountPrice, params.discount]),
  );

  const handleCardPress = (item) => {
    // Navigate to trainer selection for Personal Trainer (assuming id === 2)
    if (item.id === 2) {
      router.push({
        pathname: "/client/(sessions)/trainerSelection",
        params: {
          sessionId: item.id,
          sessionName: item.name,
          gymId: params.gymId,
          passPrice: params.passPrice,
          discountPrice: params.discountPrice,
          discount: params.discount,
          session_offer_eligible: isSessionOfferEligible ? "true" : "false",
        },
      });
      return;
    }

    // Skip pass selection for Daily Pass (assuming id === 1)
    if (item.id === 1) {
      // Navigate directly to booking or other logic for Daily Pass
      return;
    }

    // For all other sessions, navigate to pass selection screen
    // DEBUG: Log what we're passing

    router.push({
      pathname: "/client/(sessions)/sessionPassSelection",
      params: {
        sessionId: item.id,
        sessionName: item.name,
        trainer_id: null,
        gymId: params.gymId,
        passPrice: params.passPrice,
        discountPrice: params.discountPrice,
        discount: params.discount,
        session_offer_eligible: isSessionOfferEligible ? "true" : "false",
      },
    });
  };

  const renderSessionCard = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleCardPress(item)}
      >
        {item?.image ? (
          <Image
            source={{ uri: item.image }}
            style={styles.cardImage}
            resizeMode="cover"
          />
        ) : (
          <View
            style={[
              styles.cardImage,
              {
                backgroundColor: "#E1E9EE",
                justifyContent: "center",
                alignItems: "center",
              },
            ]}
          >
            <Text style={{ color: "#999" }}>No Image</Text>
          </View>
        )}

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item?.name || "Unknown"}
          </Text>

          <View style={styles.cardFooter}>
            <View style={styles.sessionButton}>
              <Text style={styles.sessionButtonText}>60 Minutes</Text>
            </View>
            <TouchableOpacity
              style={styles.bookButton}
              onPress={() => handleCardPress(item)}
            >
              <Text style={styles.bookButtonText}>Book Now</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom + 5 }]}>
      <View style={[styles.header, { paddingTop: insets.top }]}>
        <TouchableOpacity onPress={handleBack} style={styles.headerButton}>
          <MaterialIcons name="arrow-back" size={22} color="#333" />
        </TouchableOpacity>
        <Text style={{ fontSize: 16, fontWeight: 500 }}>
          Explore Classes & Session
        </Text>
        <View style={styles.headerButton} />
      </View>

      {loading ? (
        <SessionCardsSkeleton />
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderSessionCard}
          keyExtractor={(item) => item.id.toString()}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            params.gymName && (
              <View style={styles.gymNameSection}>
                <View style={styles.gymNameCard}>
                  <Text style={styles.gymNameText} numberOfLines={2}>
                    {params.gymName}
                  </Text>
                </View>
              </View>
            )
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <MaterialIcons name="event-busy" size={60} color="#DDD" />
              <Text style={styles.emptyText}>No sessions Set for the Gym</Text>
            </View>
          }
        />
      )}
    </View>
  );
};

export default AvailableSessions;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 0,
    paddingBottom: 10,
    backgroundColor: "#FFF",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  headerButton: {
    width: 60,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderRadius: 20,
    // backgroundColor: "#F5F5F5",
  },
  gymNameSection: {
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 16,
  },
  gymNameCard: {
    backgroundColor: "#FFF",
    borderRadius: 12,
    paddingVertical: 8,
    paddingHorizontal: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: "#F0F0F0",
  },
  gymNameText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
    flex: 1,
  },
  listContainer: {
    padding: 10,
    paddingBottom: 100,
    marginTop: 10,
  },
  columnWrapper: {
    justifyContent: "space-between",
    marginBottom: 16,
  },
  card: {
    width: "47%",
    backgroundColor: "#FFF",
    borderRadius: 16,
    marginHorizontal: 6,
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: "visible",
    position: "relative",
  },
  cardImage: {
    width: "100%",
    height: 140,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
  },
  cardContent: {
    padding: 12,
  },
  cardTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#333",
    marginBottom: 8,
  },
  cardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  sessionButton: {
    backgroundColor: "#FFF",
    paddingVertical: 6,
    paddingHorizontal: 0,
  },
  sessionButtonText: {
    fontSize: 10,
    color: "#007AFF",
    fontWeight: "600",
  },
  bookButton: {
    backgroundColor: "#FF3B30",
    paddingVertical: 3,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  bookButtonText: {
    fontSize: 12,
    color: "#FFF",
    fontWeight: "600",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 60,
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 16,
    color: "#666",
    textAlign: "center",
    marginTop: 16,
    fontWeight: "500",
  },
});
