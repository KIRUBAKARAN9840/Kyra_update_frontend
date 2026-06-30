import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  StyleSheet,
  Text,
  View,
  Modal,
  TouchableOpacity,
  ScrollView,
  Pressable,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import DailyPassLocationModal from "../DailyPass/DailyPassLocationModal";

const emptyFilters = {
  city: "",
  area: "",
  pincode: "",
  sort_price: false,
  sort_type: null,
};

const FitnessClassFilterModal = ({
  visible,
  onClose,
  onApply,
  onReset,
  filters = {},
}) => {
  const insets = useSafeAreaInsets();

  const [tempFilters, setTempFilters] = useState({ ...emptyFilters });
  const [activeLocationField, setActiveLocationField] = useState(null);

  const handleLocationFieldPress = useCallback((field) => {
    setActiveLocationField(field);
  }, []);

  useEffect(() => {
    if (visible) {
      setTempFilters({
        city: filters.city || "",
        area: filters.area || "",
        pincode: filters.pincode || "",
        sort_price: filters.sort_price || false,
        sort_type: filters.sort_type || null,
      });
    }
  }, [visible, filters]);

  const handleSortSelect = useCallback((sortType) => {
    setTempFilters((prev) => ({
      ...prev,
      sort_price: prev.sort_type === sortType ? false : true,
      sort_type: prev.sort_type === sortType ? null : sortType,
    }));
  }, []);

  const handleApply = () => {
    if (onApply) onApply(tempFilters);
    onClose();
  };

  const handleReset = () => {
    setTempFilters({ ...emptyFilters });
    if (onReset) onReset();
  };

  const hasActiveFilters = useMemo(
    () =>
      !!tempFilters.city ||
      !!tempFilters.area ||
      !!tempFilters.pincode ||
      tempFilters.sort_price,
    [tempFilters],
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (tempFilters.city) count++;
    if (tempFilters.area) count++;
    if (tempFilters.pincode) count++;
    if (tempFilters.sort_price) count++;
    return count;
  }, [tempFilters]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.container}>
        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
          <TouchableOpacity onPress={onClose} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#1F2937" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Filters</Text>
          <View style={styles.headerRight}>
            {activeFilterCount > 0 && (
              <View style={styles.countBadge}>
                <Text style={styles.countText}>{activeFilterCount}</Text>
              </View>
            )}
            <TouchableOpacity onPress={handleReset} disabled={!hasActiveFilters}>
              <Text
                style={[
                  styles.resetText,
                  !hasActiveFilters && styles.resetTextDisabled,
                ]}
              >
                Reset
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingBottom: 120 }}
        >
          {/* Location */}
          <Text style={styles.sectionHeader}>Location</Text>
          <Text style={styles.sectionSubtitle}>
            Narrow down your search by location
          </Text>
          <View style={styles.locationCard}>
            <FilterRow
              label="City"
              value={tempFilters.city}
              onPress={() => handleLocationFieldPress("city")}
              onClear={() => setTempFilters((prev) => ({ ...prev, city: "" }))}
            />
            <View style={styles.divider} />
            <FilterRow
              label="Area"
              value={tempFilters.area}
              onPress={() => handleLocationFieldPress("area")}
              onClear={() => setTempFilters((prev) => ({ ...prev, area: "" }))}
            />
            <View style={styles.divider} />
            <FilterRow
              label="Pincode"
              value={tempFilters.pincode}
              onPress={() => handleLocationFieldPress("pincode")}
              onClear={() =>
                setTempFilters((prev) => ({ ...prev, pincode: "" }))
              }
            />
          </View>

          {/* Sort by Price */}
          <Text style={styles.sortByHeader}>Sort by Price</Text>
          <View style={styles.sortRow}>
            <Pressable
              style={[
                styles.sortChip,
                tempFilters.sort_price &&
                  tempFilters.sort_type === "ascending" &&
                  styles.sortChipSelected,
              ]}
              onPress={() => handleSortSelect("ascending")}
            >
              <View
                style={[
                  styles.sortRadio,
                  tempFilters.sort_price &&
                    tempFilters.sort_type === "ascending" &&
                    styles.sortRadioSelected,
                ]}
              >
                {tempFilters.sort_price &&
                  tempFilters.sort_type === "ascending" && (
                    <View style={styles.sortRadioFill} />
                  )}
              </View>
              <Text
                style={[
                  styles.sortChipText,
                  tempFilters.sort_price &&
                    tempFilters.sort_type === "ascending" &&
                    styles.sortChipTextSelected,
                ]}
              >
                Price: Low to High
              </Text>
            </Pressable>

            <Pressable
              style={[
                styles.sortChip,
                tempFilters.sort_price &&
                  tempFilters.sort_type === "descending" &&
                  styles.sortChipSelected,
              ]}
              onPress={() => handleSortSelect("descending")}
            >
              <View
                style={[
                  styles.sortRadio,
                  tempFilters.sort_price &&
                    tempFilters.sort_type === "descending" &&
                    styles.sortRadioSelected,
                ]}
              >
                {tempFilters.sort_price &&
                  tempFilters.sort_type === "descending" && (
                    <View style={styles.sortRadioFill} />
                  )}
              </View>
              <Text
                style={[
                  styles.sortChipText,
                  tempFilters.sort_price &&
                    tempFilters.sort_type === "descending" &&
                    styles.sortChipTextSelected,
                ]}
              >
                Price: High to Low
              </Text>
            </Pressable>
          </View>
        </ScrollView>

        {/* Bottom Apply Button */}
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={[
              styles.applyButton,
              !hasActiveFilters && styles.applyButtonDisabled,
            ]}
            onPress={handleApply}
            disabled={!hasActiveFilters}
            activeOpacity={0.8}
          >
            <Text style={styles.applyButtonText}>
              Apply Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ""}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <DailyPassLocationModal
        visible={activeLocationField !== null}
        onClose={() => setActiveLocationField(null)}
        filterType={activeLocationField}
        onSelect={(value) =>
          setTempFilters((prev) => ({ ...prev, [activeLocationField]: value }))
        }
        currentValue={tempFilters[activeLocationField] || ""}
        existingFilters={tempFilters}
      />
    </Modal>
  );
};

