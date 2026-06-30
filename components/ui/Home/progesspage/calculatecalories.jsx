import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  Modal,
  TextInput,
  ActivityIndicator,
  Dimensions,
  TouchableWithoutFeedback,
  Keyboard,
  Alert,
  Platform,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import CustomPicker from "../../CustomPicker";
import { ScrollView } from "react-native";
import MaskedView from "@react-native-masked-view/masked-view";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  caloriesCalculateAPI,
  ClientCaloriesAPI,
  ClientWeightUpdateNewAPI,
} from "../../../../services/clientApi";
import { showToast } from "../../../../utils/Toaster";

const { width, height } = Dimensions.get("window");

const ActivityLevelCard = ({
  title,
  description,
  value,
  isSelected,
  onPress,
}) => {
  return (
    <TouchableOpacity
      style={[styles.activityCard, isSelected && styles.activityCardSelected]}
      onPress={() => onPress(value)}
    >
      <LinearGradient
        colors={isSelected ? ["#FF5757", "#FFA6A6"] : ["#f8f9fa", "#ffffff"]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.activityCardGradient}
      >
        <View style={styles.activityCardContent}>
          <Text
            style={[
              styles.activityCardTitle,
              isSelected && styles.activityCardTitleSelected,
            ]}
          >
            {title}
          </Text>
          <Text
            style={[
              styles.activityCardDescription,
              isSelected && styles.activityCardDescriptionSelected,
            ]}
          >
            {description}
          </Text>
        </View>
        {isSelected && (
          <View style={styles.checkmarkContainer}>
            <Ionicons name="checkmark-circle" size={20} color="#ffffff" />
          </View>
        )}
      </LinearGradient>
    </TouchableOpacity>
  );
};

