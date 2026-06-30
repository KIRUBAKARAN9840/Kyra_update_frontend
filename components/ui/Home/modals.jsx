import React from "react";
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  TouchableWithoutFeedback,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export const FeeHistoryModal = ({ visible, onClose, feeHistory }) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <TouchableWithoutFeedback onPress={onClose}>
          <View style={{ flex: 1 }} />
        </TouchableWithoutFeedback>

        <View style={[styles.modalContent, { paddingBottom: insets.bottom }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Gym Fee History</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={20} color="#0E364E" />
            </TouchableOpacity>
          </View>
          {feeHistory.length === 0 ? (
            <View style={styles.noFeedContainer}>
              <MaterialCommunityIcons
                name="account-cash"
                size={80}
                color="#CBD5E0"
              />
              <Text style={styles.noFeedTitle}>No Fee History to Show</Text>
            </View>
          ) : (
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                padding: 20,
                marginBottom: 30,
              }}
            >
              {feeHistory?.map((fee, index) => (
                <View key={index} style={styles.feeCard}>
                  <View style={styles.feeDetails}>
                    <Text style={styles.feeAmount}>₹{fee.fees_paid}</Text>
                    <Text style={styles.feeDate}>
                      Paid on:{" "}
                      {new Date(fee.payment_date).toLocaleDateString("en-IN", {
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      })}
                    </Text>
                  </View>
                  <View style={styles.receiptIcon}>
                    <Ionicons name="receipt" size={24} color="#818181" />
                  </View>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

export const WorkoutModal = ({ visible, onClose, workoutPlan }) => {
  const daysOfWeek = Object.keys(workoutPlan || {});
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { paddingBottom: insets.bottom }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Workout Plan</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#FF5757" />
            </TouchableOpacity>
          </View>
          {daysOfWeek?.length === 0 ? (
            <View style={styles.noFeedContainer}>
              <MaterialCommunityIcons
                name="dumbbell"
                size={80}
                color="#CBD5E0"
              />
              <Text style={styles.noFeedTitle}>
                Workout Plan not yet assigned
              </Text>
            </View>
          ) : (
            <ScrollView style={styles.modalBody}>
              {daysOfWeek.map((day) => (
                <View key={day} style={styles.dayContainer}>
                  <Text style={styles.dayTitle}>{day}</Text>
                  {workoutPlan[day].map((exercise, index) => (
                    <View key={index} style={styles.exerciseCard}>
                      <Text style={styles.exerciseName}>{exercise.name}</Text>
                      <Text style={styles.muscleGroups}>
                        {exercise.muscleGroups.join(", ")}
                      </Text>
                      {exercise.sets.map((set, setIndex) => (
                        <Text key={setIndex} style={styles.setInfo}>
                          Set {setIndex + 1}: {set.reps} reps × {set.weight} kg
                        </Text>
                      ))}
                    </View>
                  ))}
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

export const DietModal = ({ visible, onClose, dietPlan }) => {
  const variants = Object.keys(dietPlan || {});
  const insets = useSafeAreaInsets();

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.modalContainer}>
        <View style={[styles.modalContent, { paddingBottom: insets.bottom }]}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Diet Plan</Text>
            <TouchableOpacity onPress={onClose}>
              <Ionicons name="close" size={24} color="#FF5757" />
            </TouchableOpacity>
          </View>

          {variants?.length === 0 ? (
            <View style={styles.noFeedContainer}>
              <MaterialCommunityIcons name="food" size={80} color="#CBD5E0" />
              <Text style={styles.noFeedTitle}>Diet Plan not yet assigned</Text>
            </View>
          ) : (
            <ScrollView style={styles.modalBody}>
              {variants.map((variant) => {
                const meals = dietPlan[variant];
                if (Object.keys(meals).length === 0) return null;

                return (
                  <View key={variant} style={styles.variantContainer}>
                    <Text style={styles.variantTitle}>{variant}</Text>
                    {Object.entries(meals).map(([mealTime, mealItems]) => (
                      <View key={mealTime} style={styles.mealContainer}>
                        <Text style={styles.mealTime}>
                          {mealTime?.toLocaleUpperCase()}
                        </Text>
                        {mealItems.map((item, index) => (
                          <View key={index} style={styles.mealCard}>
                            <Text style={styles.mealName}>{item.name}</Text>
                            <View style={styles.nutritionInfo}>
                              <Text style={styles.nutritionItem}>
                                Calories: {item?.calories}
                              </Text>
                              <Text style={styles.nutritionItem}>
                                Proteins: {item?.proteins}g
                              </Text>
                              <Text style={styles.nutritionItem}>
                                Carbs: {item?.carbs}g
                              </Text>
                              <Text style={styles.nutritionItem}>
                                Fats: {item?.fats}g
                              </Text>
                              <Text style={styles.nutritionItem}>
                                Fiber: {item?.fiber || 0}g
                              </Text>
                              <Text style={styles.nutritionItem}>
                                Sugar: {item?.sugar || 0}g
                              </Text>
                            </View>
                          </View>
                        ))}
                      </View>
                    ))}
                  </View>
                );
              })}
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
};

export const Modals = {
  FeeHistoryModal,
  WorkoutModal,
  DietModal,
};

// Styles
const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  modalContent: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: "80%",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#EEE",
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#4E4E4E",
  },
  modalBody: {
    padding: 20,
    marginBottom: 30,
  },
  dayContainer: {
    marginBottom: 20,
  },
  dayTitle: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  exerciseCard: {
    backgroundColor: "#F8F8F8",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  exerciseName: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#0E364E",
  },
  muscleGroups: {
    color: "#666",
    fontSize: 14,
    marginVertical: 5,
  },
  setInfo: {
    color: "#333",
    fontSize: 14,
    marginTop: 3,
  },
  variantContainer: {
    marginBottom: 20,
  },
  variantTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 10,
  },
  mealContainer: {
    marginBottom: 15,
  },
  mealTime: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#FF5757",
    marginBottom: 8,
  },
  mealCard: {
    backgroundColor: "#F8F8F8",
    padding: 15,
    borderRadius: 10,
    marginBottom: 8,
  },
  mealName: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#333",
    marginBottom: 5,
  },
  nutritionInfo: {
    flexDirection: "row",
    flexWrap: "wrap",
  },
  nutritionItem: {
    fontSize: 14,
    color: "#666",
    marginRight: 10,
    marginTop: 5,
  },
  feeCard: {
    backgroundColor: "#F3F3F3",
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  feeDetails: {
    flex: 1,
  },
  feeAmount: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#636363",
    marginBottom: 5,
  },
  feeDate: {
    fontSize: 10,
    color: "rgba(59,59,59,0.6)",
  },
  receiptIcon: {
    marginLeft: 15,
  },
  noFeedContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  noFeedTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#4A5568",
    marginTop: 16,
    marginBottom: 8,
  },
  noFeedSubtitle: {
    fontSize: 16,
    color: "#718096",
    textAlign: "center",
    marginBottom: 24,
    maxWidth: 250,
  },
  noFeedRefreshButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#4299E1",
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  noFeedButtonText: {
    color: "#FFFFFF",
    fontWeight: "600",
    marginLeft: 8,
  },
});

export default Modals;
