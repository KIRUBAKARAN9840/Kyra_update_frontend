import React, { useState } from "react";
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
import { useRouter, useLocalSearchParams } from "expo-router";
import {
  updateGymMateProfileAPI,
  presignGymMatePhotoAPI,
} from "../../../services/clientApi";
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
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
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
  title: { fontSize: 16, fontWeight: "700", color: "#1A1A1A", marginBottom: 8 },
  option: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  optionText: { fontSize: 15, color: "#333333" },
  optionTextSelected: { color: "#FF5757", fontWeight: "600" },
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
  fullScreen: { flex: 1, backgroundColor: "#FFF" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  headerTitle: { fontSize: 17, fontWeight: "700", color: "#1A1A1A" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F7F7",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    paddingHorizontal: 12,
    height: 46,
    marginHorizontal: 16,
    marginVertical: 12,
    gap: 8,
  },
  searchInput: { flex: 1, fontSize: 15, color: "#333333" },
  listContent: { paddingHorizontal: 16, paddingBottom: 40 },
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
  metroChipSelected: { backgroundColor: "#FFF0F0", borderColor: "#FF5757" },
  metroChipText: { fontSize: 14, color: "#333333", fontWeight: "500" },
  metroChipTextSelected: { color: "#FF5757", fontWeight: "600" },
  cityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
  },
  cityRowText: { flex: 1, fontSize: 15, color: "#333333" },
  cityRowTextSelected: { color: "#FF5757", fontWeight: "600" },
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
  otherBtnText: { fontSize: 14, fontWeight: "600", color: "#FF5757" },
  emptyContainer: { paddingVertical: 40, alignItems: "center", gap: 10 },
  emptyText: { fontSize: 14, color: "#AAAAAA", textAlign: "center" },
  emptyOtherBtn: {
    marginTop: 8,
    backgroundColor: "#FFF0F0",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#FFD0D0",
  },
  emptyOtherBtnText: { fontSize: 14, fontWeight: "600", color: "#FF5757" },
  otherHint: { fontSize: 13, color: "#AAAAAA", marginBottom: 12 },
  confirmBtn: {
    marginTop: 16,
    backgroundColor: "#FF5757",
    borderRadius: 12,
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  confirmBtnText: { fontSize: 15, fontWeight: "700", color: "#FFF" },
});

// ─── Dropdown Field ────────────────────────────────────────────────────────────

const DropdownField = ({ label, value, placeholder, onPress }) => (
  <View style={s.fieldGroup}>
    <Text style={s.fieldLabel}>{label}</Text>
    <TouchableOpacity
      style={s.dropdownRow}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <Text style={value ? s.dropdownValue : s.dropdownPlaceholder}>
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
      style={s.photoBox}
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
        <View style={s.photoUploadingOverlay}>
          <ActivityIndicator size="small" color="#FF5757" />
        </View>
      )}
    </TouchableOpacity>
    {uri && !uploading && onRemove && (
      <TouchableOpacity style={s.photoRemoveBtn} onPress={onRemove}>
        <Ionicons name="close" size={14} color="#FFF" />
      </TouchableOpacity>
    )}
  </View>
);

// ─── Main ─────────────────────────────────────────────────────────────────────

