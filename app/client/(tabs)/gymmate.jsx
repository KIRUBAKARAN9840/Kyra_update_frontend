import React, { useState, useCallback, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  Platform,
  KeyboardAvoidingView,
  Dimensions,
  Modal,
  FlatList,
  TextInput,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, Feather } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useFocusEffect } from "@react-navigation/native";
import { useLocalSearchParams, useRouter } from "expo-router";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withRepeat,
  Easing,
  interpolate,
  FadeIn,
  FadeOut,
} from "react-native-reanimated";
import GymMateMain from "../../../components/ui/GymMateMain";
import axiosInstance from "../../../services/axiosInstance";
import { showToast } from "../../../utils/Toaster";

const { width } = Dimensions.get("window");

// ─── Picker Modal (single-select) ──────────────────────────────────────────────

const PickerModal = ({
  visible,
  title,
  options,
  selected,
  onSelect,
  onClose,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <TouchableOpacity style={pm.backdrop} activeOpacity={1} onPress={onClose} />
    <SafeAreaView edges={["bottom"]} style={pm.sheet}>
      <View style={pm.handle} />
      <Text style={pm.title}>{title}</Text>
      <FlatList
        data={options}
        keyExtractor={(item) => item}
        renderItem={({ item }) => {
          const isSelected = selected === item;
          return (
            <TouchableOpacity
              style={pm.option}
              onPress={() => {
                onSelect(item);
                onClose();
              }}
              activeOpacity={0.7}
            >
              <Text
                style={[pm.optionText, isSelected && pm.optionTextSelected]}
              >
                {item}
              </Text>
              {isSelected && (
                <Ionicons name="checkmark" size={18} color="#FF5757" />
              )}
            </TouchableOpacity>
          );
        }}
      />
    </SafeAreaView>
  </Modal>
);

const pm = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 40,
    maxHeight: "55%",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  optionText: {
    fontSize: 15,
    color: "#333333",
  },
  optionTextSelected: {
    color: "#FF5757",
    fontWeight: "600",
  },
});

// ─── Multi-Select Picker Modal ──────────────────────────────────────────────────

const MultiPickerModal = ({
  visible,
  title,
  options,
  selected,
  onToggle,
  onClose,
}) => (
  <Modal
    visible={visible}
    transparent
    animationType="slide"
    onRequestClose={onClose}
  >
    <TouchableOpacity style={pm.backdrop} activeOpacity={1} onPress={onClose} />
    <SafeAreaView edges={["bottom"]} style={pm.sheet}>
      <View style={pm.handle} />
      <Text style={pm.title}>{title}</Text>
      <FlatList
        data={options}
        keyExtractor={(item) => item}
        renderItem={({ item }) => {
          const isSelected = selected.includes(item);
          return (
            <TouchableOpacity
              style={pm.option}
              onPress={() => onToggle(item)}
              activeOpacity={0.7}
            >
              <Text
                style={[pm.optionText, isSelected && pm.optionTextSelected]}
              >
                {item}
              </Text>
              {isSelected && (
                <Ionicons name="checkmark" size={18} color="#FF5757" />
              )}
            </TouchableOpacity>
          );
        }}
      />
      <TouchableOpacity
        style={mpm.doneBtn}
        onPress={onClose}
        activeOpacity={0.85}
      >
        <Text style={mpm.doneBtnText}>Done</Text>
      </TouchableOpacity>
    </SafeAreaView>
  </Modal>
);

const mpm = StyleSheet.create({
  doneBtn: {
    marginTop: 12,
    backgroundColor: "#FF5757",
    borderRadius: 12,
    height: 48,
    alignItems: "center",
    justifyContent: "center",
  },
  doneBtnText: {
    color: "#FFF",
    fontWeight: "700",
    fontSize: 15,
  },
});

// ─── Indian Cities ─────────────────────────────────────────────────────────────

const METRO_CITIES = [
  "Bangalore",
  "Delhi(NCR)",
  "Mumbai",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
];

const TIER_2_3_CITIES = [
  "Agra",
  "Ajmer",
  "Aligarh",
  "Allahabad",
  "Ambala",
  "Amravati",
  "Amritsar",
  "Anand",
  "Aurangabad",
  "Bareilly",
  "Belgaum",
  "Bhagalpur",
  "Bharatpur",
  "Bhavnagar",
  "Bhilai",
  "Bhopal",
  "Bhubaneswar",
  "Bikaner",
  "Bilaspur",
  "Bokaro",
  "Chandigarh",
  "Coimbatore",
  "Cuttack",
  "Dehradun",
  "Dhanbad",
  "Durgapur",
  "Erode",
  "Faridabad",
  "Firozabad",
  "Ghaziabad",
  "Gorakhpur",
  "Gulbarga",
  "Guntur",
  "Gurgaon",
  "Guwahati",
  "Gwalior",
  "Hubli",
  "Imphal",
  "Indore",
  "Jabalpur",
  "Jaipur",
  "Jalandhar",
  "Jalgaon",
  "Jammu",
  "Jamnagar",
  "Jamshedpur",
  "Jhansi",
  "Jodhpur",
  "Junagadh",
  "Kakinada",
  "Kannur",
  "Kanpur",
  "Karnal",
  "Kochi",
  "Kolar",
  "Kolhapur",
  "Kollam",
  "Kota",
  "Kozhikode",
  "Kurnool",
  "Lucknow",
  "Ludhiana",
  "Madurai",
  "Mangalore",
  "Mathura",
  "Meerut",
  "Moradabad",
  "Muzaffarnagar",
  "Muzaffarpur",
  "Mysore",
  "Nagpur",
  "Nanded",
  "Nashik",
  "Nellore",
  "Noida",
  "Patiala",
  "Patna",
  "Pondicherry",
  "Raipur",
  "Rajahmundry",
  "Rajkot",
  "Ranchi",
  "Rohtak",
  "Rourkela",
  "Saharanpur",
  "Salem",
  "Sangli",
  "Shimla",
  "Siliguri",
  "Solapur",
  "Srinagar",
  "Surat",
  "Thanjavur",
  "Tenkasi",
  "Thiruvananthapuram",
  "Thrissur",
  "Tumkur",
  "Tiruchirappalli",
  "Tirunelveli",
  "Tirupati",
  "Tiruppur",
  "Udaipur",
  "Ujjain",
  "Vadodara",
  "Varanasi",
  "Vellore",
  "Vijayawada",
  "Visakhapatnam",
  "Warangal",
];

const ALL_CITIES = [...METRO_CITIES, ...TIER_2_3_CITIES];

// ─── City Picker Modal ────────────────────────────────────────────────────────

