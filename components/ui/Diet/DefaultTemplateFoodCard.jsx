import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import {
  Dimensions,
  TouchableOpacity,
  StyleSheet,
  Text,
  View,
  Modal,
  Platform,
  TouchableWithoutFeedback,
} from "react-native";
import Checkbox from "../CustomCheckbox";
import { MaskedTextIcon } from "../MaskedText";
import { usePathname } from "expo-router";
import { Image } from "expo-image";

const { width } = Dimensions.get("window");

const DefaultTemplateFoodCard = ({
  id,
  image,
  title,
  calories,
  carbs,
  fat,
  protein,
  fiber = 0,
  sugar = 0,
  calcium = 0,
  magnesium = 0,
  iron = 0,
  sodium = 0,
  potassium = 0,
  quantity,
  templateTitle,
  templateId,
  onEdit,
  onDelete,
  deleteMeal,
  logFood,
  mealSelected,
  handleSelection,
  defaultTemplate,
  defaultTemplateId,
  trainerDietTemplateId,
  method,
  templateData,
  newDefaultTemplateLogFoodPage,
}) => {
  const nutrients = [
    {
      label: "Calories",
      value: calories,
      width: 13,
      icon: require("../../../assets/images/diet/calorie.png"),
    },
    {
      label: "Proteins",
      value: protein,
      width: 22,
      icon: require("../../../assets/images/diet/protein.png"),
    },
    {
      label: "Carbs",
      value: carbs,
      width: 22,
      icon: require("../../../assets/images/diet/carb.png"),
    },
    {
      label: "Fats",
      value: fat,
      width: 17,
      icon: require("../../../assets/images/diet/fat.png"),
    },
    {
      label: "Fiber",
      value: fiber,
      width: 26,
      icon: require("../../../assets/images/diet/fiber.png"),
    },
    {
      label: "Sugar",
      value: sugar,
      width: 22,
      icon: require("../../../assets/images/diet/sugar.png"),
    },
  ];

  const router = useRouter();
  const pathname = usePathname();
  const [showDropdown, setShowDropdown] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [showImageModal, setShowImageModal] = useState(false);

  const toggleDropdown = (event) => {
    if (Platform.OS === "ios") {
      // For iOS, capture the touch position for modal positioning
      event.persist();
      const { pageX, pageY } = event.nativeEvent;
      setMenuPosition({ x: pageX - 110, y: pageY }); // Adjust x to align menu properly
    }
    setShowDropdown(!showDropdown);
  };

  const handleEdit = () => {
    setShowDropdown(false);
    onEdit();
  };

  const handleDelete = () => {
    setShowDropdown(false);
    onDelete();
  };

  // iOS Modal Dropdown Component
  const IOSDropdownModal = () => (
    <Modal
      transparent={true}
      visible={showDropdown}
      animationType="fade"
      onRequestClose={() => setShowDropdown(false)}
    >
      <TouchableWithoutFeedback onPress={() => setShowDropdown(false)}>
        <View style={styles.modalOverlay}>
          <View
            style={[
              styles.iosDropdownMenu,
              {
                left: menuPosition.x,
                top: menuPosition.y,
              },
            ]}
          >
            <TouchableOpacity
              style={styles.iosDropdownItem}
              onPress={handleEdit}
            >
              <Ionicons name="create-outline" size={16} color="#333" />
              <Text style={styles.iosDropdownItemText}>Edit</Text>
            </TouchableOpacity>
            <View style={styles.dropdownSeparator} />
            <TouchableOpacity
              style={styles.iosDropdownItem}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={16} color="#ff3b30" />
              <Text style={[styles.iosDropdownItemText, { color: "#ff3b30" }]}>
                Delete
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );

  // Android Dropdown Component (original approach)
  const AndroidDropdown = () =>
    showDropdown && (
      <View style={styles.androidDropdownMenu}>
        <TouchableOpacity style={styles.dropdownItem} onPress={handleEdit}>
          <Ionicons name="create-outline" size={16} color="#333" />
          <Text style={styles.dropdownItemText}>Edit</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dropdownItem} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={16} color="#ff3b30" />
          <Text style={[styles.dropdownItemText, { color: "#ff3b30" }]}>
            Delete
          </Text>
        </TouchableOpacity>
      </View>
    );

  // Full Screen Image Modal
  const ImageModal = () => (
    <Modal
      animationType="fade"
      transparent={true}
      visible={showImageModal}
      onRequestClose={() => setShowImageModal(false)}
    >
      <View style={styles.imageModalContainer}>
        <TouchableOpacity
          style={styles.imageModalCloseButton}
          onPress={() => setShowImageModal(false)}
          activeOpacity={0.8}
        >
          <Ionicons name="close" size={30} color="#FFFFFF" />
        </TouchableOpacity>
        <TouchableWithoutFeedback onPress={() => setShowImageModal(false)}>
          <View style={styles.imageModalContent}>
            <Image
              source={image || require("../../../assets/images/Tiramisu.png")}
              style={styles.fullScreenImage}
              contentFit="contain"
            />
          </View>
        </TouchableWithoutFeedback>
      </View>
    </Modal>
  );

  return (
    <>
      <ImageModal />
      {Platform.OS === "ios" ? <IOSDropdownModal /> : <AndroidDropdown />}
      <TouchableOpacity
        onPress={() => {
          if (pathname === "/client/addTemplateCategoryPage") {
            return;
          }
          if (pathname === "/client/logDiet") {
            return;
          }
          if (pathname === "/client/trainerAssignedTemplateLogDietPage") {
            return;
          }

          if (method === "gym") {
            router.push({
              pathname: "/client/addTemplateCategoryPage",
              params: {
                defaultTemplateId: id,
                defaultTemplateTitle: title,
                SingleTemplateData: JSON.stringify(templateData),
                method: method,
              },
            });
            return;
          }

          if (newDefaultTemplateLogFoodPage) {
            return;
          }

          if (defaultTemplate) {
            router.push({
              pathname: "/client/addTemplateCategoryPage",
              params: {
                defaultTemplateId: id,
                defaultTemplateTitle: title,
                method: method,
              },
            });
          } else {
            if (method === "personal") {
              router.push({
                pathname: "/client/addTemplateCategoryPage",
                params: {
                  templateId: id,
                  templateTitle: title,
                  method: method,
                },
              });
            } else {
              router.push({
                pathname: "/client/addTemplateCategoryPage",
                params: {
                  trainerTemplateId: id,
                  trainerTemplateTitle: title,
                  SingleTemplateData: JSON.stringify(templateData),
                  method: method,
                },
              });
            }
          }
        }}
      >
        <LinearGradient
          colors={["#F8FCFF", "#f4fbf7"]}
          start={[0, 0]}
          end={[1, 1]}
          style={styles.cardContainer}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              marginVertical: 8,
            }}
          >
            <View
              style={{
                width: width >= 786 ? "13%" : "25%",
                justifyContent: "flex-end",
                flexDirection: "row",
                marginLeft: 5,
              }}
            >
              <TouchableOpacity
                onPress={() => setShowImageModal(true)}
                activeOpacity={0.7}
              >
                <Image
                  source={
                    image || require("../../../assets/images/Tiramisu.png")
                  }
                  style={{ width: 70, height: 63, borderRadius: 10 }}
                />
              </TouchableOpacity>
            </View>
            <View style={styles.headerRow}>
              <View style={{ width: "85%" }}>
                <Text style={styles.title}>
                  {title}
                  {!templateTitle && (
                    <Text style={styles.bowlText}> ({quantity}) </Text>
                  )}
                </Text>
              </View>
              <View style={styles.menuContainer}>
                {!defaultTemplate && (
                  <>
                    {!templateTitle && !templateId ? (
                      <>
                        {!defaultTemplateId && (
                          <TouchableOpacity
                            style={styles.menuButton}
                            onPress={toggleDropdown}
                          >
                            <Ionicons
                              name="ellipsis-vertical"
                              size={16}
                              color="#666"
                            />
                          </TouchableOpacity>
                        )}
                      </>
                    ) : (
                      !logFood && (
                        <TouchableOpacity
                          onPress={() => {
                            deleteMeal();
                          }}
                          style={{ marginRight: 10 }}
                        >
                          <Ionicons
                            name="trash-outline"
                            size={14}
                            color="#ff7f7f"
                          />
                        </TouchableOpacity>
                      )
                    )}
                  </>
                )}
                {logFood && (
                  <View style={{ marginRight: 10 }}>
                    <Checkbox
                      label=""
                      checked={mealSelected}
                      onChange={() =>
                        handleSelection({
                          mealId: id,
                          catId: handleSelection.catId,
                        })
                      }
                      containerStyle={{}}
                      checkboxStyle={{
                        width: 16,
                        height: 16,
                        borderWidth: 1,
                        borderColor: "rgba(40, 167, 70, 0.446)",
                      }}
                      checkmarkStyle={{ backgroundColor: "#2db84e" }}
                    />
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.nutrition_2}>
            {nutrients.map((item, index) => (
              <View style={styles.row} key={index}>
                <Image
                  source={item.icon}
                  style={[styles.icon, { width: item.width }]}
                />
                <Text style={styles.label}>{item.label}</Text>
                <Text style={styles.value}>{item.value}</Text>
              </View>
            ))}
          </View>

          {/* Micronutrients - Full width below macros */}
          <View style={styles.micronutrientsSection}>
            <View style={styles.micronutrientsHeader}>
              <Text style={styles.micronutrientsTitle}>Micro Nutrients</Text>
              <View style={styles.micronutrientsDivider} />
            </View>
            <View style={styles.micronutrientsRow}>
              <View style={styles.microItem}>
                <Text style={styles.microValue}>
                  {Math.round(calcium || 0)}mg
                </Text>
                <Text style={styles.microLabel}>Calcium</Text>
              </View>
              <View style={styles.microItem}>
                <Text style={styles.microValue}>
                  {Math.round(magnesium || 0)}mg
                </Text>
                <Text style={styles.microLabel}>Magnesium</Text>
              </View>
              <View style={styles.microItem}>
                <Text style={styles.microValue}>
                  {Math.round(sodium || 0)}mg
                </Text>
                <Text style={styles.microLabel}>Sodium</Text>
              </View>
              <View style={styles.microItem}>
                <Text style={styles.microValue}>
                  {Math.round(potassium || 0)}mg
                </Text>
                <Text style={styles.microLabel}>Potassium</Text>
              </View>
              <View style={styles.microItem}>
                <Text style={styles.microValue}>{Math.round(iron || 0)}mg</Text>
                <Text style={styles.microLabel}>Iron</Text>
              </View>
            </View>
          </View>

          <>
            {!templateTitle && !templateId && !defaultTemplateId && (
              <View style={styles.actionRow}>
                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    if (defaultTemplate) {
                      router.push({
                        pathname: "/client/trainerAssignedTemplateLogDietPage",
                        params: {
                          defaultTemplateId: id,
                          defaultTemplateTitle: title,
                          method: method,
                          templateData: JSON.stringify(templateData),
                        },
                      });
                    } else {
                      router.push({
                        pathname: "/client/logDiet",
                        params: {
                          templateId: id,
                          templateTitle: title,
                          method: method,
                        },
                        method: method,
                      });
                    }
                  }}
                >
                  <MaskedTextIcon
                    icon={"add-circle"}
                    size={16}
                    text={"Log Food"}
                    bg1={"#28A745"}
                    bg2={"#007BFF"}
                    style={{}}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.actionButton}
                  onPress={() => {
                    if (method === "gym") {
                      router.push({
                        pathname: "/client/addTemplateCategoryPage",
                        params: {
                          defaultTemplateId: id,
                          defaultTemplateTitle: title,
                          SingleTemplateData: JSON.stringify(templateData),
                          method: method,
                        },
                      });
                      return;
                    }
                    if (defaultTemplate) {
                      router.push({
                        pathname: "/client/addTemplateCategoryPage",
                        params: {
                          defaultTemplateId: id,
                          defaultTemplateTitle: title,
                          method: method,
                        },
                      });
                    } else {
                      if (method === "personal") {
                        router.push({
                          pathname: "/client/addTemplateCategoryPage",
                          params: {
                            templateId: id,
                            templateTitle: title,
                            method: method,
                          },
                        });
                      } else {
                        router.push({
                          pathname: "/client/addTemplateCategoryPage",
                          params: {
                            trainerTemplateId: id,
                            trainerTemplateTitle: title,
                            SingleTemplateData: JSON.stringify(templateData),
                            method: method,
                          },
                        });
                      }
                    }
                  }}
                >
                  <MaskedTextIcon
                    icon={"eye"}
                    size={16}
                    text={"View Food"}
                    bg1={"#28A745"}
                    bg2={"#007BFF"}
                    style={{}}
                  />
                </TouchableOpacity>
              </View>
            )}
          </>
        </LinearGradient>
      </TouchableOpacity>
    </>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 12,
    marginTop: 10,
    backgroundColor: "#ffffff",
    shadowColor: "#000000",
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    flex: 1,
    overflow: "visible",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  headerRow: {
    width: width >= 786 ? "87%" : "75%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    borderColor: "#d6d6d6",
    borderBottomWidth: 0.5,
  },
  menuContainer: {
    width: "15%",
    position: "relative",
  },
  menuButton: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  // iOS Modal Dropdown Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },
  iosDropdownMenu: {
    position: "absolute",
    backgroundColor: "#ffffff",
    borderRadius: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    width: 110,
    paddingVertical: 8,
    borderWidth: 0.5,
    borderColor: "#e0e0e0",
  },
  iosDropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
  },
  iosDropdownItemText: {
    fontSize: 14,
    color: "#333",
    fontWeight: "500",
  },
  dropdownSeparator: {
    height: 0.5,
    backgroundColor: "#e0e0e0",
    marginHorizontal: 12,
  },

  // Android Dropdown Styles (original)
  androidDropdownMenu: {
    position: "absolute",
    right: 30,
    top: 30,
    backgroundColor: "white",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    width: 110,
    zIndex: 10,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderBottomWidth: 0.5,
    borderBottomColor: "#eee",
    gap: 8,
  },
  dropdownItemText: {
    fontSize: 14,
    color: "#333",
  },

  // Common styles
  title: {
    fontSize: 12,
    fontWeight: "500",
    color: "#0A0A0A",
    paddingHorizontal: 8,
    // paddingVertical: 12,
    minHeight: 50,
  },
  itemCount: {
    fontSize: 14,
    color: "#777",
  },
  macroRow: {
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  macroItem: {
    alignItems: "center",
  },
  macroLabel: {
    fontSize: 14,
    color: "#777",
  },
  macroValue: {
    fontSize: 16,
    fontWeight: "600",
    color: "#000",
  },
  icon: {
    height: 21,
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  logFoodText: {
    color: "green",
    fontSize: 14,
    fontWeight: "500",
  },
  viewFoodText: {
    color: "blue",
    fontSize: 14,
    fontWeight: "500",
  },
  nutrition_2: {
    flexDirection: "row",
    flexWrap: "wrap",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingTop: 0,
    paddingBottom: 12,
  },
  row: {
    alignItems: "center",
  },
  label: {
    fontSize: 10,
    color: "#666",
  },
  value: {
    fontSize: 10,
  },
  bowlText: {
    fontSize: 10,
    color: "#888",
  },
  // Micronutrients styles
  micronutrientsSection: {
    paddingHorizontal: 16,
    paddingBottom: 12,
    borderColor: "#d6d6d6",
    borderBottomWidth: 0.5,
  },
  micronutrientsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
  },
  micronutrientsTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: "#666",
    marginRight: 4,
  },
  micronutrientsDivider: {
    flex: 1,
    height: 1,
    backgroundColor: "#e0e0e0",
  },
  micronutrientsRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  microItem: {
    alignItems: "center",
    flex: 1,
  },
  microValue: {
    fontSize: 10,
    fontWeight: "600",
    color: "#333",
    marginBottom: 2,
  },
  microLabel: {
    fontSize: 8,
    color: "#666",
    textAlign: "center",
  },
  imageModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  imageModalCloseButton: {
    position: "absolute",
    top: 50,
    right: 20,
    zIndex: 10,
    padding: 10,
  },
  imageModalContent: {
    width: "100%",
    height: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  fullScreenImage: {
    width: width,
    height: width,
  },
});

export default DefaultTemplateFoodCard;
