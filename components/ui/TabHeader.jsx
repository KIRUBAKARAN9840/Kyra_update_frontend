// components/TabSelector.js
import React from "react";
import { StyleSheet, Text, TouchableOpacity, View } from "react-native";

/**
 * A reusable tab selector component
 * @param {Array} tabs - Array of tab objects with 'id' and 'label' properties
 * @param {string} activeTab - ID of the currently active tab
 * @param {Function} onTabChange - Function to call when tab is changed, receives tab id as parameter
 * @param {Object} customStyles - Optional custom styles object to override default styles
 */

const TabHeader = ({ tabs, activeTab, onTabChange, customStyles = {} }) => {
  return (
    <View style={[styles.tabContainer, customStyles.tabContainer]}>
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.id}
          style={[
            styles.tabButton,
            activeTab === tab.id && styles.activeTabButton,
            customStyles.tabButton,
            activeTab === tab.id && customStyles.activeTabButton,
          ]}
          onPress={() => onTabChange(tab.id)}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === tab.id && styles.activeTabText,
              customStyles.tabText,
              activeTab === tab.id && customStyles.activeTabText,
            ]}
          >
            {tab.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  tabContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    marginBottom: 8,
    backgroundColor: "#fff",
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  activeTabButton: {
    borderBottomColor: "#10A0F6",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#777",
  },
  activeTabText: {
    color: "#10A0F6",
    fontWeight: "600",
  },
});

export default TabHeader;