const CityPickerModal = ({ visible, selected, onSelect, onClose }) => {
  const [searchText, setSearchText] = useState("");
  const [showOtherInput, setShowOtherInput] = useState(false);
  const [otherCity, setOtherCity] = useState("");

  const filteredCities = searchText.trim()
    ? ALL_CITIES.filter((c) =>
        c.toLowerCase().startsWith(searchText.trim().toLowerCase()),
      )
    : [];

  const handleSelectCity = (cityName) => {
    onSelect(cityName);
    setSearchText("");
    setShowOtherInput(false);
    setOtherCity("");
    onClose();
  };

  const handleOtherSubmit = () => {
    const trimmed = otherCity.trim();
    if (trimmed) {
      handleSelectCity(trimmed);
    }
  };

  const handleClose = () => {
    setSearchText("");
    setShowOtherInput(false);
    setOtherCity("");
    onClose();
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <SafeAreaView edges={["top", "bottom"]} style={cityStyles.fullScreen}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          {/* Header */}
          <View style={cityStyles.header}>
            <TouchableOpacity
              onPress={handleClose}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="arrow-back" size={22} color="#1A1A1A" />
            </TouchableOpacity>
            <Text style={cityStyles.headerTitle}>Select Your City</Text>
            <View style={{ width: 22 }} />
          </View>

          {/* Search Input */}
          <View style={cityStyles.searchContainer}>
            <Ionicons name="search" size={18} color="#AAAAAA" />
            <TextInput
              style={cityStyles.searchInput}
              placeholder="Search for your city..."
              placeholderTextColor="#BBBBBB"
              value={showOtherInput ? otherCity : searchText}
              onChangeText={showOtherInput ? setOtherCity : setSearchText}
              autoCorrect={false}
              autoFocus={showOtherInput}
            />
            {(showOtherInput ? otherCity : searchText).length > 0 && (
              <TouchableOpacity
                onPress={() =>
                  showOtherInput ? setOtherCity("") : setSearchText("")
                }
              >
                <Ionicons name="close-circle" size={18} color="#CCCCCC" />
              </TouchableOpacity>
            )}
          </View>

          {!showOtherInput ? (
            searchText.trim() ? (
              /* Search Results */
              <FlatList
                data={filteredCities}
                keyExtractor={(item) => item}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={cityStyles.listContent}
                renderItem={({ item }) => {
                  const isSelected = selected === item;
                  return (
                    <TouchableOpacity
                      style={cityStyles.cityRow}
                      onPress={() => handleSelectCity(item)}
                      activeOpacity={0.7}
                    >
                      <Ionicons
                        name="location-outline"
                        size={18}
                        color={isSelected ? "#FF5757" : "#AAAAAA"}
                      />
                      <Text
                        style={[
                          cityStyles.cityRowText,
                          isSelected && cityStyles.cityRowTextSelected,
                        ]}
                      >
                        {item}
                      </Text>
                      {isSelected && (
                        <Ionicons name="checkmark" size={18} color="#FF5757" />
                      )}
                    </TouchableOpacity>
                  );
                }}
                ListEmptyComponent={
                  <View style={cityStyles.emptyContainer}>
                    <Ionicons name="search-outline" size={32} color="#DDDDDD" />
                    <Text style={cityStyles.emptyText}>
                      No city found for "{searchText.trim()}"
                    </Text>
                    <TouchableOpacity
                      style={cityStyles.emptyOtherBtn}
                      onPress={() => {
                        setOtherCity(searchText.trim());
                        setSearchText("");
                        setShowOtherInput(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={cityStyles.emptyOtherBtnText}>
                        Enter city manually
                      </Text>
                    </TouchableOpacity>
                  </View>
                }
              />
            ) : (
              /* Default: Metro cities + Other */
              <ScrollView
                showsVerticalScrollIndicator={false}
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={cityStyles.listContent}
              >
                <Text style={cityStyles.sectionLabel}>Suggested</Text>
                <View style={cityStyles.metroGrid}>
                  {METRO_CITIES.map((c) => {
                    const isSelected = selected === c;
                    return (
                      <TouchableOpacity
                        key={c}
                        style={[
                          cityStyles.metroChip,
                          isSelected && cityStyles.metroChipSelected,
                        ]}
                        onPress={() => handleSelectCity(c)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            cityStyles.metroChipText,
                            isSelected && cityStyles.metroChipTextSelected,
                          ]}
                        >
                          {c}
                        </Text>
                        {isSelected && (
                          <Ionicons
                            name="checkmark"
                            size={14}
                            color="#FF5757"
                          />
                        )}
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={cityStyles.sectionLabel}>
                  Can't find your city?
                </Text>
                <TouchableOpacity
                  style={cityStyles.otherBtn}
                  onPress={() => setShowOtherInput(true)}
                  activeOpacity={0.7}
                >
                  <Ionicons
                    name="add-circle-outline"
                    size={20}
                    color="#FF5757"
                  />
                  <Text style={cityStyles.otherBtnText}>
                    Enter city manually
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            )
          ) : (
            /* Other city — suggestions from the list as they type */
            <FlatList
              data={
                otherCity.trim().length >= 2
                  ? ALL_CITIES.filter((c) =>
                      c.toLowerCase().includes(otherCity.trim().toLowerCase()),
                    ).slice(0, 10)
                  : []
              }
              keyExtractor={(item) => item}
              keyboardShouldPersistTaps="handled"
              contentContainerStyle={cityStyles.listContent}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={cityStyles.cityRow}
                  onPress={() => handleSelectCity(item)}
                  activeOpacity={0.7}
                >
                  <Ionicons name="location-outline" size={18} color="#AAAAAA" />
                  <Text style={cityStyles.cityRowText}>{item}</Text>
                </TouchableOpacity>
              )}
              ListHeaderComponent={
                <Text style={cityStyles.otherHint}>
                  Type to search, or confirm your custom city below
                </Text>
              }
              ListFooterComponent={
                <TouchableOpacity
                  style={[
                    cityStyles.confirmBtn,
                    !otherCity.trim() && { opacity: 0.45 },
                  ]}
                  onPress={handleOtherSubmit}
                  activeOpacity={0.85}
                  disabled={!otherCity.trim()}
                >
                  <Text style={cityStyles.confirmBtnText}>
                    Confirm "{otherCity.trim() || "..."}"
                  </Text>
                </TouchableOpacity>
              }
            />
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
};

const cityStyles = StyleSheet.create({
  fullScreen: {
    flex: 1,
    backgroundColor: "#FFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    paddingHorizontal: 12,
    height: 46,
    marginHorizontal: 16,
    marginVertical: 12,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#333333",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 40,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#AAAAAA",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginBottom: 12,
    marginTop: 4,
  },
  metroGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 24,
  },
  metroChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#F7F7F7",
    borderRadius: 8,
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#EEEEEE",
  },
  metroChipSelected: {
    backgroundColor: "#FFF0F0",
    borderColor: "#FF5757",
  },
  metroChipText: {
    fontSize: 14,
    color: "#333333",
    fontWeight: "500",
  },
  metroChipTextSelected: {
    color: "#FF5757",
    fontWeight: "600",
  },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  cityRowText: {
    flex: 1,
    fontSize: 15,
    color: "#333333",
  },
  cityRowTextSelected: {
    color: "#FF5757",
    fontWeight: "600",
  },
  otherBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#FFF0F0",
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#FFD0D0",
  },
  otherBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF5757",
  },
  emptyContainer: {
    paddingVertical: 40,
    alignItems: "center",
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: "#AAAAAA",
    textAlign: "center",
  },
  emptyOtherBtn: {
    marginTop: 8,
    backgroundColor: "#FFF0F0",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#FFD0D0",
  },
  emptyOtherBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF5757",
  },
  otherHint: {
    fontSize: 13,
    color: "#AAAAAA",
    marginBottom: 12,
  },
  confirmBtn: {
    marginTop: 16,
    backgroundColor: "#FF5757",
    borderRadius: 12,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FFF",
  },
});

// ─── Dropdown Field ────────────────────────────────────────────────────────────

const DropdownField = ({ label, value, placeholder, onPress }) => (
  <View style={styles.fieldGroup}>
    <Text style={styles.fieldLabel}>{label}</Text>
    <TouchableOpacity
      style={styles.dropdownRow}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={value ? styles.dropdownValue : styles.dropdownPlaceholder}>
        {value || placeholder}
      </Text>
      <Ionicons name="chevron-down" size={18} color="#AAAAAA" />
    </TouchableOpacity>
  </View>
);

// ─── Photo Box ─────────────────────────────────────────────────────────────────

const PhotoBox = ({ uri, onPress, uploading, onRemove }) => (
  <View style={{ flex: 1 }}>
    <TouchableOpacity
      style={styles.photoBox}
      onPress={onPress}
      activeOpacity={0.8}
      disabled={uploading}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={StyleSheet.absoluteFill}
          resizeMode="cover"
        />
      ) : (
        <Ionicons name="camera-outline" size={28} color="#BBBBBB" />
      )}
      {uploading && (
        <View style={styles.photoUploadingOverlay}>
          <ActivityIndicator size="small" color="#FF5757" />
        </View>
      )}
    </TouchableOpacity>
    {uri && !uploading && onRemove && (
      <TouchableOpacity style={styles.photoRemoveBtn} onPress={onRemove}>
        <Ionicons name="close" size={14} color="#FFF" />
      </TouchableOpacity>
    )}
  </View>
);

