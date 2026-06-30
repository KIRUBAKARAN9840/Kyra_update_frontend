import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  FlatList,
} from "react-native";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons"; // or 'react-native-vector-icons/Ionicons'
import { format } from "date-fns";

const ManualFoodSelector = ({
  styles,
  dateAdd,
  setDateAdd,
  addDatePicker,
  setAddDatePicker,
  searchQuery,
  setSearchQuery,
  searchFoods,
  filteredFoods,
  selectedFoods,
  setSelectedFoods,
  setActiveSection,
  renderFoodItem,
  saveFoods,
}) => {
  return (
    <View style={styles.sectionContainer}>
      <TouchableOpacity
        style={styles.backButtonContainer}
        onPress={() => {
          setActiveSection(null);
          setSelectedFoods([]);
          setSearchQuery("");
        }}
      >
        <Ionicons name="arrow-back" size={24} color="#000" />
        <Text style={styles.backButtonText}>Select Food</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.dateSelector}
        onPress={() => setAddDatePicker(true)}
      >
        <Text style={styles.dateText}>
          {format(dateAdd, "MMMM dd, yyyy")}
          <Text style={styles.currentTimeText}>
            ({format(new Date(), "HH:mm")})
          </Text>
        </Text>
      </TouchableOpacity>

      {addDatePicker && (
        <DateTimePicker
          value={dateAdd}
          mode="date"
          display={Platform.OS === "ios" ? "spinner" : "default"}
          themeVariant="light"
          textColor="#000000"
          onChange={(event, date) => {
            setAddDatePicker(false);
            if (date) setDateAdd(date);
          }}
        />
      )}

      <TextInput
        style={styles.searchInput}
        placeholder="Search foods (Min 2 characters)"
        value={searchQuery}
        onChangeText={(text) => {
          setSearchQuery(text);
          searchFoods(text);
        }}
      />

      <FlatList
        data={filteredFoods}
        keyExtractor={(item) => item.id}
        renderItem={renderFoodItem}
        ListHeaderComponent={
          searchQuery.length < 2 ? (
            <Text style={styles.mostCommon}>Most Common</Text>
          ) : null
        }
        ListEmptyComponent={
          <Text style={styles.noResultsText}>
            No Results Found. Try Searching With Different Keywords
          </Text>
        }
        style={styles.foodList}
        keyboardShouldPersistTaps="handled"
        initialNumToRender={10}
        maxToRenderPerBatch={5}
        windowSize={10}
        removeClippedSubviews={true}
      />

      {selectedFoods.length > 0 && (
        <View style={styles.saveButtonContainer}>
          <TouchableOpacity style={styles.saveButton} onPress={saveFoods}>
            <Text style={styles.saveButtonText}>Save Selected Items</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default ManualFoodSelector;
