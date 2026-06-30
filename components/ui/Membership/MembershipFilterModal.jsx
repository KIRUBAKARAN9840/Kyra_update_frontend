import { useState, useEffect, useMemo } from "react";
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

const FITNESS_TYPES = [
  { id: "gym", label: "Gym", icon: "fitness-outline" },
  { id: "zumba", label: "Zumba", icon: "musical-notes-outline" },
  { id: "pilates", label: "Pilates", icon: "ribbon-outline" },
  { id: "yoga", label: "Yoga", icon: "body-outline" },
  { id: "aerobics", label: "Aerobics", icon: "heart-outline" },
  { id: "dance", label: "Dance", icon: "musical-note-outline" },
  { id: "swimming", label: "Swimming", icon: "water-outline" },
  { id: "crossfit", label: "CrossFit", icon: "barbell-outline" },
  { id: "martial_arts", label: "Martial Arts", icon: "flash-outline" },
  { id: "boxing", label: "Boxing", icon: "hand-right-outline" },
  { id: "sports", label: "Sports", icon: "football-outline" },
];

// From gymstudios.jsx / GymFilterModal.jsx
const MEMBERSHIP_TYPES = [
  { id: "membership", name: "Individual Membership" },
  { id: "couple_membership", name: "Couple Membership" },
  { id: "buddy", name: "Buddy Membership" },
  { id: "pt", name: "Individual PT" },
  { id: "couple_pt", name: "Couple PT" },
  { id: "buddy_pt", name: "Buddy PT" },
];