// ─── Success Overlay ──────────────────────────────────────────────────────────

function RippleRing({ delay, maxSize }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      delay,
      withRepeat(
        withTiming(1, { duration: 2400, easing: Easing.out(Easing.cubic) }),
        -1,
        false,
      ),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => {
    const size = interpolate(progress.value, [0, 1], [0, maxSize]);
    const opacity = interpolate(progress.value, [0, 0.12, 1], [0, 0.55, 0]);
    return {
      width: size,
      height: size,
      borderRadius: size / 2,
      opacity,
    };
  });

  return (
    <Animated.View
      style={[
        {
          position: "absolute",
          borderWidth: 1.5,
          borderColor: "#FFFFFF",
        },
        animStyle,
      ]}
    />
  );
}

const DEFAULT_AVATAR = require("../../../assets/images/defaultavatar.webp");

const PROFILE_SIZE = 52;
const screenH = Dimensions.get("window").height;

// Positions are placed around but AWAY from center (sides + above the icon)
// The icon circle is at roughly center of screen. We place profiles in an
// arc spanning the upper-left, top, and upper-right zone only, plus far sides.
const SLOT_POSITIONS = [
  // batch 0 — upper arc
  { x: -110, y: -160 },
  { x: 10, y: -200 },
  { x: 120, y: -145 },
  // batch 1 — sides
  { x: -130, y: -60 },
  { x: 140, y: -50 },
  { x: -80, y: -220 },
  // batch 2 — scattered upper
  { x: 70, y: -230 },
  { x: -140, y: -130 },
  { x: 130, y: -170 },
];

const FloatingProfile = ({ person, position, index, onPress }) => {
  const scale = useSharedValue(0);

  useEffect(() => {
    const stagger = index * 250;
    scale.value = withDelay(
      stagger,
      withTiming(1, { duration: 350, easing: Easing.out(Easing.back(1.4)) }),
    );
  }, []);

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: scale.value,
  }));

  const avatarSource = person.avatar_url
    ? { uri: person.avatar_url }
    : DEFAULT_AVATAR;

  return (
    <Animated.View
      style={[
        successStyles.floatingProfile,
        {
          left: width / 2 + position.x - PROFILE_SIZE / 2,
          top: screenH / 2 + position.y - PROFILE_SIZE / 2,
        },
        animStyle,
      ]}
    >
      <TouchableOpacity activeOpacity={0.8} onPress={() => onPress?.(person)}>
        <View style={successStyles.profileLocationPin}>
          <Image source={avatarSource} style={successStyles.profileAvatar} />
          <View style={successStyles.pinTail} />
        </View>
        <Text style={successStyles.profileName} numberOfLines={1}>
          {person.name}
        </Text>
      </TouchableOpacity>
    </Animated.View>
  );
};

const ProfileBatch = ({ people, batchIndex, onProfilePress }) => (
  <Animated.View
    entering={FadeIn.duration(400)}
    exiting={FadeOut.duration(400)}
    style={StyleSheet.absoluteFill}
    pointerEvents="box-none"
  >
    {people.map((person, i) => (
      <FloatingProfile
        key={person.name + batchIndex + i}
        person={person}
        position={SLOT_POSITIONS[batchIndex * 3 + i]}
        index={i}
        onPress={onProfilePress}
      />
    ))}
  </Animated.View>
);

