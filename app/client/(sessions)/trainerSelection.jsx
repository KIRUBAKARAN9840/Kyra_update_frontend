import {
  StyleSheet,
  Text,
  View,
  FlatList,
  TouchableOpacity,
  BackHandler,
  Image,
  ScrollView,
} from "react-native";
import React, { useEffect, useState } from "react";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router, useLocalSearchParams } from "expo-router";
import { useFocusEffect } from "@react-navigation/native";
import SessionCardsSkeleton from "../../../components/ui/loaders/sessionCardsSkeleton";
import { showToast } from "../../../utils/Toaster";
import { getAvailableTrainersAPI } from "../../../services/clientApi";
import { MaterialIcons } from "@expo/vector-icons";

const TrainerSelection = () => {
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const [trainers, setTrainers] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchTrainers = async () => {
    setLoading(true);
    try {
      const gymId = params.gymId;
      if (!gymId) {
        showToast({
          type: "error",
          title: "Gym ID is not available",
        });
        setLoading(false);
        return;
      }
      const response = await getAvailableTrainersAPI(gymId);

      if (response?.status === 200) {
        setTrainers(response?.data || []);
      } else {
        showToast({
          type: "error",
          title: "Error fetching Trainers",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error fetching Trainers",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrainers();
  }, []);

  const handleBack = () => {
    router.back();
  };

  useFocusEffect(
    React.useCallback(() => {
      const onBackPress = () => {
        handleBack();
        return true;
      };

      const subscription = BackHandler.addEventListener(
        "hardwareBackPress",
        onBackPress
      );

      return () => subscription.remove();
    }, [])
  );

  const handleTrainerPress = (trainer) => {
    // Navigate to pass selection with trainer info
    router.push({
      pathname: "/client/(sessions)/sessionPassSelection",
      params: {
        sessionId: params.sessionId,
        sessionName: params.sessionName,
        trainer_id: trainer.trainer_id,
        gymId: params.gymId,
        passPrice: params.passPrice,
        discountPrice: params.discountPrice,
        discount: params.discount,
        session_offer_eligible: params.session_offer_eligible || "false",
      },
    });
  };

  const renderTrainerCard = ({ item }) => {
    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleTrainerPress(item)}
      >
        {item?.profile_image ? (
          <Image
            source={{ uri: item.profile_image }}
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

        {item?.experience && (
          <View style={styles.experienceBadge}>
            <Text style={styles.experienceText}>
              {item.experience} Yrs Experience
            </Text>
          </View>
        )}

        <View style={styles.cardContent}>
          <Text style={styles.cardTitle} numberOfLines={1}>
            {item?.full_name || "Unknown"}
          </Text>

          <View style={styles.cardFooter}>
            <View style={styles.sessionButton}>
              <Text style={styles.sessionButtonText}>60 Minutes</Text>
            </View>
            <TouchableOpacity
              style={styles.bookButton}
              onPress={() => handleTrainerPress(item)}
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
        <Text style={{ fontSize: 16, fontWeight: 500 }}>Select Trainer</Text>
        <View style={styles.headerButton} />
      </View>

      <View style={styles.trainingFocusCard}>
        <Text style={styles.trainingFocusTitle}>Training Focus</Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.trainingFocusChipContainer}
        >
          {[
            "Strength",
            "Core",
            "CrossFit",
            "Cardio",
            "HIIT",
            "Functional",
          ].map((focus) => (
            <View key={focus} style={styles.trainingFocusChip}>
              <Text style={styles.trainingFocusChipText}>{focus}</Text>
            </View>
          ))}
        </ScrollView>
      </View>

      {loading ? (
        <SessionCardsSkeleton />
      ) : (
        <FlatList
          data={trainers}
          renderItem={renderTrainerCard}
          keyExtractor={(item) => item.trainer_id.toString()}
          numColumns={2}
          contentContainerStyle={styles.listContainer}
          columnWrapperStyle={styles.columnWrapper}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  );
};

export default TrainerSelection;

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
  experienceBadge: {
    position: "absolute",
    top: 110,
    right: 10,
    backgroundColor: "#FFF",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  experienceText: {
    fontSize: 10,
    fontWeight: "600",
    color: "#007AFF",
  },
  trainingFocusCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 12,
    marginHorizontal: 10,
    marginTop: 12,
    marginBottom: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 8,
  },
  trainingFocusTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#2C2C2C",
    marginBottom: 12,
  },
  trainingFocusChipContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingRight: 8,
  },
  trainingFocusChip: {
    backgroundColor: "#F3F4F6",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 6,
    marginRight: 4,
  },
  trainingFocusChipText: {
    fontSize: 12,
    color: "#2C2C2C",
  },
});
