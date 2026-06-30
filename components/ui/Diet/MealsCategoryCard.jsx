import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  FlatList,
  TouchableOpacity,
} from "react-native";
import GradientButton2 from "../GradientButton2";
import TemplateFoodCard from "./TemplateFoodCard";
import Checkbox from "../CustomCheckbox";
import { MaskedText } from "../MaskedText";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");

const MealsCategoryCard = ({
  title,
  timeRange,
  onAddFood,
  itemsCount,
  onPress,
  foodList,
  templateTitle,
  templateId,
  updateDietTemplate,
  logFood,
  catSelected,
  handleSelection,
  categoryId,
  defaultTemplateId,
  newDefaultTemplateLogFoodPage,
  tagLine,
  method,
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  return (
    <View style={styles.cardContainer}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.timeRange}>{timeRange}</Text>
        </View>

        {logFood ? (
          <View style={{}}>
            <Checkbox
              label=""
              checked={catSelected}
              onChange={() => handleSelection({ catId: categoryId })}
              containerStyle={{}}
              checkboxStyle={{
                width: 18,
                height: 18,
                borderWidth: 1,
                borderColor: "#007bffcc",
                marginRight: 10,
              }}
            />
          </View>
        ) : (
          <>
            {!defaultTemplateId && (
              <GradientButton2
                title={"+ Add Food"}
                onPress={() => onPress()}
                fromColor={"#28A745"}
                toColor={"#007BFF"}
                textStyle={{}}
                containerStyle={{
                  borderRadius: 8,
                  paddingVertical: 8,
                  paddingHorizontal: 16,
                }}
              />
            )}
          </>
        )}
      </View>

      {foodList.length === 0 && (
        <View style={styles.footerRow}>
          <Text style={styles.noItemsText}>
            {itemsCount > 0
              ? `${itemsCount} items added`
              : "No items added yet"}
          </Text>
        </View>
      )}

      {foodList.length > 0 && (
        <View style={styles.foodList}>
          {/* First food item - always visible */}
          <TemplateFoodCard
            id={foodList[0].id}
            image={foodList[0].pic}
            title={foodList[0].name}
            calories={foodList[0].calories}
            carbs={foodList[0].carbs}
            fat={foodList[0].fat}
            fiber={foodList[0].fiber}
            sugar={foodList[0].sugar}
            protein={foodList[0].protein}
            calcium={foodList[0].calcium}
            magnesium={foodList[0].magnesium}
            iron={foodList[0].iron}
            sodium={foodList[0].sodium}
            potassium={foodList[0].potassium}
            quantity={foodList[0].quantity}
            deleteMeal={() => {
              updateDietTemplate(foodList[0].id);
            }}
            mealSelected={foodList[0].selected}
            handleSelection={() =>
              handleSelection({
                mealId: foodList[0].id,
                catId: categoryId,
              })
            }
            templateTitle={templateTitle}
            templateId={templateId}
            logFood={logFood}
            defaultTemplateId={defaultTemplateId}
            newDefaultTemplateLogFoodPage={newDefaultTemplateLogFoodPage}
            method={method}
          />

          {/* Show +X more button if there are more foods */}
          {foodList.length > 1 && !isExpanded && (
            <TouchableOpacity
              style={styles.expandButton}
              onPress={() => setIsExpanded(true)}
            >
              <Text style={styles.expandButtonText}>
                +{foodList.length - 1} more
              </Text>
              <Ionicons name="chevron-down" size={16} color="#666" />
            </TouchableOpacity>
          )}

          {/* Additional foods - shown when expanded */}
          {isExpanded && foodList.length > 1 && (
            <>
              <FlatList
                data={foodList.slice(1)}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <TemplateFoodCard
                    id={item.id}
                    image={item.pic}
                    title={item.name}
                    calories={item.calories}
                    carbs={item.carbs}
                    fat={item.fat}
                    fiber={item.fiber}
                    sugar={item.sugar}
                    calcium={item.calcium}
                    magnesium={item.magnesium}
                    iron={item.iron}
                    sodium={item.sodium}
                    potassium={item.potassium}
                    protein={item.protein}
                    quantity={item.quantity}
                    deleteMeal={() => {
                      updateDietTemplate(item.id);
                    }}
                    mealSelected={item.selected}
                    handleSelection={() =>
                      handleSelection({
                        mealId: item.id,
                        catId: categoryId,
                      })
                    }
                    templateTitle={templateTitle}
                    templateId={templateId}
                    logFood={logFood}
                    defaultTemplateId={defaultTemplateId}
                    newDefaultTemplateLogFoodPage={
                      newDefaultTemplateLogFoodPage
                    }
                    method={method}
                  />
                )}
                scrollEnabled={false}
                contentContainerStyle={{ paddingBottom: 10, paddingTop: 0 }}
              />

              {/* Hide button */}
              <TouchableOpacity
                style={styles.expandButton}
                onPress={() => setIsExpanded(false)}
              >
                <Text style={styles.expandButtonText}>
                  Hide {foodList.length - 1} more
                </Text>
                <Ionicons name="chevron-up" size={16} color="#666" />
              </TouchableOpacity>
            </>
          )}
        </View>
      )}

      {/* {newDefaultTemplateLogFoodPage && ( */}
      <LinearGradient
        colors={["#F8FCFF", "#f4fbf7"]}
        style={{
          backgroundColor: "#28A745",
          paddingVertical: 10,
          textAlign: "center",
          alignItems: "center",
          justifyContent: "center",
          shadowRadius: 14,
        }}
      >
        <MaskedText
          bg1="#28A745"
          bg2="#007BFF"
          text={tagLine}
          textStyle={{ textAlign: "center", shadowRadius: 14 }}
        ></MaskedText>
      </LinearGradient>
      {/* )} */}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#FAFAFA",
    borderRadius: 3,
    borderTopLeftRadius: 14,
    borderTopRightRadius: 14,
    paddingHorizontal: 0,
    paddingBottom: 0,
    marginVertical: 10,
    width: width * 0.93,
    alignSelf: "center",
    // shadowColor: "#000",
    // shadowOffset: { width: 1, height: 1 },
    // shadowOpacity: 0.25,
    // shadowRadius: 8,
    // elevation: 4,
    borderWidth: 1,
    borderColor: "#ddd",
    // overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    margin: 16,
    marginBottom: 10,
  },
  title: {
    fontSize: 14,
    color: "#0A0A0A",
    fontWeight: "bold",
  },
  timeRange: {
    fontSize: 12,
    color: "#696161ff",
    marginTop: 4,
  },
  addButtonWrapper: {
    borderRadius: 20,
    overflow: "hidden",
  },
  addButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  addButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "500",
  },
  footerRow: {
    marginTop: 16,
    alignItems: "center",
    marginBottom: 10,
  },
  noItemsText: {
    fontSize: 12,
    color: "#777",
  },
  foodList: {
    padding: 0,
    margin: 16,
    marginTop: 0,
    marginBottom: 5,
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    marginTop: 8,
    backgroundColor: "#f5f5f5",
    borderRadius: 6,
    gap: 4,
  },
  expandButtonText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
});

export default MealsCategoryCard;
