import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  FlatList,
  Dimensions,
  Alert,
  Animated,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  addClientDietTemplateAPI,
  deleteClientDietTemplateAPI,
  editClientDietTemplateDishesAPI,
  editClientDietTemplateNameAPI,
  getCommonFooodAPI,
  getDietTemplateClientAPI,
  searchClientFoodAPI,
} from "../../../services/clientApi";

import SuccessPopup from "../SuccessPopup";
import { showToast } from "../../../utils/Toaster";
import SkeletonWorkout from "../Workout/skeletonWorkout";
import {
  safeParseFloat,
  safeGetAsyncStorage,
} from "../../../utils/safeHelpers";
import { SafeAreaView } from "react-native-safe-area-context";

const { width, height } = Dimensions.get("window");

const scale = (size) => {
  const scaleFactor = width / 375;
  return size * scaleFactor;
};

const DietTemplate = (props) => {
  const { onSectionChange, scrollEventThrottle, onScroll, headerHeight } =
    props;
  const [templates, setTemplates] = useState([]);
  const [isNewTemplateModalVisible, setNewTemplateModalVisible] =
    useState(false);
  const [isEditNameModalVisible, setEditNameModalVisible] = useState(false);
  const [isViewTemplateModalVisible, setViewTemplateModalVisible] =
    useState(false);
  const [isAddDishModalVisible, setAddDishModalVisible] = useState(false);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [currentTemplate, setCurrentTemplate] = useState(null);
  const [searchText, setSearchText] = useState("");
  const [selectedDishes, setSelectedDishes] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [allFoods, setAllFoods] = useState([]);
  const [showSuccess, setShowSuccess] = useState(false);
  const [successMsg, setSuccessMsg] = useState({
    message: "",
    type: "",
  });

  useEffect(() => {
    if (onSectionChange) {
      onSectionChange(currentTemplate);
    }
  }, [currentTemplate, onSectionChange]);

  const handleCreateTemplate = async () => {
    if (!newTemplateName.trim()) {
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
      return;
    }

    const newTemplate = {
      template_name: newTemplateName,
      diet_data: {
        dishes: [],
      },
      client_id: clientId,
    };

    try {
      const response = await addClientDietTemplateAPI(newTemplate);
      if (response?.status === 200) {
        setSuccessMsg({
          message: response?.message,
          type: "success",
        });
        setShowSuccess(true);
        await getTemplates();
        setNewTemplateName("");
        setNewTemplateModalVisible(false);
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

  const handleEditName = async () => {
    if (!newTemplateName.trim()) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Please enter a template name",
      });
      return;
    }

    if (currentTemplate && newTemplateName.trim()) {
      const payload = {
        id: currentTemplate.id,
        template_name: newTemplateName,
      };

      try {
        const response = await editClientDietTemplateNameAPI(payload);
        if (response?.status === 200) {
          showToast({
            type: "success",
            title: "Success",
            desc: response?.message,
          });
          await getTemplates();
          setEditNameModalVisible(false);
          setNewTemplateName("");
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
    }
  };

  const handleDeleteTemplate = (templateId) => {
    Alert.alert(
      "Delete Template",
      "Are you sure you want to delete this diet template?",
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
              const response = await deleteClientDietTemplateAPI(templateId);
              if (response?.status === 200) {
                showToast({
                  type: "success",
                  title: "Success",
                  desc: "Template deleted Successfully",
                });
                setCurrentTemplate(null);
                await getTemplates();
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

  const handleSaveDishes = async () => {
    if (currentTemplate) {
      const payload = {
        id: currentTemplate.id,
        diet_data: {
          dishes: selectedDishes,
        },
      };

      try {
        const response = await editClientDietTemplateDishesAPI(payload);
        if (response?.status === 200) {
          showToast({
            type: "success",
            title: "Success",
            desc: response?.message,
          });
          await getTemplates();
          setViewTemplateModalVisible(false);
          setAddDishModalVisible(false);
          setCurrentTemplate(null);
          setSelectedDishes([]);
          setSearchText("");
          await fetchCommonDiet();
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
    }
  };

  const toggleDishSelection = (dish) => {
    if (selectedDishes.some((d) => d.id === dish.id)) {
      setSelectedDishes(selectedDishes.filter((d) => d.id !== dish.id));
    } else {
      setSelectedDishes([...selectedDishes, dish]);
    }
  };

  const filteredFoods = allFoods?.filter((food) =>
    food.name.toLowerCase().includes(searchText.toLowerCase())
  );

  const calculateTotalNutrients = (dishes) => {
    return dishes.reduce(
      (acc, dish) => ({
        calories: safeParseFloat(
          (acc.calories + (dish.calories || 0)).toFixed(2),
          0
        ),
        protein: safeParseFloat(
          (acc.protein + (dish.protein || 0)).toFixed(2),
          0
        ),
        carbs: safeParseFloat((acc.carbs + (dish.carbs || 0)).toFixed(2), 0),
        fat: safeParseFloat((acc.fat + (dish.fat || 0)).toFixed(2), 0),
        fiber: safeParseFloat((acc.fiber + (dish.fiber || 0)).toFixed(2), 0),
        sugar: safeParseFloat((acc.sugar + (dish.sugar || 0)).toFixed(2), 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0, sugar: 0 }
    );
  };

  const fetchCommonDiet = async () => {
    try {
      const response = await getCommonFooodAPI();
      if (response?.status === 200) {
        setAllFoods(response?.data || []);
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
      const clientId = await safeGetAsyncStorage("client_id", null);
      if (!clientId) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Something went wrong. Please try again later",
        });
        setIsLoading(false);
        return;
      }

      const response = await getDietTemplateClientAPI(clientId);
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

  const searchFoods = async (query) => {
    if (query.length > 1) {
      try {
        const response = await searchClientFoodAPI(query);
        if (response?.status === 200) {
          setAllFoods(response?.data);
        } else {
          showToast({
            type: "error",
            title: "Error",
            desc: response?.detail || "Error searching foods",
          });
        }
      } catch (error) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Something went wrong. Please try again later",
        });
      }
    } else {
      await fetchCommonDiet();
    }
  };

  useEffect(() => {
    getTemplates();
    fetchCommonDiet();
  }, []);

  const renderTemplateCard = (template) => {
    const totals = calculateTotalNutrients(template.diet_data.dishes);

    return (
      <TouchableOpacity
        key={template.id}
        style={styles.templateCard}
        onPress={() => setCurrentTemplate(template)}
      >
        <View style={styles.templateHeader}>
          <Text style={styles.templateName}>{template.name}</Text>
          <View style={styles.headerButtons}>
            <TouchableOpacity
              onPress={() => {
                setCurrentTemplate(template);
                setNewTemplateName(template.name);
                setEditNameModalVisible(true);
              }}
              style={styles.editButton}
            >
              <Ionicons name="pencil" size={scale(20)} color="#FF5757" />
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => handleDeleteTemplate(template.id)}
              style={styles.deleteButton}
            >
              <Ionicons name="trash" size={scale(20)} color="#FF5757" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.nutrientsContainer}>
          <View style={styles.nutrientItem}>
            <Ionicons name="flame" size={scale(20)} color="#FF5757" />
            <Text style={styles.nutrientValue}>{totals.calories}</Text>
            <Text style={styles.nutrientLabel}>Calories</Text>
          </View>
          <View style={styles.nutrientItem}>
            <Ionicons name="barbell" size={scale(20)} color="#FF5757" />
            <Text style={styles.nutrientValue}>{totals.protein}g</Text>
            <Text style={styles.nutrientLabel}>Protein</Text>
          </View>
          <View style={styles.nutrientItem}>
            <Ionicons name="pizza" size={scale(20)} color="#FF5757" />
            <Text style={styles.nutrientValue}>{totals.carbs}g</Text>
            <Text style={styles.nutrientLabel}>Carbs</Text>
          </View>
          <View style={styles.nutrientItem}>
            <Ionicons name="water" size={scale(20)} color="#FF5757" />
            <Text style={styles.nutrientValue}>{totals.fat}g</Text>
            <Text style={styles.nutrientLabel}>Fat</Text>
          </View>
          <View style={styles.nutrientItem}>
            <Ionicons name="leaf" size={scale(20)} color="#FF5757" />
            <Text style={styles.nutrientValue}>{totals.fiber}g</Text>
            <Text style={styles.nutrientLabel}>Fiber</Text>
          </View>
          <View style={styles.nutrientItem}>
            <Ionicons name="cafe" size={scale(20)} color="#FF5757" />
            <Text style={styles.nutrientValue}>{totals.sugar}g</Text>
            <Text style={styles.nutrientLabel}>Sugar</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderZeroTemplates = () => {
    return (
      <View style={styles.noTemplatesContainer}>
        <Ionicons name="restaurant-outline" size={scale(64)} color="#cccccc" />
        <Text style={styles.noTemplatesText}>No Diet templates found</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setNewTemplateModalVisible(true)}
        >
          <Ionicons name="add" size={scale(24)} color="white" />
          <Text style={styles.addButtonText}>Create First Template</Text>
        </TouchableOpacity>
      </View>
    );
  };

  const renderTemplatesList = () => {
    if (templates.length === 0) {
      return renderZeroTemplates();
    }

    return (
      <>
        <Animated.ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[
            styles.templatesScrollContainer,
            { paddingTop: headerHeight + 20 },
          ]}
          onScroll={onScroll}
          scrollEventThrottle={scrollEventThrottle}
        >
          {templates.map((template) => renderTemplateCard(template))}
        </Animated.ScrollView>

        <View style={styles.bottomButtonContainer}>
          <TouchableOpacity
            style={styles.addButton}
            onPress={() => {
              setNewTemplateModalVisible(true);
              setNewTemplateName("");
            }}
          >
            <Ionicons name="add" size={scale(20)} color="white" />
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
            <Ionicons name="arrow-back" size={scale(24)} color="#FF5757" />
          </TouchableOpacity>
          <Text style={styles.screenTitle}>{currentTemplate.name}</Text>
        </View>

        <ScrollView
          style={styles.dishListContainer}
          keyboardShouldPersistTaps="handled"
        >
          {currentTemplate.diet_data.dishes.length === 0 ? (
            <View style={styles.noTemplatesContainer}>
              <Text style={styles.noTemplatesText}>No Dishes found</Text>
              <Text style={styles.noTemplatesText}>
                Tap 'Add Dish' to add dishes
              </Text>
            </View>
          ) : (
            currentTemplate.diet_data.dishes.map((dish) => (
              <View key={dish?.id} style={styles.foodCard}>
                <View style={styles.foodDetails}>
                  <Text style={styles.foodName}>{dish?.name}</Text>
                  <View style={styles.nutrientContainer}>
                    <Text style={styles.nutrientText}>
                      Calories: {dish?.calories}
                    </Text>
                    <Text style={styles.nutrientText}>
                      Protein: {dish?.protein}g
                    </Text>
                    <Text style={styles.nutrientText}>
                      Carbs: {dish?.carbs}g
                    </Text>
                    <Text style={styles.nutrientText}>Fat: {dish?.fat}g</Text>
                    <Text style={styles.nutrientText}>
                      Fiber: {dish?.fiber || 0}g
                    </Text>
                    <Text style={styles.nutrientText}>
                      Sugar: {dish?.sugar || 0}g
                    </Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        <View style={styles.editFooter}>
          <TouchableOpacity
            style={[styles.footerButton, styles.cancelButton]}
            onPress={() => {
              setCurrentTemplate(null);
              setSelectedDishes([]);
            }}
          >
            <Text style={styles.buttonText}>Back</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.footerButton, styles.addButton]}
            onPress={() => {
              setSelectedDishes([...currentTemplate.diet_data.dishes]);
              setAddDishModalVisible(true);
            }}
          >
            <Text style={styles.buttonText}>Add/Remove Dish</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return <SkeletonWorkout header={false} priority="high" />;
  }

  return (
    <SafeAreaView style={styles.container}>
      <SuccessPopup
        visible={showSuccess}
        message={successMsg?.message}
        onClose={() => setShowSuccess(false)}
        type={successMsg?.type}
      />

      {!currentTemplate ? renderTemplatesList() : renderTemplateDetail()}

      {/* Create New Template Modal */}
      <Modal
        visible={isNewTemplateModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setNewTemplateModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Create New Template</Text>
            <TextInput
              style={styles.input}
              placeholder="Template Name"
              value={newTemplateName}
              onChangeText={setNewTemplateName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setNewTemplateModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleCreateTemplate}
              >
                <Text style={styles.buttonText}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Template Name Modal */}
      <Modal
        visible={isEditNameModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setEditNameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Edit Template Name</Text>
            <TextInput
              style={styles.input}
              placeholder="Template Name"
              value={newTemplateName}
              onChangeText={setNewTemplateName}
            />
            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={() => setEditNameModalVisible(false)}
              >
                <Text style={styles.buttonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalButton, styles.createButton]}
                onPress={handleEditName}
              >
                <Text style={styles.buttonText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add Dish Modal */}
      <Modal
        visible={isAddDishModalVisible}
        animationType="slide"
        onRequestClose={() => setAddDishModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.headerContainer}>
            <TouchableOpacity onPress={() => setAddDishModalVisible(false)}>
              <Ionicons name="arrow-back" size={scale(24)} color="#FF5757" />
            </TouchableOpacity>
            <Text style={styles.screenTitle}>Add Dishes</Text>
          </View>

          <View style={styles.searchContainer}>
            <TextInput
              style={styles.searchInput}
              placeholder="Search foods (Min 2 characters)"
              value={searchText}
              onChangeText={(text) => {
                setSearchText(text);
                searchFoods(text);
              }}
            />
          </View>

          <ScrollView
            style={styles.foodListContainer}
            keyboardShouldPersistTaps="handled"
          >
            {filteredFoods.length === 0 ? (
              <View style={styles.noTemplatesContainer}>
                <Text style={styles.noTemplatesText}>No Matches found</Text>
              </View>
            ) : (
              filteredFoods?.map((food) => (
                <TouchableOpacity
                  key={food.id}
                  style={[
                    styles.foodCard,
                    selectedDishes.some((d) => d.id === food.id) &&
                      styles.selectedFoodCard,
                  ]}
                  onPress={() => toggleDishSelection(food)}
                >
                  <View style={styles.foodDetails}>
                    <View
                      style={{
                        flexDirection: "row",
                        gap: 5,
                        alignItems: "center",
                      }}
                    >
                      <Text style={styles.foodName}>{food.name}</Text>
                      {food.quantity && (
                        <Text style={styles.foodItemSubTitle}>
                          ({food.quantity})
                        </Text>
                      )}
                    </View>
                    <View style={styles.nutrientContainer}>
                      <Text style={styles.nutrientText}>
                        Calories: {food.calories}
                      </Text>
                      <Text style={styles.nutrientText}>
                        Protein: {food.protein}g
                      </Text>
                      <Text style={styles.nutrientText}>
                        Carbs: {food.carbs}g
                      </Text>
                      <Text style={styles.nutrientText}>Fat: {food.fat}g</Text>
                      <Text style={styles.nutrientText}>
                        Fiber: {food.fiber || 0}g
                      </Text>
                      <Text style={styles.nutrientText}>
                        Sugar: {food.sugar || 0}g
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>

          <View style={styles.editFooter}>
            <TouchableOpacity
              style={[styles.footerButton, styles.cancelButton]}
              onPress={() => setAddDishModalVisible(false)}
            >
              <Text style={styles.buttonText}>Back</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerButton, styles.saveButton]}
              onPress={handleSaveDishes}
            >
              <Text style={styles.buttonText}>Save All</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F7F7F7",
  },
  header: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    textAlign: "center",
    paddingVertical: scale(10),
  },
  title: {
    fontSize: scale(20),
    fontWeight: "600",
    textAlign: "center",
    paddingVertical: scale(5),
    color: "#FF5757",
  },
  templatesScrollContainer: {
    paddingVertical: scale(10),
    paddingHorizontal: scale(16),
  },
  bottomButtonContainer: {
    paddingHorizontal: scale(14),
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF5757",
    padding: scale(12),
    margin: scale(15),
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
  templateCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(12),
    padding: scale(16),
    marginBottom: scale(16),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: scale(4),
  },
  templateHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: scale(12),
  },
  templateName: {
    fontSize: scale(16),
    fontWeight: "bold",
    color: "#333333",
  },
  headerButtons: {
    flexDirection: "row",
  },
  editButton: {
    marginRight: scale(12),
  },
  deleteButton: {
    marginLeft: scale(4),
  },
  nutrientsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: scale(8),
  },
  nutrientItem: {
    alignItems: "center",
  },
  nutrientValue: {
    fontSize: scale(12),
    fontWeight: "bold",
    color: "#333333",
    marginTop: scale(4),
  },
  nutrientLabel: {
    fontSize: scale(10),
    color: "#666666",
    marginTop: scale(2),
  },
  noTemplatesContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: scale(20),
    paddingVertical: scale(50),
  },
  noTemplatesText: {
    fontSize: scale(18),
    color: "#999",
    marginVertical: scale(15),
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    backgroundColor: "#FFFFFF",
    borderRadius: scale(12),
    padding: scale(24),
    width: width * 0.9,
    elevation: 5,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F7F7F7",
  },
  modalTitle: {
    fontSize: scale(20),
    fontWeight: "bold",
    color: "#333333",
    marginBottom: scale(16),
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: scale(8),
    padding: scale(12),
    fontSize: scale(16),
    marginBottom: scale(16),
  },
  modalButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  modalButton: {
    flex: 1,
    padding: scale(12),
    borderRadius: scale(8),
    marginHorizontal: scale(8),
  },
  footerButton: {
    flex: 1,
    paddingHorizontal: scale(12),
    borderRadius: scale(8),
    marginHorizontal: scale(4),
  },
  cancelButton: {
    backgroundColor: "#666666",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: scale(15),
    margin: scale(15),
    borderRadius: scale(10),
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: scale(6),
    elevation: 5,
  },
  createButton: {
    backgroundColor: "#FF5757",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: scale(15),
    margin: scale(15),
    borderRadius: scale(10),
    shadowColor: "#FF5757",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: scale(6),
    elevation: 5,
  },
  saveButton: {
    backgroundColor: "#4CAF50",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: scale(15),
    margin: scale(15),
    borderRadius: scale(10),
    shadowColor: "#4CAF50",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: scale(6),
    elevation: 5,
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: scale(14),
    fontWeight: "bold",
    textAlign: "center",
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
    marginTop: 30,
  },
  screenTitle: {
    fontSize: scale(18),
    fontWeight: "bold",
    marginLeft: scale(10),
    color: "#333",
  },
  editFooter: {
    flexDirection: "row",
    paddingHorizontal: scale(16),
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#E5E5E5",
  },
  dishListContainer: {
    flex: 1,
    backgroundColor: "#F7F7F7",
    paddingHorizontal: scale(16),
    paddingVertical: scale(10),
  },
  searchContainer: {
    padding: scale(16),
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E5E5E5",
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#E5E5E5",
    borderRadius: scale(8),
    padding: scale(12),
    fontSize: scale(16),
  },
  foodListContainer: {
    flex: 1,
    padding: scale(16),
  },
  foodCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: scale(8),
    padding: scale(12),
    marginBottom: scale(8),
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: scale(2),
  },
  selectedFoodCard: {
    backgroundColor: "#E3F2FD",
  },
  foodDetails: {
    flex: 1,
    paddingVertical: scale(5),
  },
  foodName: {
    fontSize: scale(14),
    fontWeight: "bold",
    color: "#333333",
    marginBottom: scale(4),
  },
  foodItemSubTitle: {
    fontSize: scale(12),
    color: "#666666",
  },
  nutrientContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingTop: scale(5),
  },
  nutrientText: {
    fontSize: scale(12),
    color: "#666666",
    marginRight: scale(8),
  },
  indicator: {
    width: scale(8),
    height: scale(8),
    borderRadius: scale(4),
    marginLeft: scale(8),
    alignSelf: "center",
  },
  vegIndicator: {
    backgroundColor: "#4CAF50",
  },
  nonVegIndicator: {
    backgroundColor: "#FF5757",
  },
});
export default DietTemplate;
