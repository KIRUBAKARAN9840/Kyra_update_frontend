import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Dimensions,
  Modal,
  TouchableWithoutFeedback,
  Keyboard,
  ScrollView,
  Image,
  Platform, // Add this import
} from "react-native";
import CustomPicker from "../CustomPicker";
import { Ionicons } from "@expo/vector-icons"; // Add this import for the chevron icon
import { showToast } from "../../../utils/Toaster";
import MaskedView from "@react-native-masked-view/masked-view";
import { LinearGradient } from "expo-linear-gradient";

const { width, height } = Dimensions.get("window");

const OnboardingModal = ({
  visible,
  onClose,
  onCompleteSetup,
  targetCaloriesConfigured,
  targetWeightConfigured,
  calculateCalories,
  saveTrackingData,
  targets,
  setTargets,
  boxValues,
  setBoxValues,
  completeSetup,
}) => {
  const [step, setStep] = useState(1);
  const [isCalculated, setIsCalculated] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (targetCaloriesConfigured && !targetWeightConfigured) {
      setStep(2);
    } else if (!targetCaloriesConfigured) {
      setStep(1);
    }
  }, [targetCaloriesConfigured, targetWeightConfigured]);

  const handleCalculateCalories = async () => {
    setIsLoading(true);
    try {
      await calculateCalories();
      setIsCalculated(true);
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Error calculating calories",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleContinue = async () => {
    if (step === 1 && isCalculated) {
      setIsCalculated(false);
      setStep(2);
    } else if (step === 2) {
      setIsLoading(true);
      try {
        await saveTrackingData("weight");
        if (completeSetup) {
          onCompleteSetup();
        }
      } catch (error) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Error setting weight",
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handleSaveTargets = async () => {
    try {
      await saveTrackingData("calories");
      setStep(2);
    } catch (error) {
      console.error("Error saving targets:", error);
    }
  };

  const renderProgressIndicator = () => (
    <View style={styles.progressIndicator}>
      <View style={styles.progressStepsContainer}>
        <View style={[styles.progressStep]}>
          {step >= 1 ? (
            <LinearGradient
              colors={["#673ab7", "#e91e63"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.activeProgressStepGradient}
            >
              <Text
                style={[styles.progressStepText, styles.activeProgressStepText]}
              >
                1
              </Text>
            </LinearGradient>
          ) : (
            <Text style={styles.progressStepText}>1</Text>
          )}
        </View>
        {step >= 2 ? (
          <LinearGradient
            colors={["#673ab7", "#e91e63"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.progressLineGradient}
          />
        ) : (
          <View style={styles.progressLine} />
        )}
        <View style={[styles.progressStep]}>
          {step >= 2 ? (
            <LinearGradient
              colors={["#673ab7", "#e91e63"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.activeProgressStepGradient}
            >
              <Text
                style={[styles.progressStepText, styles.activeProgressStepText]}
              >
                2
              </Text>
            </LinearGradient>
          ) : (
            <Text style={styles.progressStepText}>2</Text>
          )}
        </View>
      </View>
      <Text style={styles.modalTitle}>
        Almost there! Help us tailor your experience by setting your targets
      </Text>
    </View>
  );

  const renderCalculateCaloriesStep = () => (
    <View style={styles.stepContainer}>
      {isCalculated ? (
        <View style={styles.calculatedResultsContainer}>
          <MaskedView
            maskElement={<Text style={styles.title}>Calculated Results</Text>}
          >
            <LinearGradient
              colors={["#5B2B9B", "#FF3C7B"]}
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
                source={require("../../../assets/images/calories.png")}
                style={styles.calorieImages}
              />
              <Text style={styles.resultText}>{targets.calories} kcal</Text>
              <Text style={styles.resultLabel}>Calories</Text>
            </View>

            <View style={styles.resultItem}>
              <Image
                source={require("../../../assets/images/PROTEIN.png")}
                style={styles.proteinImages}
              />
              <Text style={styles.resultText}>{targets.protein} g</Text>
              <Text style={styles.resultLabel}>Protein</Text>
            </View>

            <View style={styles.resultItem}>
              <Image
                source={require("../../../assets/images/CARBS.png")}
                style={styles.macroImages}
              />
              <Text style={styles.resultText}>{targets.carbs} g</Text>
              <Text style={styles.resultLabel}>Carbs</Text>
            </View>

            <View style={styles.resultItem}>
              <Image
                source={require("../../../assets/images/FAT.png")}
                style={styles.fatImages}
              />
              <Text style={styles.resultText}>{targets.fat} g</Text>
              <Text style={styles.resultLabel}>Fat</Text>
            </View>
            <View style={styles.resultItem}>
              <Image
                source={require("../../../assets/images/FIBER.png")}
                style={styles.fiberImages}
              />
              <Text style={styles.resultText}>{targets.fiber} g</Text>
              <Text style={styles.resultLabel}>Fiber</Text>
            </View>
            <View style={styles.resultItem}>
              <Image
                source={require("../../../assets/images/SUGAR.png")}
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
                colors={["#673ab7", "#e91e63"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.continueButtonGradient}
              >
                <Text style={styles.continueButtonText}>Save & Continue</Text>
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
                  colors={["#5B2B9B", "#FF3C7B"]}
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
                  <LinearGradient
                    colors={["#9c27b01A", "#e91e631A"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.radius}
                  >
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
                  </LinearGradient>
                </View>
                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>Height (cm)*</Text>
                  <LinearGradient
                    colors={["#9c27b01A", "#e91e631A"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.radius}
                  >
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
                  </LinearGradient>
                </View>
              </View>

              <View style={styles.row}>
                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>Age*</Text>
                  <LinearGradient
                    colors={["#9c27b01A", "#e91e631A"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.radius}
                  >
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
                  </LinearGradient>
                </View>
                <View style={[styles.inputContainer, styles.halfWidth]}>
                  <Text style={styles.inputLabel}>Lifestyle*</Text>
                  <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                    <LinearGradient
                      colors={["#9c27b01A", "#e91e631A"]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.radius}
                    >
                      <View style={styles.pickerContainer}>
                        <CustomPicker
                          value={boxValues.lifestyle}
                          onValueChange={(value) =>
                            setBoxValues({ ...boxValues, lifestyle: value })
                          }
                          placeholder="Select lifestyle"
                          items={[
                            { label: "Sedentary", value: "sedentary" },
                            {
                              label: "Lightly Active",
                              value: "lightly_active",
                            },
                            {
                              label: "Moderately Active",
                              value: "moderately_active",
                            },
                            { label: "Very Active", value: "very_active" },
                            { label: "Super Active", value: "super_active" },
                          ]}
                        />
                      </View>
                    </LinearGradient>
                  </TouchableWithoutFeedback>
                </View>
              </View>

              <View style={styles.inputContainer}>
                <Text style={styles.inputLabel}>Goal*</Text>
                <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
                  <LinearGradient
                    colors={["#9c27b01A", "#e91e631A"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.radius}
                  >
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
                  </LinearGradient>
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
                    ? ["#E0E0E0", "#BDBDBD"]
                    : ["#9c27b0", "#e91e63"]
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

  const renderSetWeightTargetStep = () => (
    <View style={styles.stepContainer}>
      <View style={styles.stepTitle}>
        <Text style={styles.stepTitleText}>Set Your Target Weight</Text>
      </View>

      <View style={styles.weightInputContainer}>
        <View style={[styles.inputContainer]}>
          <Text style={styles.inputLabel}>Current Weight (kg)</Text>
          <LinearGradient
            colors={["#9c27b01A", "#e91e631A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.radius}
          >
            <TextInput
              style={[styles.input]}
              keyboardType="numeric"
              placeholder="Enter Current Weight"
              placeholderTextColor="rgba(0, 0, 0, 0.3)"
              value={String(boxValues?.actual_weight)}
              onChangeText={(text) =>
                setBoxValues({ ...boxValues, actual_weight: text })
              }
            />
          </LinearGradient>
        </View>

        <View style={styles.inputContainer}>
          <Text style={styles.inputLabel}>Target Weight (kg)*</Text>
          <LinearGradient
            colors={["#9c27b01A", "#e91e631A"]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.radius}
          >
            <TextInput
              style={styles.input}
              keyboardType="numeric"
              placeholder="Enter target weight"
              placeholderTextColor="rgba(0, 0, 0, 0.3)"
              value={String(boxValues?.target_weight)}
              onChangeText={(text) =>
                setBoxValues({ ...boxValues, target_weight: text })
              }
            />
          </LinearGradient>
        </View>
      </View>

      <TouchableOpacity
        disabled={
          boxValues?.target_weight == "0" ||
          boxValues?.target_weight == "" ||
          boxValues?.actual_weight == ""
        }
        onPress={handleContinue}
      >
        {isLoading ? (
          <ActivityIndicator />
        ) : (
          <LinearGradient
            colors={
              boxValues?.target_weight == "0" ||
              boxValues?.target_weight == "" ||
              boxValues?.actual_weight == ""
                ? ["#E0E0E0", "#BDBDBD"]
                : ["#673ab7", "#e91e63"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={[
              styles.calculateButton,
              (boxValues?.target_weight == "0" ||
                boxValues?.target_weight == "" ||
                boxValues?.actual_weight == "") &&
                styles.buttonDisabled,
            ]}
          >
            <Text style={styles.continueButtonText}>Save & Continue</Text>
          </LinearGradient>
        )}
      </TouchableOpacity>
    </View>
  );

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={() => Keyboard.dismiss()}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {renderProgressIndicator()}
            {step === 1 && renderCalculateCaloriesStep()}
            {step === 2 && renderSetWeightTargetStep()}
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#fff",
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
  },
  progressIndicator: {
    alignItems: "center",
    marginBottom: 12,
  },
  progressStepsContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  progressStep: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#f0f0f0",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#ddd",
  },
  activeProgressStepGradient: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  progressStepText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#888",
  },
  activeProgressStepText: {
    color: "#fff",
  },
  progressLine: {
    flex: 1,
    height: 3,
    backgroundColor: "#ddd",
    marginHorizontal: 10,
  },
  progressLineGradient: {
    flex: 1,
    height: 3,
    marginHorizontal: 10,
  },
  modalTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#333",
    textAlign: "center",
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
    borderWidth: 1,
    borderColor: "#9c27b01A",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  radius: {
    borderRadius: 8,
  },
  // Updated picker container style
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#9c27b01A",
    borderRadius: 8,
    height: 38,
    justifyContent: "center",
    overflow: "hidden",
    backgroundColor: "transparent", // Match the gradient background
  },
  calculatedResultsContainer: {
    padding: 12,
    backgroundColor: "#f9f9f9",
    borderRadius: 12,
    marginTop: 8,
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#333",
    marginBottom: 12,
    textAlign: "center",
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
    opacity: 0.6,
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
  weightInputContainer: {
    marginBottom: 12,
  },
  datePickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#f9f9f9",
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
  },
  datePickerButtonText: {
    color: "#666",
    fontSize: 14,
  },
});

export default OnboardingModal;