const SuccessOverlay = ({ onDone, suggestedMates = [] }) => {
  const router = useRouter();
  const iconScale = useSharedValue(0);
  const contentOpacity = useSharedValue(0);
  const contentY = useSharedValue(20);
  const [currentBatch, setCurrentBatch] = useState(0);

  const totalBatches = Math.ceil(suggestedMates.length / 3) || 1;

  useEffect(() => {
    iconScale.value = withDelay(
      300,
      withTiming(1, { duration: 600, easing: Easing.out(Easing.back(2)) }),
    );
    contentOpacity.value = withDelay(
      600,
      withTiming(1, { duration: 500, easing: Easing.out(Easing.quad) }),
    );
    contentY.value = withDelay(
      600,
      withTiming(0, { duration: 500, easing: Easing.out(Easing.quad) }),
    );
  }, []);

  useEffect(() => {
    if (currentBatch >= totalBatches - 1) return;
    const timer = setTimeout(() => {
      setCurrentBatch((b) => b + 1);
    }, 5000);
    return () => clearTimeout(timer);
  }, [currentBatch, totalBatches]);

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  const contentAnimStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
    transform: [{ translateY: contentY.value }],
  }));

  const batchPeople = suggestedMates.slice(
    currentBatch * 3,
    currentBatch * 3 + 3,
  );

  const handleProfilePress = (person) => {
    router.push({
      pathname: "/client/(gymmate)/profilemate",
      params: { client_id: person.client_id },
    });
  };

  return (
    <View style={successStyles.container}>
      <View style={successStyles.ringsContainer} pointerEvents="none">
        <RippleRing delay={0} maxSize={380} />
        <RippleRing delay={800} maxSize={380} />
        <RippleRing delay={1600} maxSize={380} />
      </View>

      {batchPeople.length > 0 && (
        <ProfileBatch
          key={currentBatch}
          people={batchPeople}
          batchIndex={currentBatch}
          onProfilePress={handleProfilePress}
        />
      )}

      <View style={successStyles.centerContent}>
        <Animated.View style={[successStyles.iconCircle, iconAnimStyle]}>
          <Ionicons name="checkmark-done" size={40} color="#FFF" />
        </Animated.View>

        <Animated.View style={[successStyles.textBlock, contentAnimStyle]}>
          <Text style={successStyles.title}>You're All Set!</Text>
          <Text style={successStyles.subtitle}>
            Your profile is ready. Start finding gym mates who match your vibe!
          </Text>
        </Animated.View>
      </View>

      <Animated.View style={[successStyles.btnWrapper, contentAnimStyle]}>
        <TouchableOpacity
          style={successStyles.btn}
          activeOpacity={0.85}
          onPress={onDone}
        >
          <Text style={successStyles.btnText}>Let's Go</Text>
        </TouchableOpacity>
      </Animated.View>
    </View>
  );
};

const successStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#101828",
    justifyContent: "center",
    alignItems: "center",
  },
  ringsContainer: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "center",
    alignItems: "center",
  },
  centerContent: {
    alignItems: "center",
    paddingHorizontal: 40,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderWidth: 2,
    borderColor: "rgba(255,255,255,0.3)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 32,
  },
  textBlock: {
    alignItems: "center",
  },
  title: {
    fontSize: 28,
    fontWeight: "800",
    color: "#FFFFFF",
    marginBottom: 14,
    textAlign: "center",
    letterSpacing: -0.5,
  },
  subtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.65)",
    textAlign: "center",
    lineHeight: 23,
  },
  btnWrapper: {
    position: "absolute",
    bottom: 150,
    left: 32,
    right: 32,
  },
  btn: {
    backgroundColor: "#FFFFFF",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  btnText: {
    color: "#101828",
    fontSize: 16,
    fontWeight: "700",
  },
  floatingProfile: {
    position: "absolute",
    alignItems: "center",
    width: PROFILE_SIZE + 10,
  },
  profileLocationPin: {
    alignItems: "center",
  },
  profileAvatar: {
    width: PROFILE_SIZE,
    height: PROFILE_SIZE,
    borderRadius: PROFILE_SIZE / 2,
    borderWidth: 2.5,
    borderColor: "#FF5757",
  },
  pinTail: {
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderTopWidth: 10,
    borderLeftColor: "transparent",
    borderRightColor: "transparent",
    borderTopColor: "#FF5757",
    marginTop: -1,
  },
  profileName: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
    marginTop: 4,
    textAlign: "center",
  },
});

// ─── New User Setup Form ───────────────────────────────────────────────────────