const GymFilterModal = ({
  visible,
  onClose,
  onApply,
  onReset,
  filters = {},
}) => {
  const insets = useSafeAreaInsets();
  const [activeLocationField, setActiveLocationField] = useState(null);

  const [tempFilters, setTempFilters] = useState({
    state: filters.state || "",
    city: filters.city || "",
    area: filters.area || "",
    pincode: filters.pincode || "",
    no_cost_emi: filters.no_cost_emi || false,
    selected_fitness_types: filters.selected_fitness_types || [],
    membership_types: filters.membership_types || [],
    sort_price: filters.sort_price || false,
    sort_type: filters.sort_type || null,
  });

  useEffect(() => {
    if (visible) {
      setTempFilters({
        state: filters.state || "",
        city: filters.city || "",
        area: filters.area || "",
        pincode: filters.pincode || "",
        no_cost_emi: filters.no_cost_emi || false,
        selected_fitness_types: filters.selected_fitness_types || [],
        membership_types: filters.membership_types || [],
        sort_price: filters.sort_price || false,
        sort_type: filters.sort_type || null,
      });
    }
  }, [visible, filters]);

  const handleFitnessTypeToggle = (id) => {
    setTempFilters((prev) => {
      const newSelected = prev.selected_fitness_types.includes(id)
        ? prev.selected_fitness_types.filter((t) => t !== id)
        : [...prev.selected_fitness_types, id];
      return { ...prev, selected_fitness_types: newSelected };
    });
  };

  const handleMembershipTypeToggle = (id) => {
    setTempFilters((prev) => {
      const newSelected = prev.membership_types.includes(id)
        ? prev.membership_types.filter((t) => t !== id)
        : [...prev.membership_types, id];
      return { ...prev, membership_types: newSelected };
    });
  };

  const handleNoCostEmiToggle = () => {
    setTempFilters((prev) => ({ ...prev, no_cost_emi: !prev.no_cost_emi }));
  };

  const handleSortSelect = (sortType) => {
    setTempFilters((prev) => ({
      ...prev,
      sort_price: prev.sort_type === sortType ? false : true,
      sort_type: prev.sort_type === sortType ? null : sortType,
    }));
  };

  const handleApply = () => {
    if (onApply) onApply(tempFilters);
    onClose();
  };

  const handleReset = () => {
    const reset = {
      state: "",
      city: "",
      area: "",
      pincode: "",
      no_cost_emi: false,
      selected_fitness_types: [],
      membership_types: [],
      sort_price: false,
      sort_type: null,
    };
    setTempFilters(reset);
    if (onReset) onReset();
  };

  const hasActiveFilters = useMemo(
    () =>
      !!tempFilters.state ||
      !!tempFilters.city ||
      !!tempFilters.area ||
      !!tempFilters.pincode ||
      tempFilters.no_cost_emi ||
      tempFilters.selected_fitness_types.length > 0 ||
      tempFilters.membership_types.length > 0 ||
      tempFilters.sort_price,
    [tempFilters],
  );

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (tempFilters.state) count++;
    if (tempFilters.city) count++;
    if (tempFilters.area) count++;
    if (tempFilters.pincode) count++;
    if (tempFilters.no_cost_emi) count++;
    count += tempFilters.selected_fitness_types.length;
    count += tempFilters.membership_types.length;
    if (tempFilters.sort_price) count++;
    return count;
  }, [tempFilters]);

  const SortBlock = () => (
    <>
      <Text style={styles.sortByHeader}>Sort by</Text>
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
    </>
  );

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
            <TouchableOpacity
              onPress={handleReset}
              disabled={!hasActiveFilters}
            >
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
          contentContainerStyle={{ paddingBottom: 200 }}
        >
          {/* Fitness Studio Type */}
          <Text style={styles.sectionHeader}>Fitness Studio Type</Text>
          <Text style={styles.sectionSubtitle}>
            Select the type of fitness facility you're looking for
          </Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.fitnessTypeScroll}
          >
            {FITNESS_TYPES.map((type) => {
              const selected = tempFilters.selected_fitness_types.includes(
                type.id,
              );
              return (
                <Pressable
                  key={type.id}
                  style={styles.fitnessTypeCard}
                  onPress={() => handleFitnessTypeToggle(type.id)}
                >
                  <View
                    style={[
                      styles.fitnessTypeIconBox,
                      selected && styles.fitnessTypeIconBoxSelected,
                    ]}
                  >
                    <Ionicons
                      name={type.icon}
                      size={26}
                      color={selected ? "#fff" : "#FF5757"}
                    />
                  </View>
                  <Text
                    style={[
                      styles.fitnessTypeCardText,
                      selected && styles.fitnessTypeCardTextSelected,
                    ]}
                  >
                    {type.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Location */}
          <Text style={styles.sectionHeader}>Location</Text>
          <Text style={styles.sectionSubtitle}>
            Narrow down your search by location
          </Text>
          <View style={styles.locationCard}>
            <FilterRow
              label="State"
              value={tempFilters.state}
              onPress={() => setActiveLocationField("state")}
              onClear={() => setTempFilters((prev) => ({ ...prev, state: "" }))}
            />
            <View style={styles.divider} />
            <FilterRow
              label="City"
              value={tempFilters.city}
              onPress={() => setActiveLocationField("city")}
              onClear={() => setTempFilters((prev) => ({ ...prev, city: "" }))}
            />
            <View style={styles.divider} />
            <FilterRow
              label="Area"
              value={tempFilters.area}
              onPress={() => setActiveLocationField("area")}
              onClear={() => setTempFilters((prev) => ({ ...prev, area: "" }))}
            />
            <View style={styles.divider} />
            <FilterRow
              label="Pincode"
              value={tempFilters.pincode}
              onPress={() => setActiveLocationField("pincode")}
              onClear={() =>
                setTempFilters((prev) => ({ ...prev, pincode: "" }))
              }
            />
          </View>

          {/* No Cost EMI Card */}
          <Pressable
            style={[
              styles.featureCard,
              tempFilters.no_cost_emi && styles.featureCardActive,
            ]}
            onPress={handleNoCostEmiToggle}
          >
            <View style={styles.featureCardLeft}>
              <Text style={styles.featureCardTitle}>No Cost EMI</Text>
              <Text style={styles.featureCardSubtitle}>
                Find gyms offering zero-interest EMI on membership & PT plans
              </Text>
            </View>
            <View
              style={[
                styles.featureCheckbox,
                tempFilters.no_cost_emi && styles.featureCheckboxChecked,
              ]}
            >
              {tempFilters.no_cost_emi && (
                <Ionicons name="checkmark" size={16} color="#fff" />
              )}
            </View>
          </Pressable>

          {/* Membership / PT Plans */}
          <Text style={[styles.sectionHeader, { marginTop: 15 }]}>
            Membership / PT Plans
          </Text>
          <Text style={styles.sectionSubtitle}>
            Select the type of membership or PT plan
          </Text>
          <View style={styles.sessionsGrid}>
            {MEMBERSHIP_TYPES.map((type) => {
              const selected = tempFilters.membership_types.includes(type.id);
              return (
                <Pressable
                  key={type.id}
                  style={[
                    styles.sessionChip,
                    selected && styles.sessionChipSelected,
                  ]}
                  onPress={() => handleMembershipTypeToggle(type.id)}
                >
                  <Text
                    style={[
                      styles.sessionChipText,
                      selected && styles.sessionChipTextSelected,
                    ]}
                  >
                    {type.name}
                  </Text>
                  {selected && (
                    <Ionicons name="checkmark" size={14} color="#fff" />
                  )}
                </Pressable>
              );
            })}
          </View>

          {/* Sort by */}
          <SortBlock />
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
              Apply Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Location picker modal */}
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
        <TouchableOpacity style={styles.clearBtn} onPress={onClear}>
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

  // Header
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
  resetText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#FF5757",
    minWidth: 70,
  },
  resetTextDisabled: { color: "#D1D5DB" },

  // Content
  content: { flex: 1 },
  sectionHeader: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 8,
    marginBottom: 8,
    marginHorizontal: 16,
  },
  sectionSubtitle: {
    fontSize: 12,
    color: "#9CA3AF",
    marginTop: -4,
    marginBottom: 8,
    marginHorizontal: 16,
  },

  // Fitness types
  fitnessTypeScroll: { paddingHorizontal: 12, paddingBottom: 8, gap: 10 },
  fitnessTypeCard: { alignItems: "center", width: 55 },
  fitnessTypeIconBox: {
    width: 45,
    height: 45,
    borderRadius: 12,
    backgroundColor: "#FFF0F0",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 6,
  },
  fitnessTypeIconBoxSelected: { backgroundColor: "#FF5757" },
  fitnessTypeCardText: {
    fontSize: 11,
    fontWeight: "500",
    color: "#374151",
    textAlign: "center",
  },
  fitnessTypeCardTextSelected: { color: "#FF5757", fontWeight: "700" },

  // Location card
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
    maxWidth: 120,
  },
  clearBtn: { padding: 4 },
  placeholderContainer: { flexDirection: "row", alignItems: "center", gap: 4 },
  placeholderText: { fontSize: 14, color: "#9CA3AF" },
  divider: { height: 1, backgroundColor: "#F3F4F6", marginLeft: 16 },

  // No Cost EMI card (same pattern as dailyPassCard in GymFilterModal)
  featureCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 16,
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    backgroundColor: "#fff",
  },
  featureCardActive: {
    borderColor: "#007BFF",
    backgroundColor: "#F0F7FF",
  },
  featureCardLeft: { flex: 1, marginRight: 12 },
  featureCardTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1F2937",
    marginBottom: 2,
  },
  featureCardSubtitle: { fontSize: 12, color: "#6B7280" },
  featureCheckbox: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 2,
    borderColor: "#D1D5DB",
    alignItems: "center",
    justifyContent: "center",
  },
  featureCheckboxChecked: {
    backgroundColor: "#007BFF",
    borderColor: "#007BFF",
  },

  // Membership chips (sessionsGrid pattern from GymFilterModal)
  sessionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 12,
    gap: 8,
  },
  sessionChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 6,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  sessionChipSelected: { backgroundColor: "#007BFF", borderColor: "#007BFF" },
  sessionChipText: { fontSize: 14, fontWeight: "500", color: "#374151" },
  sessionChipTextSelected: { color: "#fff" },

  // Sort by
  sortByHeader: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FF5757",
    marginTop: 16,
    marginBottom: 10,
    marginHorizontal: 16,
  },
  sortRow: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 4,
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

  // Bottom bar
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
    backgroundColor: "#007BFF",
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: "center",
  },
  applyButtonDisabled: { backgroundColor: "#E5E7EB" },
  applyButtonText: { fontSize: 16, fontWeight: "600", color: "#fff" },
});

export default GymFilterModal;