const FilterRow = ({ label, value, onPress, onClear }) => (
  <Pressable style={styles.row} onPress={onPress}>
    <Text style={styles.rowLabel}>{label}</Text>
    {value ? (
      <View style={styles.valueContainer}>
        <Text style={styles.valueText} numberOfLines={1}>
          {value}
        </Text>
        <TouchableOpacity
          style={styles.clearBtn}
          onPress={(e) => {
            e.stopPropagation();
            onClear();
          }}
        >
          <Ionicons name="close-circle" size={18} color="#EF4444" />
        </TouchableOpacity>
      </View>
    ) : (
      <View style={styles.placeholderContainer}>
        <Text style={styles.placeholderText}>Select</Text>
        <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
      </View>
    )}
  </Pressable>
);

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#fff" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  backButton: {
    width: 40,
    height: 40,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1F2937",
    flex: 1,
  },
  headerRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  countBadge: {
    backgroundColor: "#FF5757",
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2,
    minWidth: 22,
    alignItems: "center",
  },
  countText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  resetText: { fontSize: 15, fontWeight: "600", color: "#FF5757", minWidth: 50 },
  resetTextDisabled: { color: "#D1D5DB" },
  content: { flex: 1 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 20,
    marginBottom: 4,
    marginHorizontal: 16,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
    marginBottom: 10,
    marginHorizontal: 16,
  },
  locationCard: {
    marginHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    overflow: "hidden",
    backgroundColor: "#fff",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: "#fff",
  },
  rowLabel: { fontSize: 15, color: "#1F2937", fontWeight: "500" },
  valueContainer: { flexDirection: "row", alignItems: "center", gap: 6 },
  valueText: {
    fontSize: 14,
    color: "#FF5757",
    fontWeight: "500",
    maxWidth: 140,
  },
  clearBtn: { padding: 4 },
  placeholderContainer: { flexDirection: "row", alignItems: "center", gap: 4 },
  placeholderText: { fontSize: 14, color: "#9CA3AF" },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginLeft: 16 },
  sortByHeader: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FF5757",
    marginTop: 24,
    marginBottom: 10,
    marginHorizontal: 16,
  },
  sortRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    flexWrap: "wrap",
  },
  sortChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  sortChipSelected: { backgroundColor: "#FF5757", borderColor: "#FF5757" },
  sortRadio: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: "#9CA3AF",
    alignItems: "center",
    justifyContent: "center",
  },
  sortRadioSelected: { borderColor: "#fff" },
  sortRadioFill: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#fff",
  },
  sortChipText: { fontSize: 13, fontWeight: "500", color: "#374151" },
  sortChipTextSelected: { color: "#fff", fontWeight: "600" },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    backgroundColor: "#fff",
  },
  applyButton: {
    backgroundColor: "#FF5757",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  applyButtonDisabled: { backgroundColor: "#E5E7EB" },
  applyButtonText: { fontSize: 16, fontWeight: "600", color: "#fff" },
});

export default FitnessClassFilterModal;
