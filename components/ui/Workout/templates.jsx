import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  StyleSheet,
  Dimensions,
  Platform,
  Animated,
  Alert,
} from "react-native";
import CustomPicker from "../CustomPicker";
import Icon from "react-native-vector-icons/MaterialIcons";
import {
  addClientWrokoutTemplateAPI,
  deleteClientWorkoutTemplateAPI,
  editClientWorkoutTemplateExerciseAPI,
  editClientWorkoutTemplateNameAPI,
  getWorkoutTemplateClientAPI,
  getFittbotWorkoutAPI,
} from "../../../services/clientApi";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useRouter } from "expo-router";

import { showToast } from "../../../utils/Toaster";
import SkeletonWorkout from "./skeletonWorkout";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const scale = (size) => {
  const scaleFactor = width / 375;
  return size * scaleFactor;
};

const WorkoutTemplate = (props) => {
  const [templates, setTemplates] = useState([]);
  const { onSectionChange, scrollEventThrottle, onScroll, headerHeight } =
    props;
  const [modalVisible, setModalVisible] = useState(false);
  const [exerciseModal, setExerciseModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [currentTemplate, setCurrentTemplate] = useState(null);

  const [selectedMuscleGroup, setSelectedMuscleGroup] = useState("");
  const [selectedExercise, setSelectedExercise] = useState("");
  const [customExercise, setCustomExercise] = useState("");
  const [templateExercises, setTemplateExercises] = useState({});
  const [editTemplateModal, setEditTemplateModal] = useState(false);
  const [editExerciseModal, setEditExerciseModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [editingExercise, setEditingExercise] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [exerciseData, setExerciseData] = useState({});
  const [muscleGroups, setMuscleGroups] = useState([]);
  const router = useRouter();

  const fetchFittbotWorkouts = async () => {
    setIsLoading(true);
    const clientId = await AsyncStorage.getItem("client_id");
    if (!clientId) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    }
    try {
      const response = await getFittbotWorkoutAPI(clientId);
      if (response?.status === 200) {
        setExerciseData(response.data.exercise_data);
        setMuscleGroups(Object.keys(response.data.exercise_data));
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

  useEffect(() => {
    if (onSectionChange) {
      onSectionChange(currentTemplate);
    }
  }, [currentTemplate, onSectionChange]);

  const createTemplate = async () => {
    if (!templateName.trim()) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Please enter a template name",
      });
      return;
    }
    const clientId = await AsyncStorage.getItem("client_id");
    if (!clientId) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    }
    const newTemplate = {
      template_name: templateName,
      exercise_data: {},
      client_id: clientId,
    };
    try {
      const response = await addClientWrokoutTemplateAPI(newTemplate);
      if (response?.status === 200) {
        showToast({
          type: "success",
          title: "Success",
          desc: response?.message,
        });
        getTemplates();
        setModalVisible(false);
        setTemplateName("");
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
    }
  };

  const editTemplate = async () => {
    if (!templateName.trim()) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Please enter a template name",
      });
      return;
    }
    const payload = {
      id: editingTemplate.id,
      template_name: templateName,
    };

    try {
      const response = await editClientWorkoutTemplateNameAPI(payload);
      if (response?.status === 200) {
        showToast({
          type: "success",
          title: "Success",
          desc: response?.message,
        });
        getTemplates();
        setEditTemplateModal(false);
        setTemplateName("");
        setEditingTemplate(null);
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
    }
  };

  const deleteTemplate = (templateId) => {
    Alert.alert(
      "Delete Template",
      "Are you sure you want to delete this workout template?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              const response = await deleteClientWorkoutTemplateAPI(templateId);
              if (response?.status === 200) {
                showToast({
                  type: "success",
                  title: "Success",
                  desc: "Template deleted successfully",
                });
                setCurrentTemplate(null);
                getTemplates();
              } else {
                showToast({
                  type: "error",
                  title: "Error",
                  desc:
                    response?.detail ||
                    "Something went wrong. Please try again later",
                });
              }
            } catch (error) {
              showToast({
                type: "error",
                title: "Error",
                desc: "Something went wrong. Please try again later",
              });
            }
          },
        },
      ]
    );
  };

  const addExerciseToTemplate = () => {
    if (!selectedMuscleGroup || !selectedExercise) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Please select muscle group and exercise",
      });
      return;
    }

    const exerciseName = customExercise || selectedExercise;
    const updatedExercises = { ...templateExercises };

    if (!updatedExercises[selectedMuscleGroup]) {
      updatedExercises[selectedMuscleGroup] = {
        isCardio: exerciseData[selectedMuscleGroup]?.isCardio,
        isMuscleGroup: exerciseData[selectedMuscleGroup]?.isMuscleGroup,
        imagePath: exerciseData[selectedMuscleGroup]?.imagePath,
        exercises: [],
      };
    }

    let selectedExerciseObj = null;

    if (customExercise) {
      selectedExerciseObj = { name: customExercise, gifPath: null };
    } else {
      selectedExerciseObj = exerciseData[selectedMuscleGroup]?.exercises.find(
        (exercise) => exercise.name === selectedExercise
      ) || { name: selectedExercise, gifPath: null };
    }

    const exists = updatedExercises[selectedMuscleGroup].exercises.some(
      (e) => e.name === selectedExerciseObj.name
    );

    if (!exists) {
      updatedExercises[selectedMuscleGroup].exercises.push(selectedExerciseObj);
    } else {
      showToast({
        type: "info",
        title: "Already exists",
        desc: "This exercise is already in you template",
      });
      setExerciseModal(false);
      setSelectedMuscleGroup("");
      setSelectedExercise("");
      setCustomExercise("");
      return;
    }

    setTemplateExercises(updatedExercises);
    setExerciseModal(false);
    setSelectedMuscleGroup("");
    setSelectedExercise("");
    setCustomExercise("");
  };

  const editExercise = () => {
    if (!selectedMuscleGroup || (!selectedExercise && !customExercise)) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Please select muscle group and exercise",
      });
      return;
    }

    const { muscleGroup, exerciseIndex } = editingExercise;
    const exerciseName = customExercise || selectedExercise;

    let updatedExerciseObj = null;

    if (customExercise) {
      updatedExerciseObj = { name: customExercise, gifPath: null };
    } else {
      updatedExerciseObj = exerciseData[selectedMuscleGroup]?.exercises.find(
        (exercise) => exercise.name === selectedExercise
      ) || { name: selectedExercise, gifPath: null };
    }

    const updatedExercises = { ...templateExercises };

    if (muscleGroup !== selectedMuscleGroup) {
      updatedExercises[muscleGroup].exercises.splice(exerciseIndex, 1);

      if (updatedExercises[muscleGroup].exercises.length === 0) {
        delete updatedExercises[muscleGroup];
      }

      if (!updatedExercises[selectedMuscleGroup]) {
        updatedExercises[selectedMuscleGroup] = {
          isCardio: exerciseData[selectedMuscleGroup]?.isCardio,
          isMuscleGroup: exerciseData[selectedMuscleGroup]?.isMuscleGroup,
          imagePath: exerciseData[selectedMuscleGroup]?.imagePath,
          exercises: [],
        };
      }

      const exists = updatedExercises[selectedMuscleGroup].exercises.some(
        (e) => e.name === updatedExerciseObj.name
      );

      if (!exists) {
        updatedExercises[selectedMuscleGroup].exercises.push(
          updatedExerciseObj
        );
      } else {
        showToast({
          type: "info",
          title: "Already exists",
          desc: "This exercise is already in you template",
        });
        return;
      }
    } else {
      updatedExercises[muscleGroup].exercises[exerciseIndex] =
        updatedExerciseObj;
    }

    setTemplateExercises(updatedExercises);
    setEditExerciseModal(false);
    setSelectedMuscleGroup("");
    setSelectedExercise("");
    setCustomExercise("");
    setEditingExercise(null);
  };

  const deleteExercise = (muscleGroup, exerciseIndex) => {
    Alert.alert(
      "Delete Exercise",
      "Are you sure you want to delete this exercise?",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            const updatedExercises = { ...templateExercises };

            updatedExercises[muscleGroup].exercises.splice(exerciseIndex, 1);

            if (updatedExercises[muscleGroup].exercises.length === 0) {
              delete updatedExercises[muscleGroup];
            }

            setTemplateExercises(updatedExercises);
          },
        },
      ]
    );
  };

  const saveExercises = async () => {
    const payload = {
      id: currentTemplate.id,
      exercise_data: templateExercises,
    };

    try {
      const response = await editClientWorkoutTemplateExerciseAPI(payload);
      if (response?.status === 200) {
        showToast({
          type: "success",
          title: "Success",
          desc: response?.message,
        });
        getTemplates();
        setCurrentTemplate(null);
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
    }
  };

  const getTemplates = async () => {
    setIsLoading(true);
    try {
      const clientId = await AsyncStorage.getItem("client_id");
      if (!clientId) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Something went wrong. Please try again later",
        });
      }
      const response = await getWorkoutTemplateClientAPI(clientId);
      if (response?.status === 200) {
        setTemplates(response?.data);
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

  useEffect(() => {
    getTemplates();
    fetchFittbotWorkouts();
  }, []);

  const renderTemplatesList = () => {
    if (templates.length === 0) {
      return (
        <View style={styles.noTemplatesContainer}>
          <Icon name="playlist-add" size={scale(64)} color="#cccccc" />
          <Text style={styles.noTemplatesText}>No workout templates found</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Icon name="add" size={scale(24)} color="white" />
            <Text style={styles.addButtonText}>Create First Template</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.templatesScrollContainer,
            { paddingTop: headerHeight },
          ]}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
        >
          {templates.map((template) => (
            <TouchableOpacity
              key={template.id}
              style={styles.templateButton}
              onPress={() => {
                setCurrentTemplate(template);
                setTemplateExercises(template.exercise_data);
              }}
            >
              <Text style={styles.templateButtonText}>{template.name}</Text>
              <View style={styles.actionIcons}>
                <TouchableOpacity
                  onPress={() => {
                    setEditingTemplate(template);
                    setTemplateName(template.name);
                    setEditTemplateModal(true);
                  }}
                >
                  <Icon name="edit" size={scale(20)} color="#FF5757" />
                </TouchableOpacity>
                <TouchableOpacity onPress={() => deleteTemplate(template.id)}>
                  <Icon name="delete" size={scale(20)} color="#FF5757" />
                </TouchableOpacity>
              </View>
            </TouchableOpacity>
          ))}
        </Animated.ScrollView>

        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => setModalVisible(true)}
          >
            <Icon name="add" size={scale(24)} color="white" />
            <Text style={styles.addButtonText}>New Template</Text>
          </TouchableOpacity>
        </View>
      </>
    );
  };

  const renderTemplateDetail = () => {
    return (
      <View style={styles.container}>
        <View style={styles.headerContainer}>
          <TouchableOpacity onPress={() => setCurrentTemplate(null)}>
            <Icon name="arrow-back" size={scale(24)} color="#FF5757" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>{currentTemplate.name}</Text>
        </View>

        <ScrollView
          contentContainerStyle={styles.templateDetailScrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {Object.entries(templateExercises).map(([muscleGroup, groupData]) => (
            <View key={muscleGroup} style={styles.muscleGroupSection}>
              <Text style={styles.muscleGroupTitle}>{muscleGroup}</Text>
              {groupData.exercises.map((exercise, index) => (
                <View key={index} style={styles.exerciseItem}>
                  <Text style={styles.exerciseText}>{exercise.name}</Text>
                  <View style={styles.actionIcons}>
                    <TouchableOpacity
                      onPress={() => {
                        setEditingExercise({
                          muscleGroup,
                          exerciseIndex: index,
                        });
                        setSelectedMuscleGroup(muscleGroup);
                        setSelectedExercise(exercise.name);
                        setEditExerciseModal(true);
                      }}
                    >
                      <Icon name="edit" size={scale(20)} color="#FF5757" />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => deleteExercise(muscleGroup, index)}
                    >
                      <Icon name="delete" size={scale(20)} color="#FF5757" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity style={styles.saveButton} onPress={saveExercises}>
          <Icon name="save" size={scale(20)} color="white" />
          <Text style={styles.addButtonText}>Save Exercise</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setExerciseModal(true)}
        >
          <Icon name="add" size={scale(20)} color="white" />
          <Text style={styles.addButtonText}>Add Exercise</Text>
        </TouchableOpacity>
      </View>
    );
  };

  if (isLoading) {
    return <SkeletonWorkout header={false} priority="high" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      {!currentTemplate ? renderTemplatesList() : renderTemplateDetail()}

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Template</Text>
            <TextInput
              style={styles.input}
              placeholder="Template Name"
              placeholderTextColor="#999"
              value={templateName}
              onChangeText={setTemplateName}
            />
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.modalButton}
                onPress={createTemplate}
              >
                <Text style={styles.modalButtonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={exerciseModal}
        onRequestClose={() => setExerciseModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Add Exercise</Text>

            <View style={styles.pickerContainer}>
              <CustomPicker
                onValueChange={(value) => {
                  setSelectedMuscleGroup(value);
                  setSelectedExercise("");
                }}
                items={muscleGroups.map((group) => ({
                  label: group,
                  value: group,
                }))}
                placeholder="Select Muscle Group"
              />
            </View>

            {selectedMuscleGroup && (
              <View style={styles.pickerContainer}>
                <CustomPicker
                  onValueChange={(value) => {
                    setSelectedExercise(value);
                    setCustomExercise("");
                  }}
                  items={[
                    ...(exerciseData[selectedMuscleGroup]?.exercises || []).map(
                      (exercise) => ({
                        label: exercise.name,
                        value: exercise.name,
                      })
                    ),
                  ]}
                  placeholder="Select Exercise"
                />
              </View>
            )}

            <TouchableOpacity
              style={styles.modalButton}
              onPress={addExerciseToTemplate}
            >
              <Text style={styles.modalButtonText}>Add Exercise</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={editTemplateModal}
        onRequestClose={() => setEditTemplateModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Template</Text>
            <TextInput
              style={styles.input}
              placeholder="Template Name"
              placeholderTextColor="#999"
              value={templateName}
              onChangeText={setTemplateName}
            />
            <View style={styles.modalButtonContainer}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={editTemplate}
              >
                <Text style={styles.modalButtonText}>Update</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditTemplateModal(false)}
              >
                <Text style={styles.modalButtonText}>Cancel</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        animationType="slide"
        transparent={true}
        visible={editExerciseModal}
        onRequestClose={() => setEditExerciseModal(false)}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Exercise</Text>

            <View style={styles.pickerContainer}>
              <CustomPicker
                value={selectedMuscleGroup}
                onValueChange={(value) => {
                  setSelectedMuscleGroup(value);
                  setSelectedExercise("");
                }}
                items={muscleGroups.map((group) => ({
                  label: group,
                  value: group,
                }))}
                placeholder="Select Muscle Group"
              />
            </View>

            {selectedMuscleGroup && (
              <View style={styles.pickerContainer}>
                <CustomPicker
                  value={selectedExercise}
                  onValueChange={(value) => {
                    setSelectedExercise(value);
                    setCustomExercise("");
                  }}
                  items={[
                    ...(exerciseData[selectedMuscleGroup]?.exercises || []).map(
                      (exercise) => ({
                        label: exercise.name,
                        value: exercise.name,
                      })
                    ),
                  ]}
                  placeholder="Select Exercise"
                />
              </View>
            )}

            <TouchableOpacity style={styles.modalButton} onPress={editExercise}>
              <Text style={styles.modalButtonText}>Update Exercise</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F7",
    marginTop: 15,
  },
  heading: {
    fontSize: scale(20),
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: 10,
    color: "#FF5757",
  },
  templatesScrollContainer: {
    paddingVertical: scale(10),
  },
  templateDetailScrollContainer: {
    paddingVertical: scale(10),
  },
  templateButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "white",
    padding: scale(15),
    marginHorizontal: scale(15),
    marginVertical: scale(7),
    borderRadius: scale(10),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: scale(4),
    elevation: 3,
  },
  templateButtonText: {
    fontSize: scale(16),
    fontWeight: "600",
  },
  saveButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF5757",
    padding: scale(15),
    marginHorizontal: scale(15),
    borderRadius: scale(10),
    shadowColor: "#FF5757",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: scale(6),
    elevation: 5,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF5757",
    padding: scale(12),
    margin: scale(13),
    borderRadius: scale(10),
    shadowColor: "#FF5757",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: scale(6),
    elevation: 5,
  },
  addButtonText: {
    color: "white",
    fontSize: scale(14),
    fontWeight: "600",
    marginLeft: scale(10),
  },
  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  modalContent: {
    width: width * 0.9,
    backgroundColor: "white",
    borderRadius: scale(15),
    padding: scale(20),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: scale(6),
    elevation: 8,
  },
  modalTitle: {
    fontSize: scale(18),
    fontWeight: "bold",
    marginBottom: scale(15),
    textAlign: "center",
    color: "#FF5757",
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: scale(8),
    marginBottom: scale(10),
  },
  input: {
    borderWidth: 1,
    borderColor: "#ddd",
    borderRadius: scale(8),
    padding: scale(12),
    marginBottom: scale(10),
    fontSize: scale(14),
  },
  modalButton: {
    backgroundColor: "#FF5757",
    padding: scale(15),
    borderRadius: scale(10),
    alignItems: "center",
    marginTop: scale(10),
  },
  modalButtonText: {
    color: "white",
    fontSize: scale(16),
    fontWeight: "600",
  },
  modalButtonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
  },

  cancelButton: {
    backgroundColor: "#6c757d",
  },
  noTemplatesContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: scale(20),
  },
  noTemplatesText: {
    fontSize: scale(18),
    color: "#999",
    marginVertical: scale(15),
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    padding: scale(15),
    backgroundColor: "white",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: scale(4),
    elevation: 2,
  },
  screenTitle: {
    fontSize: scale(18),
    fontWeight: "bold",
    marginLeft: scale(10),
    color: "#333",
  },
  muscleGroupSection: {
    backgroundColor: "white",
    marginHorizontal: scale(15),
    marginVertical: scale(7),
    borderRadius: scale(10),
    padding: scale(15),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: scale(4),
    elevation: 3,
  },
  muscleGroupTitle: {
    fontSize: scale(16),
    fontWeight: "bold",
    marginBottom: scale(10),
    color: "#FF5757",
  },
  actionIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  exerciseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: scale(10),
    borderBottomWidth: 1,
    borderBottomColor: "#eee",
  },
  exerciseText: {
    fontSize: scale(14),
    flex: 1,
  },
});

export default WorkoutTemplate;
