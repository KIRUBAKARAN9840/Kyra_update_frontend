import React from "react";
import { View, Text, StyleSheet, Dimensions, FlatList } from "react-native";
import GradientButton2 from "../GradientButton2";
import TemplateFoodCard from "./TemplateFoodCard";
import Checkbox from "../CustomCheckbox";
import { MaskedText } from "../MaskedText";
import { LinearGradient } from "expo-linear-gradient";
import DefaultTemplateFoodCard from "./DefaultTemplateFoodCard";

const { width } = Dimensions.get("window");

const DefaultTemplateMealsCard = ({
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
          <FlatList
            data={foodList}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <DefaultTemplateFoodCard
                id={item.id}
                image={item.image_url}
                title={item.name}
                calories={item.calories}
                carbs={item.carbs}
                fat={item.fat}
                fiber={item.fiber}
                sugar={item.sugar}
                protein={item.protein}
                calcium={item.calcium}
                magnesium={item.magnesium}
                iron={item.iron}
                sodium={item.sodium}
                potassium={item.potassium}
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
                newDefaultTemplateLogFoodPage={newDefaultTemplateLogFoodPage}
                method={method}
              />
            )}
            contentContainerStyle={{ paddingBottom: 10, paddingTop: 0 }}
          />
        </View>
      )}

      {newDefaultTemplateLogFoodPage && (
        <LinearGradient
          colors={["#F8FCFF", "#f4fbf7"]}
          style={{
            backgroundColor: "#28A745",
            marginTop: 10,
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
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    backgroundColor: "#FAFAFA",
    borderRadius: 14,
    paddingHorizontal: 0,
    paddingBottom: 0,
    marginVertical: 10,
    width: width * 0.9,
    alignSelf: "center",
    shadowColor: "#000",
    shadowOffset: { width: 1, height: 1 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
    // overflow: "hidden",
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    margin: 16,
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
  },
});

export default DefaultTemplateMealsCard;
