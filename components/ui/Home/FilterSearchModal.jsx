import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  TextInput,
  FlatList,
  ActivityIndicator,
  Keyboard,
  TouchableWithoutFeedback,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getMostCommonAreasAPI } from "../../../services/clientApi";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const FilterSearchModal = ({
  visible,
  onClose,
  filterType, // 'area', 'city', 'state', 'pincode'
  onSelect,
  currentValue = "",
  existingFilters = {}, // Pass current filter values for cascading
}) => {
  const [searchText, setSearchText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [trendingSearches, setTrendingSearches] = useState([]);
  const [loading, setLoading] = useState(false);
  const searchTimeoutRef = useRef(null);
  const inputRef = useRef(null);
  const insets = useSafeAreaInsets();

  // Fetch trending searches when modal opens
  useEffect(() => {
    if (visible) {
      fetchTrendingSearches();
      // Focus input after a small delay
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    } else {
      // Reset state when modal closes
      setSearchText("");
      setSuggestions([]);
    }

    // Cleanup debounce timeout on unmount or when modal closes
    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [visible, filterType, existingFilters]);

  // Fetch trending searches from API
  const fetchTrendingSearches = async () => {
    try {
      setLoading(true);

      // Exclude the current filter type from existing filters to avoid filtering by itself
      // e.g., when selecting area, don't send the existing area value
      const shouldSendFilter = (filterKey) => filterKey !== filterType;

      // Call the API with filter type and existing filters (excluding current filter type)
      const response = await getMostCommonAreasAPI(
        filterType,
        shouldSendFilter('state') ? existingFilters.state : undefined,
        shouldSendFilter('city') ? existingFilters.city : undefined,
        shouldSendFilter('area') ? existingFilters.area : undefined,
        shouldSendFilter('pincode') ? existingFilters.pincode : undefined,
      );

      // Check if response is successful and has data
      if (
        response?.status === 200 &&
        response?.data &&
        Array.isArray(response.data)
      ) {
        // Only show trending searches if there are results
        if (response.data.length > 0) {
          setTrendingSearches(response.data);
        } else {
          setTrendingSearches([]);
        }
      } else {
        setTrendingSearches([]);
      }
    } catch (error) {
      console.error("Error fetching trending searches:", error);
      setTrendingSearches([]);
    } finally {
      setLoading(false);
    }
  };

  // Search from database with API
  const searchFromDB = useCallback(
    async (query) => {
      if (!query.trim()) {
        setSuggestions([]);
        return;
      }

      try {
        setLoading(true);

        // Exclude the current filter type from existing filters to avoid filtering by itself
        const shouldSendFilter = (filterKey) => filterKey !== filterType;

        // Call the API with search query and existing filters (excluding current filter type)
        const response = await getMostCommonAreasAPI(
          filterType,
          shouldSendFilter('state') ? existingFilters.state : undefined,
          shouldSendFilter('city') ? existingFilters.city : undefined,
          shouldSendFilter('area') ? existingFilters.area : undefined,
          shouldSendFilter('pincode') ? existingFilters.pincode : undefined,
          query, // search parameter
        );

        // Check if response is successful and has data
        if (
          response?.status === 200 &&
          response?.data &&
          Array.isArray(response.data)
        ) {
          setSuggestions(response.data);
        } else {
          setSuggestions([]);
        }
      } catch (error) {
        console.error("Error searching:", error);
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    },
    [filterType, existingFilters],
  );

  // Handle text input change with debouncing
  const handleTextChange = (text) => {
    setSearchText(text);

    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    // If text is empty, clear suggestions and return
    if (!text.trim()) {
      setSuggestions([]);
      return;
    }

    // Set new timeout for search (500ms like addFoodListPage.jsx)

    searchTimeoutRef.current = setTimeout(() => {
      searchFromDB(text);
    }, 500);
  };

  // Clear search input
  const handleClear = () => {
    setSearchText("");
    setSuggestions([]);
    inputRef.current?.focus();
  };

  // Handle selection
  const handleSelect = (value) => {
    onSelect(value);
    onClose();
  };

  // Get title based on filter type
  const getTitle = () => {
    const titles = {
      area: "Select Area",
      city: "Select City",
      state: "Select State",
      pincode: "Select Pincode",
    };
    return titles[filterType] || "Search";
  };

  // Get placeholder based on filter type
  const getPlaceholder = () => {
    const placeholders = {
      area: "Search area...",
      city: "Search city...",
      state: "Search state...",
      pincode: "Search pincode...",
    };
    return placeholders[filterType] || "Search...";
  };

  // Data to display
  const displayData = searchText.trim() ? suggestions : trendingSearches;
  const showTrendingTitle = !searchText.trim() && trendingSearches.length > 0;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
      presentationStyle="fullScreen"
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top || 50 }]}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.title}>{getTitle()}</Text>
          <View style={styles.placeholder} />
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Ionicons
            name="search"
            size={20}
            color="#999"
            style={styles.searchIcon}
          />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder={getPlaceholder()}
            value={searchText}
            onChangeText={handleTextChange}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Trending Searches Title */}
        {showTrendingTitle && (
          <View style={styles.trendingHeader}>
            <Ionicons name="trending-up" size={18} color="#FF6B6B" />
            <Text style={styles.trendingTitle}>Trending Searches</Text>
          </View>
        )}

        {/* Results List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF6B6B" />
          </View>
        ) : displayData.length > 0 ? (
          <FlatList
            data={displayData}
            keyExtractor={(item, index) => `${item}-${index}`}
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.resultItem}
                onPress={() => handleSelect(item)}
              >
                <Ionicons
                  name={searchText.trim() ? "location" : "trending-up"}
                  size={20}
                  color="#666"
                  style={styles.resultIcon}
                />
                <Text style={styles.resultText}>{item}</Text>
                {currentValue === item && (
                  <Ionicons name="checkmark" size={20} color="#FF6B6B" />
                )}
              </TouchableOpacity>
            )}
            contentContainerStyle={styles.listContent}
            keyboardShouldPersistTaps="handled"
          />
        ) : searchText.trim() ? (
          <View style={styles.emptyContainer}>
            <Ionicons name="search" size={48} color="#ccc" />
            <Text style={styles.emptyText}>No results found</Text>
            <Text style={styles.emptySubtext}>Try a different search term</Text>
          </View>
        ) : null}
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f0f0f0",
  },
  backButton: {
    padding: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: "600",
    color: "#333",
  },
  placeholder: {
    width: 32,
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    margin: 16,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: "#f5f5f5",
    borderRadius: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  clearButton: {
    padding: 4,
  },
  trendingHeader: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingBottom: 12,
    gap: 8,
  },
  trendingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#666",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  listContent: {
    paddingBottom: 20,
  },
  resultItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: "#f5f5f5",
  },
  resultIcon: {
    marginRight: 12,
  },
  resultText: {
    flex: 1,
    fontSize: 16,
    color: "#333",
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#999",
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#ccc",
    marginTop: 8,
  },
});

export default FilterSearchModal;