const NewUserForm = ({ initialStep = 1, onComplete }) => {
  const router = useRouter();
  const [step, setStep] = useState(initialStep);
  const [showSuccess, setShowSuccess] = useState(false);
  const [suggestedMates, setSuggestedMates] = useState([]);

  // Step 1
  const [city, setCity] = useState("");
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const [fitnessGoal, setFitnessGoal] = useState("");
  const [activityInterests, setActivityInterests] = useState([]); // multi-select array
  const [preferredTiming, setPreferredTiming] = useState("");
  const [vibe, setVibe] = useState("");
  const [step1Loading, setStep1Loading] = useState(false);

  // Step 2
  const [photos, setPhotos] = useState([null, null, null]);
  const [photoUploading, setPhotoUploading] = useState([false, false, false]);
  const [bio, setBio] = useState("");

  // Photo picker sheet
  const [photoPickerIndex, setPhotoPickerIndex] = useState(null);

  // AI avatar picker
  const [defaultAvatars, setDefaultAvatars] = useState([]);
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);
  const [avatarPickerTargetIndex, setAvatarPickerTargetIndex] = useState(0);

  // Gender & default bios
  const [gender, setGender] = useState("");
  const [bioPickerVisible, setBioPickerVisible] = useState(false);

  // Active picker key
  const [activePicker, setActivePicker] = useState(null);
  const [multiPickerVisible, setMultiPickerVisible] = useState(false);

  const ACTIVITY_OPTIONS = [
    "Gymming",
    "Body Building",
    "Weight Lifting",
    "Cardio",
    "Yoga",
    "CrossFit",
    "Cycling",
    "Running",
    "Swimming",
    "Martial Arts",
    "Pilates",
    "HIIT",
    "Calisthenics",
    "Zumba",
  ];

  const PICKERS = {
    fitnessGoal: {
      label: "Your Fitness Goal",
      placeholder: "Select your goal",
      options: [
        "Weight Loss",
        "Weight Gain",
        "Muscle Building",
        "Stay Fit",
        "Improve Endurance",
        "Flexibility & Mobility",
        "Athletic Performance",
        "Stress Relief",
      ],
      value: fitnessGoal,
      setter: setFitnessGoal,
    },
    preferredTiming: {
      label: "Preferred Timing",
      placeholder: "When do you work out?",
      options: ["Morning ", "Evening", "Flexible"],
      value: preferredTiming,
      setter: setPreferredTiming,
    },
    vibe: {
      label: "Vibe Selector",
      placeholder: "What's your gym personality?",
      options: [
        "Friendly & Social",
        "Beginner-friendly",
        "Chill & Relaxed",
        "Motivator",
        "Competitive",
        "Serious & Focused",
        "No-nonsense",
      ],
      value: vibe,
      setter: setVibe,
    },
  };

  const DEFAULT_BIOS = {
    male: [
      "Gym is my happy place honestly. Looking for someone who's just as consistent and doesn't flake.",
      "Trying to stay fit and have fun doing it. Would be great to have a gym buddy to vibe with.",
      "Been going solo for a while now. Need a partner who keeps things fun and shows up regularly.",
      "Fitness is a lifestyle for me not just a phase. Hit me up if you're on the same page.",
      "Just want someone to train with and keep each other motivated. Let's make the gym less boring lol.",
    ],
    female: [
      "Gym girl who just wants a consistent workout buddy. Let's keep each other accountable and have fun.",
      "Fitness keeps me sane honestly. Looking for someone positive to train with and push each other.",
      "Morning person who loves the gym. Would be nice to have a buddy who actually shows up on time haha.",
      "Working on myself one day at a time. Need a gym partner who's chill and keeps things fun.",
      "Love staying active and trying new things. Looking for someone who's down to train together regularly.",
    ],
  };

  const getDefaultBios = () => {
    return DEFAULT_BIOS[gender] || DEFAULT_BIOS.male;
  };

  const toggleActivityInterest = (item) => {
    setActivityInterests((prev) =>
      prev.includes(item) ? prev.filter((i) => i !== item) : [...prev, item],
    );
  };

  const openCamera = async (index) => {
    setPhotoPickerIndex(null);
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== "granted") {
      showToast({
        type: "error",
        title: "Permission Required",
        desc: "Camera access is needed to take a photo.",
      });
      return;
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      await uploadPhoto(index, result.assets[0]);
    }
  };

  const openGallery = async (index) => {
    setPhotoPickerIndex(null);
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== "granted") {
      showToast({
        type: "error",
        title: "Permission Required",
        desc: "Gallery access is needed to select a photo.",
      });
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });
    if (!result.canceled) {
      await uploadPhoto(index, result.assets[0]);
    }
  };

  // Upload a single photo: presign → S3 POST → store cdn_url
  const uploadPhoto = async (index, asset) => {
    const uri = asset.uri;
    const uriParts = uri.split(".");
    const ext = uriParts[uriParts.length - 1].toLowerCase();
    const contentType = ext === "png" ? "image/png" : "image/jpeg";

    // Show local preview immediately
    const updatedPhotos = [...photos];
    updatedPhotos[index] = uri;
    setPhotos(updatedPhotos);

    // Mark slot as uploading
    const updatedUploading = [...photoUploading];
    updatedUploading[index] = true;
    setPhotoUploading(updatedUploading);

    try {
      // 1. Get presigned URL
      const { data: presignResp } = await axiosInstance.post(
        "/api/v2/gym_mate/profile/photos/presign",
        {
          slots: [{ display_order: index, content_type: contentType }],
        },
      );

      const slot = presignResp.data[0];
      const { upload, cdn_url } = slot;

      // 2. Upload to S3 via multipart/form-data POST
      const form = new FormData();
      Object.entries(upload.fields).forEach(([k, v]) => form.append(k, v));
      form.append("file", {
        uri,
        name: upload.fields.key.split("/").pop(),
        type: contentType,
      });

      const s3Resp = await fetch(upload.url, {
        method: "POST",
        body: form,
      });

      if (!s3Resp.ok && s3Resp.status !== 204) {
        const errText = await s3Resp.text();

        throw new Error("S3 upload failed");
      }

      // 3. Store key + cdn_url for submission; keep local uri as preview
      const finalPhotos = [...photos];
      finalPhotos[index] = {
        localUri: uri,
        cdnUrl: cdn_url,
        key: upload.fields.key,
      };
      setPhotos(finalPhotos);
    } catch (err) {
      showToast({
        type: "error",
        title: "Upload Failed",
        desc: "Could not upload photo. Please try again.",
      });
      const revert = [...photos];
      revert[index] = null;
      setPhotos(revert);
    } finally {
      const done = [...photoUploading];
      done[index] = false;
      setPhotoUploading(done);
    }
  };

  const removePhoto = (index) => {
    const updated = [...photos];
    updated[index] = null;
    setPhotos(updated);
  };

  const selectAvatar = (avatarUrl) => {
    const updated = [...photos];
    updated[avatarPickerTargetIndex] = { localUri: avatarUrl, avatarUrl };
    setPhotos(updated);
    setAvatarPickerVisible(false);
  };

  const handleContinue = async () => {
    setStep1Loading(true);
    try {
      const { data } = await axiosInstance.post(
        "/api/v2/gym_mate/profile/onboarding/step1",
        {
          city,
          primary_goal: fitnessGoal,
          activity_interests: activityInterests,
          preferred_timing: preferredTiming,
          gym_personality: vibe,
        },
      );

      if (data?.default_avatars?.length) {
        setDefaultAvatars(data.default_avatars);
      }
      if (data?.gender) {
        setGender(data.gender);
      }
      if (data?.data?.next_step === 2 || data?.status === 200) {
        setStep(2);
      }
    } catch (err) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Could not save your profile. Please try again.",
      });
    } finally {
      setStep1Loading(false);
    }
  };

  const [step2Loading, setStep2Loading] = useState(false);

  const handleSubmit = async () => {
    const photoPaths = photos
      .filter((p) => p && typeof p === "object")
      .map((p) => p.avatarUrl || p.key)
      .filter(Boolean);

    setStep2Loading(true);
    try {
      const { data } = await axiosInstance.post(
        "/api/v2/gym_mate/profile/onboarding/step2",
        {
          photo_paths: photoPaths,
          bio: bio.trim() || null,
        },
      );

      if (data?.data?.onboarding_completed) {
        router.replace("/client/(gymmate)/profilecreated");
      }
    } catch (err) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Could not complete onboarding. Please try again.",
      });
    } finally {
      setStep2Loading(false);
    }
  };

  const cfg = activePicker ? PICKERS[activePicker] : null;

  const getPhotoUri = (p) => {
    if (!p) return null;
    if (typeof p === "string") return p;
    return p.localUri;
  };

  if (showSuccess) {
    return (
      <SuccessOverlay onDone={onComplete} suggestedMates={suggestedMates} />
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#FFF" }}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: "#FFF" }}>
        {/* White Header */}
        <View style={styles.header}>
          {/* Step label row */}
          <View style={styles.stepLabelRow}>
            {step === 2 ? (
              <TouchableOpacity
                onPress={() => setStep(1)}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="arrow-back" size={20} color="#888888" />
              </TouchableOpacity>
            ) : (
              <View style={{ width: 20 }} />
            )}
            <Text style={styles.stepLabel}>Step {step} of 2</Text>
            <View style={{ width: 20 }} />
          </View>

          {/* Centered title */}
          <Text style={styles.headerTitle}>
            {step === 1
              ? "Create Your Fitness Profile"
              : "Profile Photos & Bio"}
          </Text>
          <Text style={styles.headerSubtitle}>
            {step === 1
              ? "Help us find people who match your fitness vibe"
              : "Show the real you to your gym mates"}
          </Text>
        </View>
      </SafeAreaView>

      <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentInsetAdjustmentBehavior="automatic"
          >
            {step === 1 ? (
              <>
                <DropdownField
                  label="Current City"
                  value={city}
                  placeholder="Select your city"
                  onPress={() => setCityPickerVisible(true)}
                />

                <DropdownField
                  label={PICKERS.fitnessGoal.label}
                  value={fitnessGoal}
                  placeholder={PICKERS.fitnessGoal.placeholder}
                  onPress={() => setActivePicker("fitnessGoal")}
                />

                {/* Activity Interests — multi-select */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>Activity Interests</Text>
                  <TouchableOpacity
                    style={styles.dropdownRow}
                    onPress={() => setMultiPickerVisible(true)}
                    activeOpacity={0.7}
                  >
                    <Text
                      style={
                        activityInterests.length > 0
                          ? styles.dropdownValue
                          : styles.dropdownPlaceholder
                      }
                      numberOfLines={1}
                    >
                      {activityInterests.length > 0
                        ? activityInterests.join(", ")
                        : "Select your activities"}
                    </Text>
                    <Ionicons name="chevron-down" size={18} color="#AAAAAA" />
                  </TouchableOpacity>
                  {activityInterests.length > 0 && (
                    <View style={styles.chipRow}>
                      {activityInterests.map((a) => (
                        <TouchableOpacity
                          key={a}
                          style={styles.chip}
                          onPress={() => toggleActivityInterest(a)}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.chipText}>{a}</Text>
                          <Ionicons name="close" size={12} color="#FF5757" />
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>

                <DropdownField
                  label={PICKERS.preferredTiming.label}
                  value={preferredTiming}
                  placeholder={PICKERS.preferredTiming.placeholder}
                  onPress={() => setActivePicker("preferredTiming")}
                />
                <DropdownField
                  label={PICKERS.vibe.label}
                  value={vibe}
                  placeholder={PICKERS.vibe.placeholder}
                  onPress={() => setActivePicker("vibe")}
                />

                <TouchableOpacity
                  style={[
                    styles.redButton,
                    (!city ||
                      !fitnessGoal ||
                      activityInterests.length === 0 ||
                      !preferredTiming ||
                      !vibe ||
                      step1Loading) && { opacity: 0.45 },
                  ]}
                  onPress={handleContinue}
                  activeOpacity={0.85}
                  disabled={
                    !city ||
                    !fitnessGoal ||
                    activityInterests.length === 0 ||
                    !preferredTiming ||
                    !vibe ||
                    step1Loading
                  }
                >
                  {step1Loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <>
                      <Text style={styles.redButtonText}>Continue</Text>
                      <Feather
                        name="arrow-right"
                        size={18}
                        color="#FFF"
                        style={{ marginLeft: 8 }}
                      />
                    </>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Photos */}
                <View style={styles.fieldGroup}>
                  <Text style={styles.fieldLabel}>
                    Add Your Photos{" "}
                    <Text style={styles.optionalTag}>(Optional)</Text>
                  </Text>
                  <Text style={styles.fieldHint}>
                    First photo will be your main profile photo
                  </Text>
                  <View style={styles.photoGrid}>
                    <PhotoBox
                      uri={getPhotoUri(photos[0])}
                      onPress={() => setPhotoPickerIndex(0)}
                      uploading={photoUploading[0]}
                      onRemove={() => removePhoto(0)}
                    />
                    <PhotoBox
                      uri={getPhotoUri(photos[1])}
                      onPress={() => setPhotoPickerIndex(1)}
                      uploading={photoUploading[1]}
                      onRemove={() => removePhoto(1)}
                    />
                    <PhotoBox
                      uri={getPhotoUri(photos[2])}
                      onPress={() => setPhotoPickerIndex(2)}
                      uploading={photoUploading[2]}
                      onRemove={() => removePhoto(2)}
                    />
                  </View>

                  <View style={styles.photoTip}>
                    <Ionicons
                      name="information-circle"
                      size={14}
                      color="#FF5757"
                    />
                    <Text style={styles.photoTipText}>
                      Profiles with real photos have a higher chance of finding
                      a gym mate
                    </Text>
                  </View>
                </View>

                {/* Bio */}
                <View style={styles.fieldGroup}>
                  <View style={styles.bioHeaderRow}>
                    <Text style={[styles.fieldLabel, { marginBottom: 0 }]}>
                      Fitness Bio{" "}
                      <Text style={styles.optionalTag}>(Optional)</Text>
                    </Text>
                    <TouchableOpacity
                      style={styles.defaultBioBtn}
                      activeOpacity={0.7}
                      onPress={() => setBioPickerVisible(true)}
                    >
                      <Ionicons name="sparkles" size={12} color="#FF5757" />
                      <Text style={styles.defaultBioBtnText}>Use default</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={styles.bioWrapper}>
                    <TextInput
                      style={styles.bioInput}
                      value={bio}
                      onChangeText={(t) => t.length <= 300 && setBio(t)}
                      placeholder="Tell gym mates about yourself, your routine, and what you're looking for in a workout partner..."
                      placeholderTextColor="#BBBBBB"
                      multiline
                      textAlignVertical="top"
                    />
                  </View>
                  <Text style={styles.charCount}>{bio.length}/300</Text>
                </View>

                <TouchableOpacity
                  style={[styles.redButton, step2Loading && { opacity: 0.7 }]}
                  onPress={handleSubmit}
                  activeOpacity={0.85}
                  disabled={step2Loading}
                >
                  {step2Loading ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.redButtonText}>Start Connecting</Text>
                  )}
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      <CityPickerModal
        visible={cityPickerVisible}
        selected={city}
        onSelect={setCity}
        onClose={() => setCityPickerVisible(false)}
      />

      {cfg && (
        <PickerModal
          visible={!!activePicker}
          title={cfg.label}
          options={cfg.options}
          selected={cfg.value}
          onSelect={cfg.setter}
          onClose={() => setActivePicker(null)}
        />
      )}

      <MultiPickerModal
        visible={multiPickerVisible}
        title="Activity Interests"
        options={ACTIVITY_OPTIONS}
        selected={activityInterests}
        onToggle={toggleActivityInterest}
        onClose={() => setMultiPickerVisible(false)}
      />

      {/* Custom Photo Picker Sheet */}
      <Modal
        visible={photoPickerIndex !== null}
        transparent
        animationType="slide"
        onRequestClose={() => setPhotoPickerIndex(null)}
      >
        <TouchableOpacity
          style={ps.backdrop}
          activeOpacity={1}
          onPress={() => setPhotoPickerIndex(null)}
        />
        <SafeAreaView edges={["bottom"]} style={ps.sheet}>
          <View style={ps.handle} />
          <Text style={ps.title}>Add Photo</Text>

          <TouchableOpacity
            style={ps.option}
            activeOpacity={0.7}
            onPress={() => openCamera(photoPickerIndex)}
          >
            <View style={ps.iconWrap}>
              <Ionicons name="camera-outline" size={22} color="#FF5757" />
            </View>
            <View style={ps.optionText}>
              <Text style={ps.optionLabel}>Take Photo</Text>
              <Text style={ps.optionSub}>Use your camera</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CCCCCC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={ps.option}
            activeOpacity={0.7}
            onPress={() => openGallery(photoPickerIndex)}
          >
            <View style={ps.iconWrap}>
              <Ionicons name="image-outline" size={22} color="#FF5757" />
            </View>
            <View style={ps.optionText}>
              <Text style={ps.optionLabel}>Choose from Gallery</Text>
              <Text style={ps.optionSub}>Pick from your photos</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CCCCCC" />
          </TouchableOpacity>

          {defaultAvatars.length > 0 && (
            <TouchableOpacity
              style={ps.option}
              activeOpacity={0.7}
              onPress={() => {
                setAvatarPickerTargetIndex(photoPickerIndex);
                setPhotoPickerIndex(null);
                setAvatarPickerVisible(true);
              }}
            >
              <View style={ps.iconWrap}>
                <Ionicons name="sparkles-outline" size={22} color="#FF5757" />
              </View>
              <View style={ps.optionText}>
                <Text style={ps.optionLabel}>Use AI Generated Images</Text>
                <Text style={ps.optionSub}>Pick from curated avatars</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CCCCCC" />
            </TouchableOpacity>
          )}

          <TouchableOpacity
            style={ps.cancelBtn}
            activeOpacity={0.7}
            onPress={() => setPhotoPickerIndex(null)}
          >
            <Text style={ps.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      {/* AI Avatar Picker Modal */}
      <Modal
        visible={avatarPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setAvatarPickerVisible(false)}
      >
        <TouchableOpacity
          style={avs.backdrop}
          activeOpacity={1}
          onPress={() => setAvatarPickerVisible(false)}
        />
        <SafeAreaView edges={["bottom"]} style={avs.sheet}>
          <View style={avs.handle} />
          <Text style={avs.title}>Choose an Avatar</Text>
          <Text style={avs.subtitle}>Select an AI generated profile image</Text>
          <FlatList
            data={defaultAvatars}
            keyExtractor={(item) => String(item.sno)}
            numColumns={4}
            contentContainerStyle={avs.grid}
            columnWrapperStyle={avs.gridRow}
            renderItem={({ item, index }) => {
              const isSelected = photos.some(
                (p) =>
                  p &&
                  typeof p === "object" &&
                  p.avatarUrl === item.profile_url,
              );
              return (
                <TouchableOpacity
                  style={[avs.avatarBox, isSelected && avs.avatarBoxSelected]}
                  activeOpacity={0.7}
                  onPress={() => selectAvatar(item.profile_url)}
                >
                  <Image
                    source={{ uri: item.profile_url }}
                    style={avs.avatarImage}
                    resizeMode="cover"
                  />
                  {isSelected && (
                    <View style={avs.avatarCheck}>
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#FF5757"
                      />
                    </View>
                  )}
                </TouchableOpacity>
              );
            }}
          />
          <TouchableOpacity
            style={avs.cancelBtn}
            activeOpacity={0.7}
            onPress={() => setAvatarPickerVisible(false)}
          >
            <Text style={avs.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>

      {/* Default Bio Picker Modal */}
      <Modal
        visible={bioPickerVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setBioPickerVisible(false)}
      >
        <TouchableOpacity
          style={bps.backdrop}
          activeOpacity={1}
          onPress={() => setBioPickerVisible(false)}
        />
        <SafeAreaView edges={["bottom"]} style={bps.sheet}>
          <View style={bps.handle} />
          <Text style={bps.title}>Pick a Bio</Text>
          <Text style={bps.subtitle}>Tap to use — you can edit it later</Text>
          <ScrollView showsVerticalScrollIndicator={false}>
            {getDefaultBios().map((text, idx) => (
              <TouchableOpacity
                key={idx}
                style={[bps.bioOption, bio === text && bps.bioOptionSelected]}
                activeOpacity={0.7}
                onPress={() => {
                  setBio(text);
                  setBioPickerVisible(false);
                }}
              >
                <Text style={bps.bioOptionText}>{text}</Text>
                {bio === text && (
                  <Ionicons
                    name="checkmark-circle"
                    size={18}
                    color="#FF5757"
                    style={{ marginTop: 6 }}
                  />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
          <TouchableOpacity
            style={bps.cancelBtn}
            activeOpacity={0.7}
            onPress={() => setBioPickerVisible(false)}
          >
            <Text style={bps.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </SafeAreaView>
      </Modal>
    </View>
  );
};

// ─── Root ─────────────────────────────────────────────────────────────────────

const GymMate = () => {
  const { openConnections, connectionsTab } = useLocalSearchParams();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [onboardingCompleted, setOnboardingCompleted] = useState(false);
  const [initialStep, setInitialStep] = useState(1);

  useFocusEffect(
    useCallback(() => {
      let active = true;
      const checkStatus = async () => {
        try {
          const { data } = await axiosInstance.get(
            "/api/v2/gym_mate/profile/onboarding/status",
          );

          if (!active) return;
          const { onboarding_completed, next_step } = data.data;

          setOnboardingCompleted(onboarding_completed);
          if (!onboarding_completed) {
            setInitialStep(next_step === 2 ? 2 : 1);
          }
        } catch (err) {
          if (active) setOnboardingCompleted(false);
        } finally {
          if (active) setLoading(false);
        }
      };
      checkStatus();
      return () => {
        active = false;
      };
    }, []),
  );

  if (loading) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#FFFFFF",
        }}
      >
        <ActivityIndicator size="large" color="#FF5757" />
      </View>
    );
  }

  if (!onboardingCompleted) {
    return (
      <View style={landingStyles.container}>
        {/* Top hero image */}
        <Image
          source={require("../../../assets/images/gym_mate/profile_top.webp")}
          style={landingStyles.heroImage}
          resizeMode="contain"
        />

        {/* Title image */}
        <Image
          source={require("../../../assets/images/gym_mate/profile_bottom.webp")}
          style={landingStyles.titleImage}
          resizeMode="contain"
        />

        {/* Button */}
        <TouchableOpacity
          style={landingStyles.button}
          activeOpacity={0.85}
          onPress={() => router.push("/client/(gymmate)/goal")}
        >
          <Image
            source={require("../../../assets/images/gym_mate/icon_connect.png")}
            style={landingStyles.buttonIcon}
            resizeMode="contain"
          />
          <Text style={landingStyles.buttonText}>Start Matching</Text>
        </TouchableOpacity>

        <Text style={landingStyles.subtitle}>Takes less than 20 seconds</Text>
      </View>
    );
  }

  return (
    <GymMateMain
      openConnections={openConnections === "true"}
      connectionsTab={connectionsTab ? Number(connectionsTab) : undefined}
    />
  );
};

export default GymMate;

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  // ── Header ──
  header: {
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    alignItems: "center",
  },
  stepLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    marginBottom: 14,
  },
  stepLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FF5757",
    textAlign: "center",
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: "800",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 6,
  },
  headerSubtitle: {
    fontSize: 13,
    color: "#888888",
    fontWeight: "400",
    textAlign: "center",
    marginBottom: 4,
    lineHeight: 18,
  },

  // ── Scroll ──
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: Platform.OS === "ios" ? 100 : 300,
  },

  // ── Field ──
  fieldGroup: {
    marginBottom: 20,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 8,
  },
  optionalTag: {
    fontSize: 11,
    fontWeight: "400",
    color: "#AAAAAA",
  },
  fieldHint: {
    fontSize: 12,
    color: "#AAAAAA",
    marginBottom: 10,
    marginTop: -4,
  },

  // ── Dropdown ──
  dropdownRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#F7F7F7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    height: 52,
    paddingHorizontal: 16,
  },
  dropdownPlaceholder: {
    fontSize: 14,
    color: "#BBBBBB",
    flex: 1,
  },
  dropdownValue: {
    fontSize: 14,
    color: "#1A1A1A",
    fontWeight: "600",
    flex: 1,
  },

  // ── Chips (multi-select) ──
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 10,
  },
  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF0F0",
    borderRadius: 20,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#FFD0D0",
  },
  chipText: {
    fontSize: 12,
    color: "#FF5757",
    fontWeight: "600",
  },

  // ── Photo Tip ──
  photoTip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginTop: 10,
    backgroundColor: "#FFF0F0",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  photoTipText: {
    flex: 1,
    fontSize: 12,
    color: "#FF5757",
    lineHeight: 17,
    fontWeight: "500",
  },

  // ── Photo Grid & Box ──
  photoGrid: {
    flexDirection: "row",
    gap: 10,
  },
  photoBox: {
    flex: 1,
    aspectRatio: 1,
    backgroundColor: "#F2F2F2",
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  photoRemoveBtn: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: "#FF5757",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  photoUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.6)",
    alignItems: "center",
    justifyContent: "center",
  },

  // ── Bio ──
  bioHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 8,
  },
  defaultBioBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFF0F0",
    borderRadius: 16,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#FFD0D0",
  },
  defaultBioBtnText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#FF5757",
  },
  bioWrapper: {
    backgroundColor: "#F7F7F7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    paddingHorizontal: 14,
    paddingVertical: 12,
    height: 130,
  },
  bioInput: {
    flex: 1,
    fontSize: 14,
    color: "#333333",
    textAlignVertical: "top",
  },
  charCount: {
    fontSize: 11,
    color: "#AAAAAA",
    textAlign: "right",
    marginTop: 4,
  },

  // ── Button ──
  redButton: {
    backgroundColor: "#FF5757",
    borderRadius: 14,
    height: 54,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#FF5757",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  redButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: 0.3,
  },
});

