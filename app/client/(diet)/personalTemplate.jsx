import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useState, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Platform,
  BackHandler,
} from "react-native";
import { useFocusEffect } from "@react-navigation/native";
import EmptyStateCard from "../../../components/ui/Workout/EmptyDataComponent";
import { Ionicons } from "@expo/vector-icons";
const { width, height } = Dimensions.get("window");
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  deleteClientDietTemplateAPI,
  editClientDietTemplateNameAPI,
  getDietTemplateClientAPI,
} from "../../../services/clientApi";
import CreateTemplateModal from "../../../components/ui/Diet/createTemplateModal";
import { FlatList } from "react-native-gesture-handler";
import TemplateFoodCard from "../../../components/ui/Diet/TemplateFoodCard";
import GradientButton from "../../../components/ui/GradientButton";
import EditTemplateNameModal from "../../../components/ui/Diet/EditTemplateNameModal";
import { showToast } from "../../../utils/Toaster";
import SkeletonWorkout from "../../../components/ui/Workout/skeletonWorkout";
import { useUser } from "../../../context/UserContext";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const personalTemplate = (props) => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [openCreateTemplateModal, setOpenCreateTemplateModal] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templates, setTemplates] = useState([]);
  const [newTemplateName, setNewTemplateName] = useState("");
  const [isEditNameModalVisible, setEditNameModalVisible] = useState(false);
  const [templateId, setTemplateId] = useState(null);

  const { sideBarData, profile } = useUser();
  const insets = useSafeAreaInsets();
  const { method } = useLocalSearchParams();

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
        return;
      }

      const response = await getDietTemplateClientAPI(clientId, "personal");

      if (response?.status === 200) {
        const processedTemplates = response?.data.map((template) => {
          const nutrition = template?.nutrition_totals || {};

          return {
            ...template,
            calories: nutrition.calories || 0,
            protein: nutrition.protein || 0,
            carbs: nutrition.carbs || 0,
            fat: nutrition.fats || 0,
            fiber: nutrition.fiber || 0,
            sugar: nutrition.sugar || 0,
            sodium: nutrition.sodium || 0,
            potassium: nutrition.potassium || 0,
            calcium: nutrition.calcium || 0,
            iron: nutrition.iron || 0,
            magnesium: nutrition.magnesium || 0,
          };
        });

        setTemplates(processedTemplates);
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc:
            response?.detail ||
            response?.message ||
            "Something went wrong. Please try again later",
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
  }, []);

  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        router.replace("/client/diettracker");

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
                // setCurrentTemplate(null);
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
      ],
    );
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

    // Check if template name already exists (excluding the current template being edited)
    if (isDuplicateTemplateName(newTemplateName, templateId)) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Template name already exists",
      });
      return;
    }

    if (newTemplateName.trim()) {
      const payload = {
        id: templateId,
        template_name: newTemplateName,
      };

      try {
        const response = await editClientDietTemplateNameAPI(payload);
        if (response?.status === 200) {
          showToast({
            type: "success",
            title: response?.message,
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

  const isDuplicateTemplateName = (name, currentTemplateId = null) => {
    // When editing, exclude the current template from the check
    return templates.some(
      (template) =>
        template.name === name &&
        (currentTemplateId === null || template.id !== currentTemplateId),
    );
  };

  const renderTemplateItem = useCallback(
    ({ item }) => (
      <TemplateFoodCard
        templateData={item}
        id={item.id}
        image={item.pic}
        title={item.name}
        calories={item.calories}
        carbs={item.carbs}
        fat={item.fat}
        protein={item.protein}
        fiber={item.protein}
        sugar={item.protein}
        calcium={item.calcium}
        iron={item.iron}
        magnesium={item.magnesium}
        sodium={item.sodium}
        potassium={item.potassium}
        onEdit={() => {
          setTemplateId(item.id);
          setEditNameModalVisible(true);
          setNewTemplateName(item.name);
        }}
        onDelete={() => {
          handleDeleteTemplate(item.id);
        }}
        method={method}
        defaultTemplate={method === "personal" ? false : true}
      />
    ),
    [method, handleDeleteTemplate],
  );

  if (isLoading) {
    return <SkeletonWorkout header={false} priority="high" />;
  }

  return (
    <>
      <View style={[styles.sectionContainer, { paddingBottom: insets.bottom }]}>
        <TouchableOpacity
          style={[
            styles.backButtonContainer,
            { padding: width * 0.04, paddingTop: insets.top + 10 },
          ]}
          onPress={() => {
            router.replace("/client/diettracker");
          }}
        >
          <Ionicons name="arrow-back" size={24} color="#000" />
          <Text style={styles.backButtonText}>My Diet Charts</Text>
          <View style={{ width: 20 }} />
        </TouchableOpacity>

        {templates?.length === 0 && (
          <EmptyStateCard
            imageSource={require("../../../assets/images/workout/FOOD_NOT_AVAILABLE_CAT_V001 2.webp")}
            onButtonPress={() =>
              setOpenCreateTemplateModal(!openCreateTemplateModal)
            }
            buttonText={method === "personal" ? "Start Fresh" : ""}
            message={
              "Looks like you have not created any template yet!\nTap below to Create your own Template and add food in a single tap!"
            }
            belowButtonText={""}
            onButtonPress2={() => {}}
          />
        )}

        {templates.length > 0 && (
          <View style={styles.foodList}>
            <FlatList
              data={templates}
              keyExtractor={(item) => item.id.toString()}
              showsVerticalScrollIndicator={false}
              renderItem={renderTemplateItem}
              contentContainerStyle={{ paddingBottom: 10, paddingTop: 0 }}
              initialNumToRender={5}
              maxToRenderPerBatch={5}
              windowSize={5}
              removeClippedSubviews={true}
              updateCellsBatchingPeriod={50}
            />
          </View>
        )}

        {method !== "gym" && (
          <View style={{ marginBottom: 0 }}>
            <GradientButton
              title="Create New Template"
              fromColor="#28A745"
              toColor="#007BFF"
              // navigateTo="/client/todayFoodLogPage"
              containerStyle={{ marginTop: 0 }}
              textStyle={{ fontSize: 12 }}
              onPress={() =>
                setOpenCreateTemplateModal(!openCreateTemplateModal)
              }
            />
          </View>
        )}

        <CreateTemplateModal
          onClose={() => setOpenCreateTemplateModal(!openCreateTemplateModal)}
          value={templateName}
          visible={openCreateTemplateModal}
          onChange={(text) => {
            setTemplateName(text);
          }}
          onSubmit={async () => {
            // setTemplateName(templateName);
            if (templateName) {
              if (!isDuplicateTemplateName(templateName)) {
                setOpenCreateTemplateModal(false);
                setTemplateName("");
                router.push({
                  pathname: "/client/addTemplateCategoryPage",
                  params: { templateTitle: templateName, method: method },
                });
              } else {
                showToast({
                  type: "error",
                  title: "Error",
                  desc: "Template name already exists",
                });
              }
            } else {
              showToast({
                type: "error",
                title: "Enter the template name first",
              });
            }
          }}
        />

        <EditTemplateNameModal
          visible={isEditNameModalVisible}
          newTemplateName={newTemplateName}
          setNewTemplateName={setNewTemplateName}
          onClose={() => setEditNameModalVisible(false)}
          onSave={handleEditName}
        />
      </View>
    </>
  );
};

export default personalTemplate;

const styles = StyleSheet.create({
  sectionContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  backButtonContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 0,
    // marginBottom: height * 0.02,
  },
  backButtonText: {
    fontSize: 16,
    marginLeft: width * 0.02,
    fontWeight: "500",
  },
  foodList: {
    flex: 1,
    paddingHorizontal: width * 0.05,
    marginBottom: height * 0.02,
  },
});
