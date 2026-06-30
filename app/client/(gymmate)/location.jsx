import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  ActivityIndicator,
} from "react-native";
import { useRouter, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Location from "expo-location";
import { getCachedLocation } from "../../../services/locationCache";
import axiosInstance from "../../../services/axiosInstance";
import { showToast } from "../../../utils/Toaster";

// ─── Cities ────────────────────────────────────────────────────────────────────

const POPULAR_CITIES = [
  {
    label: "Bengaluru",
    value: "Bangalore",
    image: require("../../../assets/images/gym_mate/bengaluru.webp"),
  },
  {
    label: "Delhi",
    value: "Delhi(NCR)",
    image: require("../../../assets/images/gym_mate/delhi.webp"),
  },
  {
    label: "Mumbai",
    value: "Mumbai",
    image: require("../../../assets/images/gym_mate/mumbai.webp"),
  },

  {
    label: "Hyderabad",
    value: "Hyderabad",
    image: require("../../../assets/images/gym_mate/hyderabad.webp"),
  },
  {
    label: "Chennai",
    value: "Chennai",
    image: require("../../../assets/images/gym_mate/chennai.webp"),
  },
  {
    label: "Pune",
    value: "Pune",
    image: require("../../../assets/images/gym_mate/pune.webp"),
  },
  {
    label: "Kolkata",
    value: "Kolkata",
    image: require("../../../assets/images/gym_mate/kolkata.webp"),
  },
  {
    label: "Ahmedabad",
    value: "Ahmedabad",
    image: require("../../../assets/images/gym_mate/ahmedabad.webp"),
  },
];

const ALL_CITIES = [
  "Bangalore",
  "Delhi(NCR)",
  "Mumbai",
  "Hyderabad",
  "Chennai",
  "Kolkata",
  "Pune",
  "Ahmedabad",
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

// ─── Component ─────────────────────────────────────────────────────────────────

const LocationScreen = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const { goal, activities, vibe, preferredTiming } = useLocalSearchParams();

  const [searchText, setSearchText] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [locating, setLocating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const filteredCities = searchText.trim()
    ? ALL_CITIES.filter((c) =>
        c.toLowerCase().startsWith(searchText.trim().toLowerCase()),
      )
    : [];

  const handleSelectCity = (cityName) => {
    setSelectedCity(cityName);
    setSearchText("");
  };

  const handleUseCurrentLocation = async () => {
    setLocating(true);
    try {
      const coords = await getCachedLocation();
      if (!coords) {
        showToast({
          type: "error",
          title: "Location Error",
          desc: "Could not get your location. Please select a city manually.",
        });
        setLocating(false);
        return;
      }
      const geoResults = await Location.reverseGeocodeAsync({
        latitude: coords.lat,
        longitude: coords.lng,
      });
      const city =
        geoResults?.[0]?.city ||
        geoResults?.[0]?.subregion ||
        geoResults?.[0]?.region ||
        "";
      if (city) {
        setSelectedCity(city);
      } else {
        showToast({
          type: "error",
          title: "Location Error",
          desc: "Could not detect your city. Please select manually.",
        });
      }
    } catch {
      showToast({
        type: "error",
        title: "Location Error",
        desc: "Something went wrong. Please select a city manually.",
      });
    } finally {
      setLocating(false);
    }
  };

  const submitOnboarding = async (city) => {
    setSubmitting(true);
    try {
      const parsedActivities = activities ? JSON.parse(activities) : [];

      const { data } = await axiosInstance.post(
        "/api/v2/gym_mate/profile/onboarding/step1",
        {
          city,
          primary_goal: goal,
          activity_interests: parsedActivities,
          preferred_timing: preferredTiming,
          gym_personality: vibe,
        },
      );

      if (
        data?.default_avatars?.length ||
        data?.data?.next_step === 2 ||
        data?.status === 200
      ) {
        router.replace({
          pathname: "/client/(gymmate)/profilecreated",
          params: {
            default_avatars: data?.default_avatars
              ? JSON.stringify(data.default_avatars)
              : undefined,
            gender: data?.gender || undefined,
          },
        });
      }
    } catch (err) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Could not save your profile. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Main View ────────────────────────────────────────────────────────────────

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Back button */}
      <TouchableOpacity
        style={styles.backBtn}
        onPress={() => router.back()}
        activeOpacity={0.7}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Ionicons name="arrow-back" size={24} color="#1A1A1A" />
      </TouchableOpacity>

      <ScrollView
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + (selectedCity ? 130 : 24) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {/* Header */}
        <View style={styles.topSection}>
          <Text style={styles.stepLabel}>Step 5 of 5</Text>
          <Text style={styles.title}>Select Your City</Text>
        </View>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <Ionicons name="search" size={18} color="#AAAAAA" />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for your city"
            placeholderTextColor="#BBBBBB"
            value={searchText}
            onChangeText={setSearchText}
            autoCorrect={false}
          />
          {searchText.length > 0 && (
            <TouchableOpacity onPress={() => setSearchText("")}>
              <Ionicons name="close-circle" size={18} color="#CCCCCC" />
            </TouchableOpacity>
          )}
        </View>

        {searchText.trim() ? (
          /* Search results */
          <View>
            {filteredCities.map((item) => (
              <TouchableOpacity
                key={item}
                style={styles.cityRow}
                onPress={() => handleSelectCity(item)}
                activeOpacity={0.7}
                disabled={submitting}
              >
                <Ionicons name="location-outline" size={18} color="#9CA3AF" />
                <Text style={styles.cityRowText}>{item}</Text>
              </TouchableOpacity>
            ))}
            {filteredCities.length === 0 && (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>
                  No city found for "{searchText.trim()}"
                </Text>
                <TouchableOpacity
                  style={styles.manualBtn}
                  onPress={() => handleSelectCity(searchText.trim())}
                  activeOpacity={0.7}
                  disabled={!searchText.trim() || submitting}
                >
                  <Text style={styles.manualBtnText}>
                    Use "{searchText.trim()}" as my city
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ) : (
          /* Default view */
          <>
            {/* Use Current Location */}
            <TouchableOpacity
              style={styles.locationCard}
              activeOpacity={0.8}
              onPress={handleUseCurrentLocation}
              disabled={locating || submitting}
            >
              <View style={styles.locationIconBox}>
                <Ionicons name="navigate" size={20} color="#FF5757" />
              </View>
              <View style={styles.locationTextBox}>
                <Text style={styles.locationTitle}>Use Current Location</Text>
                <Text style={styles.locationSub}>
                  Allow access to auto-detect your city
                </Text>
              </View>
              {locating ? (
                <ActivityIndicator size="small" color="#FF5757" />
              ) : (
                <Ionicons name="chevron-forward" size={18} color="#D1D5DB" />
              )}
            </TouchableOpacity>

            {/* Popular Cities */}
            <View style={styles.popularHeader}>
              <Text style={styles.popularTitle}>Popular Cities</Text>
              <Text style={styles.popularCount}>
                {POPULAR_CITIES.length} cities
              </Text>
            </View>

            <View style={styles.cityGrid}>
              {POPULAR_CITIES.map((c) => {
                const isSelected = selectedCity === c.value;
                return (
                  <TouchableOpacity
                    key={c.value}
                    style={[
                      styles.cityCard,
                      isSelected && styles.cityCardSelected,
                    ]}
                    activeOpacity={0.8}
                    onPress={() => handleSelectCity(c.value)}
                    disabled={submitting}
                  >
                    <Image
                      source={c.image}
                      style={styles.cityImage}
                      resizeMode="contain"
                    />
                    <View style={styles.cityLabelRow}>
                      {isSelected && <View style={styles.redDot} />}
                      <Text
                        style={[
                          styles.cityLabel,
                          isSelected && styles.cityLabelSelected,
                        ]}
                      >
                        {c.label}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* All Cities */}
            <View style={styles.allCitiesSection}>
              <Text style={styles.allCitiesTitle}>All Cities</Text>
            </View>
            {ALL_CITIES.filter(
              (c) => !POPULAR_CITIES.some((p) => p.value === c),
            ).map((item) => {
              const isSelected = selectedCity === item;
              return (
                <TouchableOpacity
                  key={item}
                  style={styles.cityRow}
                  onPress={() => handleSelectCity(item)}
                  activeOpacity={0.7}
                  disabled={submitting}
                >
                  <Ionicons
                    name="location-outline"
                    size={18}
                    color={isSelected ? "#FF5757" : "#9CA3AF"}
                  />
                  <Text
                    style={[
                      styles.cityRowText,
                      isSelected && styles.cityRowTextSelected,
                    ]}
                  >
                    {item}
                  </Text>
                  {isSelected && <View style={styles.redDot} />}
                </TouchableOpacity>
              );
            })}
          </>
        )}
      </ScrollView>

      {/* Selected city + Create Profile button */}
      {selectedCity ? (
        <View style={[styles.bottomBar, { paddingBottom: insets.bottom + 16 }]}>
          <View style={styles.selectedCityRow}>
            <Ionicons name="location" size={18} color="#FF5757" />
            <Text style={styles.selectedCityText}>{selectedCity}</Text>
            <TouchableOpacity
              onPress={() => setSelectedCity("")}
              hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
              <Ionicons name="close-circle" size={18} color="#9CA3AF" />
            </TouchableOpacity>
          </View>
          <TouchableOpacity
            style={[styles.createBtn, submitting && { opacity: 0.6 }]}
            activeOpacity={0.85}
            onPress={() => submitOnboarding(selectedCity)}
            disabled={submitting}
          >
            {submitting ? (
              <ActivityIndicator size="small" color="#FFF" />
            ) : (
              <Text style={styles.createBtnText}>Create Profile</Text>
            )}
          </TouchableOpacity>
        </View>
      ) : null}

      {submitting && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color="#FF5757" />
        </View>
      )}
    </View>
  );
};

export default LocationScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  backBtn: {
    alignSelf: "flex-start",
    marginTop: 12,
    marginLeft: 20,
  },
  scrollContent: {
    paddingHorizontal: 20,
  },
  topSection: {
    paddingTop: 10,
    paddingBottom: 10,
    alignItems: "center",
  },
  stepLabel: {
    fontSize: 14,
    color: "#9CA3AF",
    fontWeight: "400",
    marginBottom: 10,
  },
  title: {
    fontSize: 26,
    fontWeight: "800",
    color: "#111827",
    marginBottom: 24,
    letterSpacing: -0.5,
    textAlign: "center",
    lineHeight: 36,
  },

  // Search
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F7F7F7",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#EEEEEE",
    paddingHorizontal: 14,
    height: 48,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: "#333333",
  },

  // Use Current Location
  locationCard: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFF7F0",
    borderRadius: 16,
    paddingVertical: 16,
    paddingHorizontal: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: "#FFE8D6",
  },
  locationIconBox: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: "#FFF",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FFE0D0",
  },
  locationTextBox: {
    flex: 1,
    marginLeft: 14,
  },
  locationTitle: {
    fontSize: 15,
    fontWeight: "700",
    color: "#FF5757",
    marginBottom: 2,
  },
  locationSub: {
    fontSize: 12,
    color: "#9CA3AF",
  },

  // Popular Cities
  popularHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  popularTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
  },
  popularCount: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  cityGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    rowGap: 12,
  },
  cityCard: {
    width: "23%",
    alignItems: "center",
    marginBottom: 4,
  },
  cityImage: {
    width: 56,
    height: 56,
    marginBottom: 6,
  },
  cityLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 4,
  },
  cityLabel: {
    fontSize: 11,
    fontWeight: "500",
    color: "#374151",
    textAlign: "center",
  },
  cityLabelSelected: {
    color: "#FF5757",
    fontWeight: "700",
  },
  cityCardSelected: {
    backgroundColor: "#FFF5F5",
    borderRadius: 12,
  },
  redDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: "#FF5757",
  },

  // All Cities section
  allCitiesSection: {
    marginTop: 28,
    marginBottom: 8,
  },
  allCitiesTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1A1A1A",
  },

  // City row (search results / all cities list)
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
  emptyContainer: {
    paddingVertical: 32,
    alignItems: "center",
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: "#AAAAAA",
    textAlign: "center",
  },
  manualBtn: {
    marginTop: 8,
    backgroundColor: "#FFF0F0",
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#FFD0D0",
  },
  manualBtnText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#FF5757",
  },

  // Bottom bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 20,
    paddingTop: 14,
    backgroundColor: "#FFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  selectedCityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 12,
  },
  selectedCityText: {
    flex: 1,
    fontSize: 15,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  createBtn: {
    backgroundColor: "#FF5757",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  createBtnText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "700",
  },

  // Loading overlay
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.7)",
    justifyContent: "center",
    alignItems: "center",
  },
});