// ─── Photo Picker Sheet Styles ────────────────────────────────────────────────

const ps = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 20,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 16,
  },
  option: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F5F5F5",
    gap: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FFF0F0",
    alignItems: "center",
    justifyContent: "center",
  },
  optionText: {
    flex: 1,
  },
  optionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  optionSub: {
    fontSize: 12,
    color: "#AAAAAA",
  },
  cancelBtn: {
    marginTop: 16,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#888888",
  },
});

// ─── Avatar Picker Sheet Styles ───────────────────────────────────────────────

const avs = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
    paddingBottom: 36,
    maxHeight: "65%",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#AAAAAA",
    marginBottom: 16,
  },
  grid: {
    paddingBottom: 8,
  },
  gridRow: {
    gap: 10,
    marginBottom: 10,
  },
  avatarBox: {
    width: (width - 40 - 30) / 4,
    aspectRatio: 1,
    borderRadius: 12,
    overflow: "hidden",
    borderWidth: 2,
    borderColor: "#F0F0F0",
  },
  avatarBoxSelected: {
    borderColor: "#FF5757",
  },
  avatarImage: {
    width: "100%",
    height: "100%",
  },
  avatarCheck: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#FFF",
    borderRadius: 10,
  },
  cancelBtn: {
    marginTop: 12,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#888888",
  },
});