const CalorieCalculatorModal = ({
  visible,
  onClose,
  calculateCalories,
  saveTrackingData,
  calculate,
  getHomeData,
}) => {
  const [isCalculated, setIsCalculated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isActivityDropdownExpanded, setIsActivityDropdownExpanded] =
    useState(false);
  const [targets, setTargets] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fiber: 0,
    sugar: 0,
  });
  const [boxValues, setBoxValues] = useState({
    actual_weight: calculate?.actual_weight,
    height: calculate?.height,
    age: calculate?.age,
    lifestyle: calculate?.lifestyle,
    goals: calculate?.goals,
    start_weight: "",
    target_weight: "",
  });

  const activityLevels = [
    {
      value: "sedentary",
      title: "Sedentary",
      description: "Minimal physical activity, desk job",
    },
    {
      value: "lightly_active",
      title: "Lightly Active",
      description:
        "Some light daily activity but no regular structured exercise",
    },
    {
      value: "moderately_active",
      title: "Moderately Active",
      description:
        "Regular daily activity, includes walking or light exercise ",
    },
    {
      value: "very_active",
      title: "Very Active",
      description: "High daily activity, includes intense workouts ",
    },
    {
      value: "super_active",
      title: "Super Active",
      description: "Focused on health, consistent exercise and diet",
    },
  ];

  const getSelectedActivityLevel = () => {
    return (
      activityLevels.find((level) => level.value === boxValues.lifestyle) || {
        value: "",
        title: "Select Activity Level",
        description: "",
      }
    );
  };

  const handleCalculateCalories = async () => {
    setIsLoading(true);
    try {
      const gymId = await AsyncStorage.getItem("gym_id");
      const clientId = await AsyncStorage.getItem("client_id");
      if (!clientId) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Something went wrong. Please try again later",
        });
        return;
      }
      const payload = {
        gym_id: gymId ? gymId : null,
        client_id: clientId,
        height: boxValues.height,
        weight: boxValues.actual_weight,
        age: boxValues.age,
        goals: boxValues.goals,
        lifestyle: boxValues.lifestyle,
      };

      const response = await caloriesCalculateAPI(payload);

      if (response?.status === 200) {
        setTargets({
          calories: response?.data?.calories || "",
          protein: response?.data?.protein || "",
          carbs: response?.data?.carbs || "",
          fat: response?.data?.fat || "",
          fiber: response?.data?.fiber || 0,
          sugar: response?.data?.sugar || 0,
        });
        setIsCalculated(true);
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc:
            response?.detail || "Something went wrong. Please try again later",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSaveTargets = async () => {
    try {
      showToast({
        type: "success",
        title: "Success",
        desc: "Caloris targets saved Successfully",
      });
      setIsCalculated(false);
      getHomeData();
      onClose();
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    }
  };

  const renderCalculateCaloriesStep = () => (
    <View style={styles.stepContainer}>
      {isCalculated ? (
        <View style={styles.calculatedResultsContainer}>
          <MaskedView
            maskElement={<Text style={styles.title}>Calculated Results</Text>}
          >
            <LinearGradient
              colors={["#FF5757", "#FFA6A6"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={{ height: 30, justifyContent: "center" }}
            >
              <Text style={[styles.title, { opacity: 0 }]}>
                Calculated Results
              </Text>
            </LinearGradient>
          </MaskedView>
          <View style={styles.resultsGrid}>
            <View style={styles.resultItem}>
              <Image
                source={require("../../../../assets/images/calories.png")}
                style={styles.calorieImages}
              />
              <Text style={styles.resultText}>{targets.calories} kcal</Text>
              <Text style={styles.resultLabel}>Calories</Text>
            </View>

            <View style={styles.resultItem}>
              <Image
                source={require("../../../../assets/images/PROTEIN.png")}
                style={styles.proteinImages}
              />
              <Text style={styles.resultText}>{targets.protein} g</Text>
              <Text style={styles.resultLabel}>Protein</Text>
            </View>

            <View style={styles.resultItem}>
              <Image
                source={require("../../../../assets/images/CARBS.png")}
                style={styles.macroImages}
              />
              <Text style={styles.resultText}>{targets.carbs} g</Text>
              <Text style={styles.resultLabel}>Carbs</Text>
            </View>

            <View style={styles.resultItem}>
              <Image
                source={require("../../../../assets/images/FAT.png")}
                style={styles.fatImages}
              />
              <Text style={styles.resultText}>{targets.fat} g</Text>
              <Text style={styles.resultLabel}>Fat</Text>
            </View>
            <View style={styles.resultItem}>
              <Image
                source={require("../../../../assets/images/diet/fiber.png")}
                style={styles.fiberImages}
              />
              <Text style={styles.resultText}>{targets.fiber} g</Text>
              <Text style={styles.resultLabel}>Fiber</Text>
            </View>
            <View style={styles.resultItem}>
              <Image
                source={require("../../../../assets/images/diet/sugar.png")}
                style={styles.sugarImages}
              />
              <Text style={styles.resultText}>{targets.sugar} g</Text>
              <Text style={styles.resultLabel}>Sugar</Text>
            </View>
          </View>

          <View style={styles.buttonsRow}>
            <TouchableOpacity
              style={styles.adjustButton}
              onPress={() => {
                setIsCalculated(false);
              }}
            >
              <Text style={styles.adjustButtonText}>Adjust</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleSaveTargets}
            >
              <LinearGradient
                colors={["#FF5757", "#FFA6A6"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.continueButtonGradient}
              >
                <Text style={styles.continueButtonText}>Save & Close</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <>
          <ScrollView keyboardShouldPersistTaps="handled">
            <View style={styles.stepTitle}>
              <MaskedView
                maskElement={
                  <Text
                    style={[
                      styles.stepTitleText,
                      { backgroundColor: "transparent" },
                    ]}
                  >
                    Calculate Your Target Calories
                  </Text>
                }
              >
                <LinearGradient
                  colors={["#FF5757", "#FF5757"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={{ height: 20, justifyContent: "center" }}
                >
                  <Text style={[styles.stepTitleText, { opacity: 0 }]}>
                    Calculate Your Target Calories
                  </Text>
                </LinearGradient>
              </MaskedView>
            </View>

            <View style={styles.compactForm}>
              <View style={styles.row}>
                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>Weight (kg)*</Text>
                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={String(boxValues.actual_weight)}
                    onChangeText={(text) =>
                      setBoxValues({ ...boxValues, actual_weight: text })
                    }
                    placeholder="Enter weight"
                    placeholderTextColor="rgba(0, 0, 0, 0.3)"
                    returnKeyType="next"
                  />
                </View>
                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>Height (cm)*</Text>

                  <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={String(boxValues.height)}
                    onChangeText={(text) =>
                      setBoxValues({ ...boxValues, height: text })
                    }
                    placeholder="Enter height"
                    placeholderTextColor="rgba(0, 0, 0, 0.3)"
                    returnKeyType="next"
                  />
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Age*</Text>

                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={String(boxValues.age)}
                  onChangeText={(text) =>
                    setBoxValues({ ...boxValues, age: text })
                  }
                  placeholder="Enter age"
                  placeholderTextColor="rgba(0, 0, 0, 0.3)"
                  returnKeyType="next"
                />
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Activity Level*</Text>
                <TouchableOpacity
                  style={styles.activityDropdownHeader}
                  onPress={() =>
                    setIsActivityDropdownExpanded(!isActivityDropdownExpanded)
                  }
                >
                  <LinearGradient
                    colors={["#FFFFFF", "#FFFFFF"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.activityDropdownGradient}
                  >
                    <View style={styles.activityDropdownContent}>
                      <View style={styles.selectedActivityInfo}>
                        <Text style={styles.selectedActivityTitle}>
                          {getSelectedActivityLevel().title}
                        </Text>
                        {getSelectedActivityLevel().description && (
                          <Text style={styles.selectedActivityDescription}>
                            {getSelectedActivityLevel().description}
                          </Text>
                        )}
                      </View>
                      <Ionicons
                        name={
                          isActivityDropdownExpanded
                            ? "chevron-up"
                            : "chevron-down"
                        }
                        size={20}
                        color="#666666"
                      />
                    </View>
                  </LinearGradient>
                </TouchableOpacity>

                {isActivityDropdownExpanded && (
                  <View style={styles.activityCardsContainer}>
                    {activityLevels.map((level) => (
                      <ActivityLevelCard
                        key={level.value}
                        title={level.title}
                        description={level.description}
                        value={level.value}
                        isSelected={boxValues.lifestyle === level.value}
                        onPress={(value) => {
                          setBoxValues({ ...boxValues, lifestyle: value });
                          setIsActivityDropdownExpanded(false);
                        }}
                      />
                    ))}
                  </View>
                )}
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Goal*</Text>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                  <View style={styles.pickerContainer}>
                    <CustomPicker
                      value={boxValues.goals}
                      onValueChange={(value) =>
                        setBoxValues({ ...boxValues, goals: value })
                      }
                      placeholder="Select your goal"
                      items={[
                        { label: "Weight Loss", value: "weight_loss" },
                        { label: "Weight Gain", value: "weight_gain" },
                        { label: "Maintain", value: "maintain" },
                      ]}
                    />
                  </View>
                </TouchableWithoutFeedback>
              </View>
            </View>

            <TouchableOpacity
              disabled={
                boxValues.actual_weight === "" ||
                boxValues.height === "" ||
                boxValues.age === "" ||
                boxValues.goals === "" ||
                boxValues.lifestyle === ""
              }
              onPress={handleCalculateCalories}
            >
              <LinearGradient
                colors={
                  boxValues.actual_weight === "" ||
                  boxValues.height === "" ||
                  boxValues.age === "" ||
                  boxValues.goals === "" ||
                  boxValues.lifestyle === ""
                    ? ["#d3d3d3", "#a9a9a9"]
                    : ["#FF5757", "#FFA6A6"]
                }
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={[
                  styles.calculateButton,
                  (boxValues.actual_weight === "" ||
                    boxValues.height === "" ||
                    boxValues.age === "" ||
                    boxValues.goals === "" ||
                    boxValues.lifestyle === "") &&
                    styles.buttonDisabled,
                ]}
              >
                {isLoading ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.calculateButtonText}>Calculate</Text>
                )}
              </LinearGradient>
            </TouchableOpacity>
          </ScrollView>
        </>
      )}
    </View>
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={() => {
        setIsCalculated(false);
        onClose();
      }}
    >
      <TouchableWithoutFeedback
        onPress={() => {
          setIsCalculated(false);
          onClose();
        }}
      >
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={() => {}}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={() => {
                  setIsCalculated(false);
                  onClose();
                }}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>
              {renderCalculateCaloriesStep()}
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const ManualCalorieModal = ({
  visible,
  onClose,
  saveTrackingData,
  target,
  getHomeData,
  calculate,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [manualTargets, setManualTargets] = useState({
    calories: target?.calories || "",
    protein: target?.protein || "",
    carbs: target?.carbs || "",
    fat: target?.fat || "",
    fiber: target?.fiber || 0,
    sugar: target?.sugar || 0,
  });

  useEffect(() => {
    if (visible) {
      setManualTargets({
        calories: target?.calories || "",
        protein: target?.protein || "",
        carbs: target?.carbs || "",
        fat: target?.fat || "",
        fiber: target?.fiber || 0,
        sugar: target?.sugar || 0,
      });
    }
  }, [visible]);

  const handleSaveTargets = async () => {
    setIsLoading(true);
    try {
      const clientId = await AsyncStorage.getItem("client_id");

      if (!clientId) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Something went wrong. Please try again later",
        });
        return;
      }
      const payload = {
        client_id: clientId,

        calories: manualTargets?.calories ? manualTargets?.calories : null,
        protein: manualTargets?.protein ? manualTargets?.protein : null,
        carbs: manualTargets?.carbs ? manualTargets?.carbs : null,
        fat: manualTargets?.fat ? manualTargets?.fat : null,
        fiber: manualTargets?.fiber ? manualTargets?.fiber : 0,
        sugar: manualTargets?.sugar ? manualTargets?.sugar : 0,
      };

      const response = await ClientCaloriesAPI(payload);

      if (response?.status === 200) {
        await getHomeData();
        onClose();
        showToast({
          type: "success",
          title: "Success",
          desc: "Target Macros Set Successfully",
        });
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc:
            response?.detail || "Something went wrong. Please try again later",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isAnyFieldEmpty = () => {
    return (
      manualTargets.calories === "" ||
      manualTargets.protein === "" ||
      manualTargets.carbs === "" ||
      manualTargets.fat === ""
    );
  };

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.modalOverlay}>
          <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
            <View style={styles.modalContent}>
              <TouchableOpacity
                style={styles.closeModalButton}
                onPress={onClose}
              >
                <Ionicons name="close" size={24} color="#333" />
              </TouchableOpacity>

              <View style={styles.stepContainer}>
                <MaskedView
                  maskElement={
                    <Text style={styles.stepTitleText}>
                      Set Your Daily Calorie & Macro Targets
                    </Text>
                  }
                >
                  <LinearGradient
                    colors={["#000000", "#000000"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={{ height: 30, justifyContent: "center" }}
                  >
                    <Text style={[styles.stepTitleText, { opacity: 0 }]}>
                      Set Your Daily Calorie & Macro Targets
                    </Text>
                  </LinearGradient>
                </MaskedView>

                <View style={styles.compactForm}>
                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>
                      Target Calories (kcal)*
                    </Text>
                    <LinearGradient
                      colors={["#ffa6a639", "#ffa6a639"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.radius}
                    >
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={manualTargets.calories?.toString()}
                        onChangeText={(text) =>
                          setManualTargets({ ...manualTargets, calories: text })
                        }
                        placeholder="Enter target calories"
                        placeholderTextColor="rgba(0, 0, 0, 0.3)"
                      />
                    </LinearGradient>
                  </View>

                  <View style={styles.row}>
                    <View style={[styles.inputContainer, styles.halfWidth]}>
                      <Text style={styles.inputLabel}>Target Protein (g)*</Text>
                      <LinearGradient
                        colors={["#ffa6a639", "#ffa6a639"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.radius}
                      >
                        <TextInput
                          style={styles.input}
                          keyboardType="numeric"
                          value={manualTargets.protein?.toString()}
                          onChangeText={(text) =>
                            setManualTargets({
                              ...manualTargets,
                              protein: text,
                            })
                          }
                          placeholder="Enter protein"
                          placeholderTextColor="rgba(0, 0, 0, 0.3)"
                        />
                      </LinearGradient>
                    </View>

                    <View style={[styles.inputContainer, styles.halfWidth]}>
                      <Text style={styles.inputLabel}>Target Carbs (g)*</Text>
                      <LinearGradient
                        colors={["#ffa6a639", "#ffa6a639"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.radius}
                      >
                        <TextInput
                          style={styles.input}
                          keyboardType="numeric"
                          value={manualTargets.carbs?.toString()}
                          onChangeText={(text) =>
                            setManualTargets({ ...manualTargets, carbs: text })
                          }
                          placeholder="Enter carbs"
                          placeholderTextColor="rgba(0, 0, 0, 0.3)"
                        />
                      </LinearGradient>
                    </View>
                  </View>

                  <View style={styles.inputContainer}>
                    <Text style={styles.inputLabel}>Target Fat (g)*</Text>
                    <LinearGradient
                      colors={["#ffa6a639", "#ffa6a639"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.radius}
                    >
                      <TextInput
                        style={styles.input}
                        keyboardType="numeric"
                        value={manualTargets.fat?.toString()}
                        onChangeText={(text) =>
                          setManualTargets({ ...manualTargets, fat: text })
                        }
                        placeholder="Enter fat"
                        placeholderTextColor="rgba(0, 0, 0, 0.3)"
                      />
                    </LinearGradient>
                  </View>
                  <TouchableOpacity
                    disabled={isAnyFieldEmpty()}
                    onPress={handleSaveTargets}
                  >
                    <LinearGradient
                      colors={
                        isAnyFieldEmpty()
                          ? ["#d3d3d3", "#a9a9a9"]
                          : ["#28A745", "#007BFF"]
                      }
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.calculateButton}
                    >
                      {isLoading ? (
                        <ActivityIndicator color="#FFF" />
                      ) : (
                        <Text style={styles.calculateButtonText}>
                          Set Targets
                        </Text>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const CalorieCardsComponent = ({ calculate, target, getHomeData, gender }) => {
  const [calculatorModalVisible, setCalculatorModalVisible] = useState(false);
  const [manualModalVisible, setManualModalVisible] = useState(false);

  const calculateCalories = async () => {};

  const saveTrackingData = async (type, data) => {};

  return (
    <View style={styles.container}>
      <CalorieCalculatorModal
        visible={calculatorModalVisible}
        onClose={() => {
          setCalculatorModalVisible(false);
        }}
        calculateCalories={calculateCalories}
        saveTrackingData={saveTrackingData}
        calculate={calculate}
        getHomeData={getHomeData}
      />

      <ManualCalorieModal
        visible={manualModalVisible}
        onClose={() => setManualModalVisible(false)}
        saveTrackingData={saveTrackingData}
        target={target}
        getHomeData={getHomeData}
        calculate={calculate}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    padding: 10,
    flexWrap: "wrap",
  },
  card: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: "49%",
    height: 150,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    overflow: "hidden",
    borderWidth: 0.5,
    borderColor: "#E0E0E0",
  },
  contentContainer: {
    flex: 1,
    padding: 15,
    paddingBottom: 0,
    flexDirection: "column",
    position: "relative",
  },
  mainContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    flex: 1,
  },
  leftContent: {
    width: "50%",
    flexDirection: "column",
    justifyContent: "space-between",
    height: "100%",
  },
  subtitleContainer: {
    flex: 1,
    justifyContent: "flex-start",
  },
  rightContent: {
    width: "50%",
    justifyContent: "flex-end",
    alignItems: "flex-end",
    position: "relative",
    height: "100%",
  },
  title: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#333333",
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 10,
    color: "#AAAAAA",
  },
  buttonContainer: {
    margin: "auto",
    // marginBottom: 10,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 5,
    borderRadius: 8,
    width: "90%",
    minWidth: 60,
    borderWidth: 1,
    borderColor: "#ddd",
  },
  buttonText: {
    color: "#1A1A1A",
    fontSize: 10,
    fontWeight: "bold",
    // marginRight: 5,
  },
  image: {
    width: "130%",
    height: 110,
    position: "absolute",
    bottom: -12,
    right: -18,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalView: {
    margin: 20,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 35,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    width: "80%",
  },
  modalText: {
    marginBottom: 15,
    textAlign: "center",
    fontSize: 16,
  },
  closeButton: {
    backgroundColor: "#2196F3",
    borderRadius: 20,
    padding: 10,
    elevation: 2,
    marginTop: 15,
    width: 100,
    alignItems: "center",
  },
  closeButtonText: {
    color: "white",
    fontWeight: "bold",
    textAlign: "center",
  },

  // CalorieCalculatorModal styles
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: width * 0.9,
    maxHeight: height * 0.7,
    paddingHorizontal: 16,
    paddingVertical: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    position: "relative",
  },
  closeModalButton: {
    position: "absolute",
    right: 10,
    top: 10,
    zIndex: 1,
    padding: 5,
  },
  stepContainer: {
    marginTop: 5,
  },
  stepTitle: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  stepTitleText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#000000",
  },
  compactForm: {
    marginBottom: 12,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 0,
  },
  halfWidth: {
    width: "48%",
  },
  inputContainer: {
    marginBottom: 10,
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "500",
    color: "#000000",
    marginBottom: 7,
  },
  input: {
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#ffa6a639",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 14,
  },
  radius: {
    borderRadius: 8,
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ffa6a639",
    borderRadius: 8,
    height: 38,
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "#FFFFFF",
  },

  calculatedResultsContainer: {
    padding: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  resultsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  resultItem: {
    width: "48%",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    marginBottom: 8,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  resultText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginTop: 4,
  },
  resultLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 2,
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  adjustButton: {
    flex: 1,
    backgroundColor: "#f0f0f0",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginRight: 8,
  },
  adjustButtonText: {
    color: "#555",
    fontWeight: "600",
    fontSize: 14,
  },

  continueButton: {
    flex: 1.5,
  },
  continueButtonGradient: {
    backgroundColor: "#FF5757",
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: "center",
    marginLeft: 8,
  },
  continueButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 14,
  },
  calculateButton: {
    backgroundColor: "#FF5757",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 5,
  },
  calculateButtonText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 16,
  },
  buttonDisabled: {
    backgroundColor: "#ddd",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
    marginTop: 5,
  },
  macroImages: {
    width: 25,
    height: 20,
  },
  fatImages: {
    width: 18,
    height: 22,
  },
  fiberImages: {
    width: 20,
    height: 20,
  },
  sugarImages: {
    width: 20,
    height: 20,
  },
  proteinImages: {
    width: 20,
    height: 20,
  },
  calorieImages: {
    width: 16,
    height: 22,
  },

  // Activity Level Card Styles
  activityDropdownHeader: {
    marginBottom: 8,
  },
  activityDropdownGradient: {
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ffa6a639",
  },
  activityDropdownContent: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  selectedActivityInfo: {
    flex: 1,
    marginRight: 12,
  },
  selectedActivityTitle: {
    fontSize: 14,
    fontWeight: "500",
    color: "#333",
    marginBottom: 2,
  },
  selectedActivityDescription: {
    fontSize: 12,
    color: "#666",
    lineHeight: 16,
  },
  activityCardsContainer: {
    flexDirection: "column",
    gap: 8,
    marginTop: 8,
  },
  activityCard: {
    borderRadius: 12,
    overflow: "hidden",
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  activityCardSelected: {
    shadowColor: "#9c27b0",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  activityCardGradient: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: 60,
  },
  activityCardContent: {
    flex: 1,
  },
  activityCardTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    marginBottom: 4,
  },
  activityCardTitleSelected: {
    color: "#ffffff",
  },
  activityCardDescription: {
    fontSize: 12,
    color: "#666",
    lineHeight: 16,
  },
  activityCardDescriptionSelected: {
    color: "rgba(255, 255, 255, 0.9)",
  },
  checkmarkContainer: {
    marginLeft: 12,
  },
});

export { ManualCalorieModal };
export default CalorieCardsComponent;