const EditProfileMe = () => {
  const router = useRouter();
  const params = useLocalSearchParams();

  // Parse incoming params
  const initialInterests = (() => {
    try {
      return JSON.parse(params.activity_interests || "[]");
    } catch {
      return [];
    }
  })();

  const initialPhotos = (() => {
    try {
      return JSON.parse(params.photos || "[]");
    } catch {
      return [];
    }
  })();

  // Form state — pre-filled from params
  const [city, setCity] = useState(params.city || "");
  const [cityPickerVisible, setCityPickerVisible] = useState(false);
  const [fitnessGoal, setFitnessGoal] = useState(params.primary_goal || "");
  const [activityInterests, setActivityInterests] = useState(initialInterests);
  const [preferredTiming, setPreferredTiming] = useState(
    params.preferred_timing || "",
  );
  const [vibe, setVibe] = useState(params.gym_personality || "");
  const [bio, setBio] = useState(params.bio || "");

  // Photos: each slot is null | { cdn_url, s3_path } (existing) | { localUri, key, cdn_url } (new upload)
  const [photos, setPhotos] = useState(() => {
    const slots = [null, null, null];
    initialPhotos.forEach((p, i) => {
      if (i < 3) slots[i] = p;
    });
    return slots;
  });
  const [photoUploading, setPhotoUploading] = useState([false, false, false]);

  const [photoPickerIndex, setPhotoPickerIndex] = useState(null);
  const [activePicker, setActivePicker] = useState(null);
  const [multiPickerVisible, setMultiPickerVisible] = useState(false);
  const [saving, setSaving] = useState(false);

  // AI avatar picker
  const initialAvatars = (() => {
    try {
      return JSON.parse(params.default_avatars || "[]");
    } catch {
      return [];
    }
  })();
  const [defaultAvatars] = useState(initialAvatars);
  const [avatarPickerVisible, setAvatarPickerVisible] = useState(false);
  const [avatarPickerTargetIndex, setAvatarPickerTargetIndex] = useState(0);

  // Gender & default bios
  const [gender] = useState(params.gender || "");
  const [bioPickerVisible, setBioPickerVisible] = useState(false);

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

  const getPhotoUri = (p) => {
    if (!p) return null;
    return p.localUri || p.avatarUrl || p.cdn_url || null;
  };

  const selectAvatar = (avatarUrl) => {
    const updated = [...photos];
    updated[avatarPickerTargetIndex] = { localUri: avatarUrl, avatarUrl };
    setPhotos(updated);
    setAvatarPickerVisible(false);
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

  const uploadPhoto = async (index, asset) => {
    const uri = asset.uri;
    const uriParts = uri.split(".");
    const ext = uriParts[uriParts.length - 1].toLowerCase();
    const contentType = ext === "png" ? "image/png" : "image/jpeg";

    // Show local preview
    const updatedPhotos = [...photos];
    updatedPhotos[index] = { localUri: uri };
    setPhotos(updatedPhotos);

    const updatedUploading = [...photoUploading];
    updatedUploading[index] = true;
    setPhotoUploading(updatedUploading);

    try {
      const presignResp = await presignGymMatePhotoAPI([
        { display_order: index, content_type: contentType },
      ]);

      const slot = presignResp.data[0];
      const { upload, cdn_url } = slot;

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
        throw new Error("S3 upload failed");
      }

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

  const handleSave = async () => {
    // Build photo_paths: avatars use .avatarUrl, new uploads use .key, existing photos use .s3_path
    const photoPaths = photos
      .filter((p) => p !== null)
      .map((p) => p.avatarUrl || p.key || p.s3_path)
      .filter(Boolean);

    const payload = {
      city,
      primary_goal: fitnessGoal,
      activity_interests: activityInterests,
      preferred_timing: preferredTiming,
      gym_personality: vibe,
      bio: bio.trim() || null,
    };

    // Always send photo_paths so the API knows if photos were removed
    payload.photo_paths = photoPaths;

    setSaving(true);
    try {
      const res = await updateGymMateProfileAPI(payload);
      if (res?.status === 200) {
        showToast({
          type: "success",
          title: "Profile Updated",
          desc: "Your changes have been saved.",
        });
        router.back();
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: res?.message || "Could not update profile. Please try again.",
        });
      }
    } catch (err) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Could not update profile. Please try again.",
      });
    } finally {
      setSaving(false);
    }
  };

  const cfg = activePicker ? PICKERS[activePicker] : null;

  return (
    <View style={{ flex: 1, backgroundColor: "#FFF" }}>
      <SafeAreaView edges={["top"]} style={{ backgroundColor: "#FFF" }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity
            onPress={() => router.back()}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <Ionicons name="arrow-back" size={20} color="#888888" />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Edit Gym Mate Profile</Text>
          <View style={{ width: 20 }} />
        </View>
      </SafeAreaView>

      <SafeAreaView edges={["bottom"]} style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === "ios" ? "padding" : undefined}
        >
          <ScrollView
            contentContainerStyle={s.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {/* Photos */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>
                Your Photos <Text style={s.optionalTag}>(Optional)</Text>
              </Text>
              <Text style={s.fieldHint}>
                First photo will be your main profile photo
              </Text>
              <View style={s.photoGrid}>
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
              <View style={s.photoTip}>
                <Ionicons name="information-circle" size={14} color="#FF5757" />
                <Text style={s.photoTipText}>
                  Profiles with real photos have a higher chance of finding a
                  gym mate
                </Text>
              </View>
            </View>

            {/* Current City */}
            <DropdownField
              label="Current City"
              value={city}
              placeholder="Select your city"
              onPress={() => setCityPickerVisible(true)}
            />

            {/* Bio */}
            <View style={s.fieldGroup}>
              <View style={s.bioHeaderRow}>
                <Text style={[s.fieldLabel, { marginBottom: 0 }]}>
                  Fitness Bio <Text style={s.optionalTag}>(Optional)</Text>
                </Text>
                <TouchableOpacity
                  style={s.defaultBioBtn}
                  activeOpacity={0.7}
                  onPress={() => setBioPickerVisible(true)}
                >
                  <Ionicons name="sparkles" size={12} color="#FF5757" />
                  <Text style={s.defaultBioBtnText}>Use default</Text>
                </TouchableOpacity>
              </View>
              <View style={s.bioWrapper}>
                <TextInput
                  style={s.bioInput}
                  value={bio}
                  onChangeText={(t) => t.length <= 300 && setBio(t)}
                  placeholder="Tell gym mates about yourself, your routine, and what you're looking for in a workout partner..."
                  placeholderTextColor="#BBBBBB"
                  multiline
                  textAlignVertical="top"
                />
              </View>
              <Text style={s.charCount}>{bio.length}/300</Text>
            </View>

            {/* Fitness dropdowns */}
            <DropdownField
              label={PICKERS.fitnessGoal.label}
              value={fitnessGoal}
              placeholder={PICKERS.fitnessGoal.placeholder}
              onPress={() => setActivePicker("fitnessGoal")}
            />

            {/* Activity Interests — multi-select */}
            <View style={s.fieldGroup}>
              <Text style={s.fieldLabel}>Activity Interests</Text>
              <TouchableOpacity
                style={s.dropdownRow}
                onPress={() => setMultiPickerVisible(true)}
                activeOpacity={0.7}
              >
                <Text
                  style={
                    activityInterests.length > 0
                      ? s.dropdownValue
                      : s.dropdownPlaceholder
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
                <View style={s.chipRow}>
                  {activityInterests.map((a) => (
                    <TouchableOpacity
                      key={a}
                      style={s.chip}
                      onPress={() => toggleActivityInterest(a)}
                      activeOpacity={0.7}
                    >
                      <Text style={s.chipText}>{a}</Text>
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
              style={[s.saveButton, saving && { opacity: 0.7 }]}
              onPress={handleSave}
              activeOpacity={0.85}
              disabled={saving}
            >
              {saving ? (
                <ActivityIndicator color="#FFF" />
              ) : (
                <Text style={s.saveButtonText}>Save Changes</Text>
              )}
            </TouchableOpacity>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* City picker modal */}
      <CityPickerModal
        visible={cityPickerVisible}
        selected={city}
        onSelect={setCity}
        onClose={() => setCityPickerVisible(false)}
      />

      {/* Dropdown picker modal */}
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

      {/* Multi-select picker */}
      <MultiPickerModal
        visible={multiPickerVisible}
        title="Activity Interests"
        options={ACTIVITY_OPTIONS}
        selected={activityInterests}
        onToggle={toggleActivityInterest}
        onClose={() => setMultiPickerVisible(false)}
      />

      {/* Photo picker sheet */}
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
            renderItem={({ item }) => {
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

export default EditProfileMe;

// ─── Styles ───────────────────────────────────────────────────────────────────

const s = StyleSheet.create({
  // Header
  header: {
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: "#F0F0F0",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
  },

  // Scroll
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 24,
    paddingBottom: Platform.OS === "ios" ? 100 : 60,
  },

  // Field
  fieldGroup: { marginBottom: 20 },
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

  // Dropdown
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
  dropdownPlaceholder: { fontSize: 14, color: "#BBBBBB", flex: 1 },
  dropdownValue: {
    fontSize: 14,
    color: "#1A1A1A",
    fontWeight: "600",
    flex: 1,
  },

  // Chips
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

  // Photo grid
  photoGrid: { flexDirection: "row", gap: 10 },
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

  // Photo tip
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

  // Bio
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

  // Save button
  saveButton: {
    backgroundColor: "#FF5757",
    borderRadius: 14,
    height: 54,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8,
    shadowColor: "#FF5757",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: 0.3,
  },
});

// ─── Photo Picker Sheet Styles ────────────────────────────────────────────────

const ps = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: "rgba(0,0,0,0.45)" },
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
  optionText: { flex: 1 },
  optionLabel: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
    marginBottom: 2,
  },
  optionSub: { fontSize: 12, color: "#AAAAAA" },
  cancelBtn: {
    marginTop: 16,
    height: 50,
    borderRadius: 12,
    backgroundColor: "#F5F5F5",
    alignItems: "center",
    justifyContent: "center",
  },
  cancelText: { fontSize: 15, fontWeight: "600", color: "#888888" },
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
    paddingHorizontal: 16,
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