// ─── Bio Picker Sheet Styles ──────────────────────────────────────────────────

const bps = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 14,
    paddingBottom: 36,
    maxHeight: "60%",
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: "#E0E0E0",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
    marginBottom: 16,
  },
  title: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#AAAAAA",
    marginBottom: 16,
  },
  bioOption: {
    backgroundColor: "#F7F7F7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
  },
  bioOptionSelected: {
    borderColor: "#FF5757",
    backgroundColor: "#FFF0F0",
  },
  bioOptionText: {
    flex: 1,
    fontSize: 13,
    color: "#333333",
    lineHeight: 19,
  },
  cancelBtn: {
    marginTop: 8,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: {
    fontSize: 15,
    fontWeight: "600",
    color: "#888888",
  },
});

// ─── Landing Page Styles ──────────────────────────────────────────────────────

const landingStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  heroImage: {
    width: width * 0.9,
    height: width * 0.9,
    marginBottom: 8,
  },
  titleImage: {
    width: width * 0.8,
    height: width * 0.4,
    marginBottom: 24,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#FF5757",
    paddingVertical: 12,
    paddingHorizontal: 50,
    borderRadius: 12,
    marginBottom: 6,
    gap: 10,
  },
  buttonIcon: {
    width: 22,
    height: 22,
    tintColor: "#FFFFFF",
  },
  buttonText: {
    color: "#FFFFFF",
    fontSize: 17,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 13,
    color: "#999999",
    fontWeight: "400",
  },
});
