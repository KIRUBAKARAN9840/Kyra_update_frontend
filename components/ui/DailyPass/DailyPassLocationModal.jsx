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
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { getMostCommonAreasAPI } from "../../../services/clientApi";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const TITLES = {
  city: "Select City",
  area: "Select Area",
  pincode: "Select Pincode",
};

const PLACEHOLDERS = {
  city: "Search city...",
  area: "Search area...",
  pincode: "Search pincode...",
};

const DailyPassLocationModal = ({
  visible,
  onClose,
  filterType, // 'city' | 'area' | 'pincode'
  onSelect,
  currentValue = "",
  existingFilters = {},
}) => {
  const insets = useSafeAreaInsets();
  const inputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const [searchText, setSearchText] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [trending, setTrending] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      fetchTrending();
      setTimeout(() => inputRef.current?.focus(), 150);
    } else {
      setSearchText("");
      setSuggestions([]);
    }
    return () => {
      if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    };
  }, [visible, filterType, existingFilters]);

  const fetchTrending = async () => {
    try {
      setLoading(true);
      const skip = (key) => key !== filterType;
      const response = await getMostCommonAreasAPI(
        filterType,
        skip("state") ? existingFilters.state : undefined,
        skip("city") ? existingFilters.city : undefined,
        skip("area") ? existingFilters.area : undefined,
        skip("pincode") ? existingFilters.pincode : undefined,
      );
      if (response?.status === 200 && Array.isArray(response.data)) {
        setTrending(response.data);
      } else {
        setTrending([]);
      }
    } catch {
      setTrending([]);
    } finally {
      setLoading(false);
    }
  };

  const searchFromDB = useCallback(
    async (query) => {
      if (!query.trim()) {
        setSuggestions([]);
        return;
      }
      try {
        setLoading(true);
        const skip = (key) => key !== filterType;
        const response = await getMostCommonAreasAPI(
          filterType,
          skip("state") ? existingFilters.state : undefined,
          skip("city") ? existingFilters.city : undefined,
          skip("area") ? existingFilters.area : undefined,
          skip("pincode") ? existingFilters.pincode : undefined,
          query,
        );
        if (response?.status === 200 && Array.isArray(response.data)) {
          setSuggestions(response.data);
        } else {
          setSuggestions([]);
        }
      } catch {
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    },
    [filterType, existingFilters],
  );

  const handleTextChange = (text) => {
    setSearchText(text);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!text.trim()) {
      setSuggestions([]);
      return;
    }
    searchTimeoutRef.current = setTimeout(() => searchFromDB(text), 500);
  };

  const handleClear = () => {
    setSearchText("");
    setSuggestions([]);
    inputRef.current?.focus();
  };

  const handleSelect = (value) => {
    onSelect(value);
    onClose();
  };

  const displayData = searchText.trim() ? suggestions : trending;
  const showTrendingTitle = !searchText.trim() && trending.length > 0;

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
          <Text style={styles.title}>
            {TITLES[filterType] || "Search"}
          </Text>
          <View style={styles.placeholder} />
        </View>

        {/* Search Input */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
          <TextInput
            ref={inputRef}
            style={styles.searchInput}
            placeholder={PLACEHOLDERS[filterType] || "Search..."}
            placeholderTextColor="#999"
            value={searchText}
            onChangeText={handleTextChange}
            autoCapitalize="words"
            autoCorrect={false}
            returnKeyType="search"
            keyboardType={filterType === "pincode" ? "numeric" : "default"}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={handleClear} style={styles.clearButton}>
              <Ionicons name="close-circle" size={20} color="#999" />
            </TouchableOpacity>
          )}
        </View>

        {/* Trending header */}
        {showTrendingTitle && (
          <View style={styles.trendingHeader}>
            <Ionicons name="trending-up" size={18} color="#FF5757" />
            <Text style={styles.trendingTitle}>Trending Searches</Text>
          </View>
        )}

        {/* List */}
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#FF5757" />
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
                  <Ionicons name="checkmark" size={20} color="#FF5757" />
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

export default DailyPassLocationModal;
