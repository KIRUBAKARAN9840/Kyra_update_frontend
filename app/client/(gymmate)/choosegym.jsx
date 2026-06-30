import React, {
  useState,
  useLayoutEffect,
  useRef,
  useMemo,
  useCallback,
  useEffect,
} from "react";
import * as Location from "expo-location";
import {
  StyleSheet,
  Text,
  View,
  TouchableOpacity,
  Dimensions,
  ActivityIndicator,
  Linking,
  Modal,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useRouter, useFocusEffect, useLocalSearchParams } from "expo-router";
import { BackHandler } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  getDailyPassGymsAPI,
  getGymDetail,
  createGymMateSessionAPI,
} from "../../../services/clientApi";
import { handlePay } from "../../../components/ui/Payment/gymmatepassfn";
import { showToast } from "../../../utils/Toaster";
import { FlashList } from "@shopify/flash-list";
import { MaskedText, MaskedIcon } from "../../../components/ui/MaskedText";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import {
  getCachedLocation,
  peekPermissionStatus,
  refreshPermissionStatus,
  clearLocationCache,
  getLocationOverride,
} from "../../../services/locationCache";
import DailyPassSearchModal from "../../../components/ui/DailyPass/DailyPassSearchModal";
import DailyPassFilterModal from "../../../components/ui/DailyPass/DailyPassFilterModal";
import GymDetailModal from "../../../components/ui/DailyPass/GymDetailModal";

const { width } = Dimensions.get("window");
const ITEMS_PER_PAGE = 10;

const normalizeGym = (gym) => ({
  id: gym.gym_id,
  gym_id: gym.gym_id,
  name: gym.gym_name,
  area: gym.area || "",
  image:
    gym.cover_pic ||
    "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/Gym_Studios/default_gym_mage.png",
  dailyPass: gym.dailypass_price != null,
  dailyPassPrice: gym.dailypass_price || null,
  discountPrice: gym.dailypass_price || null,
  distance_km: gym.distance_km || null,
  views: gym.views || 0,
  frequently_booked: gym.frequently_booked || false,
});

// ─── Main Component ───────────────────────────────────────────
const ChooseGym = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const flowParams = useLocalSearchParams();

  const [gyms, setGyms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [apiLoading, setApiLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [gymDetailModalVisible, setGymDetailModalVisible] = useState(false);
  const [gymDetailData, setGymDetailData] = useState(null);
  const [gymDetailLoading, setGymDetailLoading] = useState(false);
  const [gymDetailItem, setGymDetailItem] = useState(null);
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [locationArea, setLocationArea] = useState("");
  const [locationDenied, setLocationDenied] = useState(false);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const [selectedGym, setSelectedGym] = useState(null);
  const [selectedFromSearch, setSelectedFromSearch] = useState(false);
  const [optionsSheetItem, setOptionsSheetItem] = useState(null);
  const [creatingSession, setCreatingSession] = useState(false);
  const [paymentModal, setPaymentModal] = useState({
    visible: false,
    success: false,
    data: null,
    loading: false,
  });

  const paymentInProgress = useRef(false);
  const locationFetchedRef = useRef(false);
  const searchDebounceRef = useRef(null);
  const flatListRef = useRef(null);
  const scrollOffsetRef = useRef(0);
  const gymsDataRef = useRef([]);
  const lastFetchParamsRef = useRef(null);
  const activeBaseParamsRef = useRef({});
  const initialFetchDoneRef = useRef(false);

  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNext: false,
    hasPrev: false,
  });

  useLayoutEffect(() => {
    gymsDataRef.current = gyms;
  });

  // ─── Fetch ────────────────────────────────────────────────────
  const fetchGyms = useCallback(async (page = 1, loadMore = false) => {
    try {
      if (loadMore) setLoadingMore(true);
      else setApiLoading(true);

      const params = { page, limit: ITEMS_PER_PAGE };
      const paramsString = JSON.stringify(params);
      if (!loadMore && lastFetchParamsRef.current === paramsString) {
        setApiLoading(false);
        setLoadingMore(false);
        setLoading(false);
        return;
      }
      if (!loadMore) lastFetchParamsRef.current = paramsString;

      const response = await getDailyPassGymsAPI(params);
      if (response?.status === 200) {
        const normalized = response.data.map(normalizeGym);
        if (loadMore) {
          if (normalized.length > 0) {
            gymsDataRef.current = [...gymsDataRef.current, ...normalized];
            setGyms(gymsDataRef.current);
          }
        } else {
          gymsDataRef.current = normalized;
          setGyms(normalized);
        }
        setPagination({
          currentPage: response.pagination?.current_page || page,
          totalPages: response.pagination?.total_pages || 1,
          totalCount: response.pagination?.total_count || normalized.length,
          hasNext: response.pagination?.has_next || false,
          hasPrev: response.pagination?.has_prev || false,
        });
        lastFetchParamsRef.current = paramsString;
        if (!loadMore)
          activeBaseParamsRef.current = { page: 1, limit: ITEMS_PER_PAGE };
      }
    } catch (err) {
      console.error("ChooseGym fetchGyms error:", err);
    } finally {
      setApiLoading(false);
      setLoadingMore(false);
      setLoading(false);
    }
  }, []);

  const fetchWithLocation = useCallback(async () => {
    try {
      setLoading(true);
      const coords = await getCachedLocation();
      if (!coords) {
        const perm = peekPermissionStatus();
        if (perm && perm.status !== "granted") {
          setLocationDenied(true);
          setGyms([]);
          gymsDataRef.current = [];
          setLoading(false);
          return;
        }
        await fetchGyms(1);
        return;
      }
      setLocationDenied(false);

      const params = {
        page: 1,
        limit: ITEMS_PER_PAGE,
        client_lat: coords.lat,
        client_lng: coords.lng,
      };

      const override = getLocationOverride();
      if (override?.label) {
        setLocationArea(override.label);
        locationFetchedRef.current = true;
      }

      const [response, geoResults] = await Promise.all([
        getDailyPassGymsAPI(params),
        locationFetchedRef.current
          ? Promise.resolve(null)
          : Location.reverseGeocodeAsync({
              latitude: coords.lat,
              longitude: coords.lng,
            }),
      ]);

      if (response?.status === 200) {
        const normalized = response.data.map(normalizeGym);
        gymsDataRef.current = normalized;
        setGyms(normalized);
        setPagination({
          currentPage: response.pagination?.current_page || 1,
          totalPages: response.pagination?.total_pages || 1,
          totalCount: response.pagination?.total_count || normalized.length,
          hasNext: response.pagination?.has_next || false,
          hasPrev: response.pagination?.has_prev || false,
        });
        activeBaseParamsRef.current = {
          client_lat: params.client_lat,
          client_lng: params.client_lng,
        };
      }

      if (geoResults?.length > 0) {
        locationFetchedRef.current = true;
        const r = geoResults[0];
        setLocationArea(r.district || r.subregion || r.city || r.name || "");
      }
    } catch (err) {
      console.error("ChooseGym location fetch error:", err);
      await fetchGyms(1);
    } finally {
      setLoading(false);
      setApiLoading(false);
    }
  }, [fetchGyms]);

  const handleEnableLocation = useCallback(async () => {
    if (requestingLocation) return;
    setRequestingLocation(true);
    try {
      const current = await refreshPermissionStatus();
      if (current && current.status !== "granted" && !current.canAskAgain) {
        await Linking.openSettings();
        return;
      }
      clearLocationCache();
      await fetchWithLocation();
    } finally {
      setRequestingLocation(false);
    }
  }, [requestingLocation, fetchWithLocation]);

  useFocusEffect(
    useCallback(() => {
      if (!initialFetchDoneRef.current) {
        initialFetchDoneRef.current = true;
        fetchWithLocation();
      }
    }, [fetchWithLocation]),
  );

  useFocusEffect(
    useCallback(() => {
      const backAction = () => {
        router.back();
        return true;
      };
      const backHandler = BackHandler.addEventListener(
        "hardwareBackPress",
        backAction,
      );
      return () => backHandler.remove();
    }, [router]),
  );

  // ─── Load more ────────────────────────────────────────────────
  const handleLoadMore = useCallback(async () => {
    if (
      !pagination.hasNext ||
      loadingMore ||
      apiLoading ||
      pagination.currentPage >= pagination.totalPages
    )
      return;
    const nextPage = pagination.currentPage + 1;
    try {
      setLoadingMore(true);
      const params = {
        ...activeBaseParamsRef.current,
        page: nextPage,
        limit: ITEMS_PER_PAGE,
      };
      const response = await getDailyPassGymsAPI(params);
      if (response?.status === 200) {
        const normalized = response.data.map(normalizeGym);
        if (normalized.length > 0) {
          gymsDataRef.current = [...gymsDataRef.current, ...normalized];
          setGyms(gymsDataRef.current);
        }
        setPagination({
          currentPage: response.pagination?.current_page || nextPage,
          totalPages: response.pagination?.total_pages || pagination.totalPages,
          totalCount: response.pagination?.total_count || pagination.totalCount,
          hasNext: response.pagination?.has_next || false,
          hasPrev: response.pagination?.has_prev || false,
        });
      }
    } catch (err) {
      console.error("ChooseGym loadMore error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [pagination, loadingMore, apiLoading]);

  // ─── Search ───────────────────────────────────────────────────
  const handleSearchChange = useCallback(async (text) => {
    setSearchQuery(text);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    if (!text.trim()) {
      setSearchResults([]);
      return;
    }
    searchDebounceRef.current = setTimeout(async () => {
      try {
        setSearchLoading(true);
        const response = await getDailyPassGymsAPI({
          search: text,
          page: 1,
          limit: 20,
        });
        if (response?.status === 200)
          setSearchResults(response.data.map(normalizeGym));
      } catch (e) {
        // silent
      } finally {
        setSearchLoading(false);
      }
    }, 400);
  }, []);

  const fromSearchRef = useRef(false);
  const handleSearchGymPress = useCallback((item) => {
    setSearchModalVisible(false);
    setSearchQuery("");
    setSearchResults([]);
    fromSearchRef.current = true;
    handleCardPress(item);
  }, []);

  // ─── Filter ───────────────────────────────────────────────────
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (activeFilters.city) count++;
    if (activeFilters.area) count++;
    if (activeFilters.pincode) count++;
    if (activeFilters.selected_fitness_types?.length)
      count += activeFilters.selected_fitness_types.length;
    if (activeFilters.sort_price) count++;
    return count;
  }, [activeFilters]);

  const handleFilterApply = useCallback(async (filters) => {
    setActiveFilters(filters);
    setLoading(true);
    lastFetchParamsRef.current = null;
    try {
      setApiLoading(true);
      const params = {
        page: 1,
        limit: ITEMS_PER_PAGE,
        ...(filters.city && { city: filters.city }),
        ...(filters.area && { area: filters.area }),
        ...(filters.pincode && { pincode: filters.pincode }),
        ...(filters.selected_fitness_types?.length && {
          fitness_types: filters.selected_fitness_types,
        }),
        ...(filters.sort_price && {
          sort_price: true,
          sort_type: filters.sort_type,
        }),
      };
      const response = await getDailyPassGymsAPI(params);
      if (response?.status === 200) {
        const normalized = response.data.map(normalizeGym);
        gymsDataRef.current = normalized;
        setGyms(normalized);
        setPagination({
          currentPage: response.pagination?.current_page || 1,
          totalPages: response.pagination?.total_pages || 1,
          totalCount: response.pagination?.total_count || normalized.length,
          hasNext: response.pagination?.has_next || false,
          hasPrev: response.pagination?.has_prev || false,
        });
        activeBaseParamsRef.current = params;
      }
    } catch (err) {
      console.error("ChooseGym filter error:", err);
    } finally {
      setApiLoading(false);
      setLoading(false);
    }
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, []);

  const handleFilterReset = useCallback(async () => {
    setActiveFilters({});
    lastFetchParamsRef.current = null;
    await fetchWithLocation();
    flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
  }, [fetchWithLocation]);

  // ─── Gym detail ───────────────────────────────────────────────
  const handleCardPress = useCallback(async (item) => {
    setGymDetailItem(item);
    setGymDetailData(null);
    setGymDetailLoading(true);
    setGymDetailModalVisible(true);
    try {
      const response = await getGymDetail(item.gym_id);
      if (response?.status === 200 || response?.data) {
        setGymDetailData(response.data || response);
      }
    } catch (err) {
      console.error("ChooseGym GymDetail fetch error:", err);
    } finally {
      setGymDetailLoading(false);
    }
  }, []);

  // ─── Select gym → show options sheet ───────────
  const handleSelectGym = useCallback(
    (item) => {
      setGymDetailModalVisible(false);
      setOptionsSheetItem(item || gymDetailItem);
    },
    [gymDetailItem],
  );

  // ─── Create session API call ─────────────────────────────────
  const handleCreateSession = async () => {
    if (!selectedGym || creatingSession) return;
    setCreatingSession(true);
    try {
      const payload = {
        gym_id: selectedGym.gym_id,
        session_date: flowParams.session_date,
        session_time: flowParams.session_time,
        mate_preference: flowParams.mate_preference,
        fitness_level: flowParams.fitness_level,
        workout_vibes: JSON.parse(flowParams.muscle_groups || "[]"),
        payment_mode: "pay_later",
      };
      const res = await createGymMateSessionAPI(payload);
      if (res?.status === 200) {
        router.push("/client/(gymmate)/sessioncreated");
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: res?.message || "Could not create session. Please try again.",
        });
      }
    } catch (err) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again.",
      });
    } finally {
      setCreatingSession(false);
    }
  };

  // ─── Book Now & Create Session (pay_now flow) ───────────────
  const handleBookNow = async (gym) => {
    if (paymentInProgress.current) return;
    paymentInProgress.current = true;
    setOptionsSheetItem(null);
    setPaymentModal({
      visible: true,
      success: false,
      data: null,
      loading: true,
    });

    try {
      const clientId = await AsyncStorage.getItem("client_id");
      if (!clientId) {
        setPaymentModal({
          visible: true,
          success: false,
          data: null,
          loading: false,
        });
        paymentInProgress.current = false;
        return;
      }

      // Step 1: Create GymMate session with pay_now
      const payload = {
        gym_id: gym.gym_id,
        session_date: flowParams.session_date,
        session_time: flowParams.session_time,
        mate_preference: flowParams.mate_preference,
        fitness_level: flowParams.fitness_level,
        workout_vibes: JSON.parse(flowParams.muscle_groups || "[]"),
        payment_mode: "pay_now",
      };
      const sessionRes = await createGymMateSessionAPI(payload);
      if (sessionRes?.status !== 200 || !sessionRes?.data?.session_id) {
        setPaymentModal({
          visible: true,
          success: false,
          data: { message: sessionRes?.message || "Could not create session." },
          loading: false,
        });
        paymentInProgress.current = false;
        return;
      }

      const sessionId = sessionRes.data.session_id;

      // Steps 2-5: Checkout → Poll → Razorpay → Verify
      const payResult = await handlePay({
        gymId: gym.gym_id,
        clientId: String(clientId),
        dates: [flowParams.session_date],
        numberOfUsers: 1,
        reward: false,
        gym_mate_session_id: sessionId,
      });

      if (
        payResult?.success ||
        payResult?.verified ||
        payResult?.payment_captured
      ) {
        setPaymentModal({
          visible: false,
          success: true,
          data: null,
          loading: false,
        });
        router.push("/client/(gymmate)/sessioncreated");
      } else {
        setPaymentModal({
          visible: true,
          success: false,
          data: payResult,
          loading: false,
        });
      }
    } catch (err) {
      setPaymentModal({
        visible: true,
        success: false,
        data: null,
        loading: false,
      });
    } finally {
      paymentInProgress.current = false;
    }
  };

  // ─── Render gym card ──────────────────────────────────────────
  const renderGymCard = useCallback(
    ({ item }) => (
      <TouchableOpacity
        style={styles.gymCard}
        onPress={() => handleCardPress(item)}
        activeOpacity={0.85}
      >
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.image }}
            style={styles.gymImage}
            contentFit="cover"
          />
        </View>

        {item.views >= 5 && (
          <View
            style={[
              styles.viewsOverlay,
              !item.frequently_booked && { justifyContent: "center" },
            ]}
          >
            <View style={styles.viewsTextRow}>
              <MaskedIcon bg1="#F4B23B" bg2="#FFF0C3" icon="eye" size={14} />
              <MaskedText
                bg1="#F4B23B"
                bg2="#FFF0C3"
                text={` ${item.views} people explored this gym!`}
                textStyle={styles.viewsOverlayText}
              />
            </View>
            {item.frequently_booked && (
              <LinearGradient
                colors={["#F4B23B", "#FFF0C3"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.frequentlyBookedBadge}
              >
                <Text style={styles.frequentlyBookedText}>
                  Frequently Booked
                </Text>
              </LinearGradient>
            )}
          </View>
        )}

        <View style={styles.gymInfo}>
          {/* Row 1: gym name + price */}
          <View style={styles.gymNameRow}>
            <Text
              style={styles.gymCardName}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.name ? String(item.name) : ""}
            </Text>
            {item.dailyPass && item.discountPrice ? (
              <Text style={styles.priceText}>₹{item.discountPrice}/day</Text>
            ) : null}
          </View>
          {/* Row 2: location + select */}
          <View style={styles.gymCardBottom}>
            <View style={styles.gymCardLocationRow}>
              <Ionicons name="location-outline" size={13} color="#4A5565" />
              <Text style={styles.gymCardLocation} numberOfLines={1}>
                {(() => {
                  const loc = item.area || "";
                  return loc.length > 17 ? loc.slice(0, 17) + ".." : loc;
                })()}
                {item.distance_km != null ? ` • ${item.distance_km} km` : ""}
              </Text>
            </View>
            {selectedGym?.id === item.id ? (
              <TouchableOpacity
                style={styles.selectedBadge}
                activeOpacity={0.85}
                onPress={(e) => {
                  e.stopPropagation();
                  setSelectedGym(null);
                  setSelectedFromSearch(false);
                }}
              >
                <Ionicons name="close-circle" size={16} color="#FFF" />
                <Text style={styles.selectedBadgeText}>Deselect</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.selectButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleCardPress(item);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.selectBtnText}>Select</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </TouchableOpacity>
    ),
    [handleCardPress, selectedGym, selectedFromSearch],
  );

  // ─── List header ──────────────────────────────────────────────
  const renderListHeader = useMemo(
    () =>
      pagination.totalCount > 0 ? (
        <View style={styles.resultsInfo}>
          <Text style={styles.resultsText}>
            {pagination.totalCount} Fitness Studio
            {pagination.totalCount !== 1 ? "s" : ""}
            {Object.keys(activeFilters).length === 0 && locationArea
              ? ` in ${locationArea}`
              : " Found"}
          </Text>
        </View>
      ) : null,
    [pagination.totalCount, activeFilters, locationArea],
  );

  const renderFooter = useMemo(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadMoreContainer}>
        <ActivityIndicator size="small" color="#101828" />
        <Text style={styles.loadMoreText}>Loading more gyms...</Text>
      </View>
    );
  }, [loadingMore]);

  return (
    <View style={[styles.container, { paddingTop: insets.top + 6 }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => router.back()}
          style={styles.headerButton}
        >
          <MaterialIcons name="arrow-back" size={28} color="#333" />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerStep}>Step 5 of 5</Text>
          <Text style={styles.headerTitle}>Choose Your Gym</Text>
        </View>
        <View style={{ width: 36 }} />
      </View>

      {/* Search + Filter */}
      <View style={styles.searchContainer}>
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => setSearchModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="search"
            size={20}
            color="#101828"
            style={styles.searchIcon}
          />
          <Text style={styles.searchPlaceholder}>
            Search fitness studios...
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.filterButton,
            activeFilterCount > 0 && styles.filterButtonActive,
          ]}
          activeOpacity={0.8}
          onPress={() => setFilterModalVisible(true)}
        >
          <Ionicons name="options" size={20} color="#FFFFFF" />
          {activeFilterCount > 0 && (
            <View style={styles.filterBadge}>
              <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Content */}
      {loading || (apiLoading && gyms.length === 0) ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#101828" />
          <Text style={styles.loadingText}>Finding gyms near you...</Text>
        </View>
      ) : locationDenied ? (
        <View style={styles.locationDeniedContainer}>
          <View style={styles.locationDeniedIconWrap}>
            <Ionicons name="location-outline" size={44} color="#101828" />
          </View>
          <Text style={styles.locationDeniedTitle}>Location access is off</Text>
          <Text style={styles.locationDeniedSubtitle}>
            We need your location to show fitness studios near you.
          </Text>
          <TouchableOpacity
            style={[
              styles.locationDeniedButton,
              requestingLocation && { opacity: 0.7 },
            ]}
            activeOpacity={0.85}
            onPress={handleEnableLocation}
            disabled={requestingLocation}
          >
            {requestingLocation ? (
              <ActivityIndicator size="small" color="#FFFFFF" />
            ) : (
              <>
                <Ionicons name="navigate" size={16} color="#FFFFFF" />
                <Text style={styles.locationDeniedButtonText}>
                  Enable Location
                </Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      ) : (
        <FlashList
          ref={flatListRef}
          contentContainerStyle={{ paddingBottom: selectedGym ? 180 : 100 }}
          data={selectedFromSearch && selectedGym ? [selectedGym] : gyms}
          renderItem={renderGymCard}
          keyExtractor={(item) => String(item.id)}
          estimatedItemSize={160}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderListHeader}
          ListFooterComponent={selectedFromSearch ? null : renderFooter}
          onEndReached={selectedFromSearch ? undefined : handleLoadMore}
          onEndReachedThreshold={0.5}
          onScroll={(e) => {
            scrollOffsetRef.current = e.nativeEvent.contentOffset.y;
            setShowScrollTop(e.nativeEvent.contentOffset.y > 400);
          }}
          scrollEventThrottle={16}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No gyms found nearby.</Text>
            </View>
          )}
        />
      )}

      {showScrollTop && (
        <TouchableOpacity
          style={[styles.scrollToTopButton, { bottom: insets.bottom + 20 }]}
          onPress={() =>
            flatListRef.current?.scrollToOffset({ offset: 0, animated: true })
          }
          activeOpacity={0.8}
        >
          <Ionicons name="arrow-up" size={24} color="#FFFFFF" />
        </TouchableOpacity>
      )}

      {/* Search Modal */}
      <DailyPassSearchModal
        visible={searchModalVisible}
        onClose={() => {
          setSearchModalVisible(false);
          setSearchQuery("");
          setSearchResults([]);
        }}
        gyms={searchResults}
        searchQuery={searchQuery}
        loading={searchLoading}
        onGymPress={handleSearchGymPress}
        onSearchChange={handleSearchChange}
      />

      {/* Filter Modal */}
      <DailyPassFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleFilterApply}
        onReset={handleFilterReset}
        filters={activeFilters}
      />

      {/* Gym Detail Modal — with Book Now & I'll Book Later */}
      <GymDetailModal
        visible={gymDetailModalVisible}
        onClose={() => {
          setGymDetailModalVisible(false);
          setGymDetailData(null);
          setGymDetailItem(null);
        }}
        gymData={gymDetailData}
        gymName={gymDetailItem?.name}
        loading={gymDetailLoading}
        onBookNow={() => {
          const item = gymDetailItem;
          setGymDetailModalVisible(false);
          setGymDetailData(null);
          setGymDetailItem(null);
          handleBookNow(item);
        }}
        onBookLater={() => {
          const item = gymDetailItem;
          const wasFromSearch = fromSearchRef.current;
          fromSearchRef.current = false;
          setGymDetailModalVisible(false);
          setGymDetailData(null);
          setGymDetailItem(null);
          setSelectedGym(item);
          if (wasFromSearch) {
            setSelectedFromSearch(true);
          } else {
            // Scroll to the selected gym in the list
            setTimeout(() => {
              const index = gymsDataRef.current.findIndex(
                (g) => g.id === item?.id,
              );
              if (index >= 0) {
                flatListRef.current?.scrollToIndex({
                  index,
                  animated: true,
                  viewPosition: 0.3,
                });
              }
            }, 400);
          }
        }}
        onAlreadyMember={() => {
          const item = gymDetailItem;
          const wasFromSearch = fromSearchRef.current;
          fromSearchRef.current = false;
          setGymDetailModalVisible(false);
          setGymDetailData(null);
          setGymDetailItem(null);
          setSelectedGym(item);
          if (wasFromSearch) {
            setSelectedFromSearch(true);
          } else {
            setTimeout(() => {
              const index = gymsDataRef.current.findIndex(
                (g) => g.id === item?.id,
              );
              if (index >= 0) {
                flatListRef.current?.scrollToIndex({
                  index,
                  animated: true,
                  viewPosition: 0.3,
                });
              }
            }, 400);
          }
        }}
      />

      {/* Options Sheet — Book Now / I'll Book Later */}
      <Modal
        visible={!!optionsSheetItem}
        transparent
        animationType="slide"
        onRequestClose={() => setOptionsSheetItem(null)}
      >
        <TouchableOpacity
          style={os.backdrop}
          activeOpacity={1}
          onPress={() => setOptionsSheetItem(null)}
        />
        <View style={[os.sheet, { paddingBottom: insets.bottom + 20 }]}>
          <View style={os.handle} />
          <Text style={os.title}>{optionsSheetItem?.name || "This Gym"}</Text>
          <Text style={os.subtitle}>What would you like to do?</Text>

          <TouchableOpacity
            style={os.option}
            activeOpacity={0.7}
            onPress={() => handleBookNow(optionsSheetItem)}
          >
            <View style={os.iconWrap}>
              <Ionicons name="calendar-outline" size={22} color="#FF5757" />
            </View>
            <View style={os.optionTextWrap}>
              <Text style={os.optionLabel}>Book Now & Create Session</Text>
              <Text style={os.optionSub}>Book a daily pass at this gym</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CCCCCC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={os.option}
            activeOpacity={0.7}
            onPress={() => {
              const item = optionsSheetItem;
              setSelectedGym(item);
              setOptionsSheetItem(null);
              setTimeout(() => {
                const index = gymsDataRef.current.findIndex(
                  (g) => g.id === item?.id,
                );
                if (index >= 0) {
                  flatListRef.current?.scrollToIndex({
                    index,
                    animated: true,
                    viewPosition: 0.3,
                  });
                }
              }, 400);
            }}
          >
            <View style={os.iconWrap}>
              <Ionicons name="time-outline" size={22} color="#FF5757" />
            </View>
            <View style={os.optionTextWrap}>
              <Text style={os.optionLabel}>I'll Book Later</Text>
              <Text style={os.optionSub}>Just select this gym for now</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CCCCCC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={os.option}
            activeOpacity={0.7}
            onPress={() => {
              const item = optionsSheetItem;
              setSelectedGym(item);
              setOptionsSheetItem(null);
              setTimeout(() => {
                const index = gymsDataRef.current.findIndex(
                  (g) => g.id === item?.id,
                );
                if (index >= 0) {
                  flatListRef.current?.scrollToIndex({
                    index,
                    animated: true,
                    viewPosition: 0.3,
                  });
                }
              }, 400);
            }}
          >
            <View style={os.iconWrap}>
              <Ionicons name="fitness-outline" size={22} color="#FF5757" />
            </View>
            <View style={os.optionTextWrap}>
              <Text style={os.optionLabel}>Already a Member</Text>
              <Text style={os.optionSub}>I'm already a member of this gym</Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color="#CCCCCC" />
          </TouchableOpacity>

          <TouchableOpacity
            style={os.cancelBtn}
            activeOpacity={0.7}
            onPress={() => setOptionsSheetItem(null)}
          >
            <Text style={os.cancelText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </Modal>

      {/* Payment Modal */}
      <Modal
        visible={paymentModal.visible}
        transparent
        animationType="fade"
        statusBarTranslucent
      >
        <View style={pm.overlay}>
          <View style={pm.card}>
            {paymentModal.loading ? (
              <>
                <ActivityIndicator size="large" color="#22C55E" />
                <Text style={pm.loadingText}>Processing payment…</Text>
              </>
            ) : paymentModal.success ? null : (
              <>
                <MaterialIcons name="error" size={56} color="#FF5757" />
                <Text style={pm.failTitle}>Payment Failed</Text>
                <Text style={pm.failMsg}>
                  {paymentModal.data?.message ||
                    "Payment not received. Please try again or contact support if the issue persists."}
                </Text>
                {paymentModal.data?.orderId && (
                  <View style={pm.orderRow}>
                    <Text style={pm.orderLabel}>Order ID: </Text>
                    <Text style={pm.orderId}>{paymentModal.data.orderId}</Text>
                    <Ionicons
                      name="copy-outline"
                      size={16}
                      color="#007BFF"
                      onPress={async () => {
                        const Clipboard = await import("expo-clipboard");
                        await Clipboard.setStringAsync(
                          paymentModal.data.orderId,
                        );
                        showToast({
                          type: "success",
                          title: "Copied",
                          desc: "Order ID copied",
                        });
                      }}
                    />
                  </View>
                )}
                <View style={pm.btns}>
                  <TouchableOpacity
                    style={pm.retryBtn}
                    onPress={() =>
                      setPaymentModal({
                        visible: false,
                        success: false,
                        data: null,
                        loading: false,
                      })
                    }
                  >
                    <Text style={pm.retryText}>Try Again</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={pm.cancelBtn}
                    onPress={() =>
                      setPaymentModal({
                        visible: false,
                        success: false,
                        data: null,
                        loading: false,
                      })
                    }
                  >
                    <Text style={pm.cancelBtnText}>Cancel</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>

      {/* Fixed bottom button — Create Gym Mate Session */}
      {selectedGym && (
        <View style={[os.bottomBar, { paddingBottom: insets.bottom + 12 }]}>
          <TouchableOpacity
            style={[os.createBtn, creatingSession && { opacity: 0.7 }]}
            activeOpacity={0.85}
            onPress={handleCreateSession}
            disabled={creatingSession}
          >
            {creatingSession ? (
              <ActivityIndicator color="#FFF" />
            ) : (
              <>
                <Ionicons name="flash" size={20} color="#FFF" />
                <Text style={os.createBtnText}>Create Gym Mate Session</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

export default ChooseGym;

// ─── Main Styles ──────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 10,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
  },
  headerButton: { padding: 4 },
  headerCenter: { flex: 1, alignItems: "center" },
  headerStep: { fontSize: 11, color: "#9CA3AF", fontWeight: "400" },
  headerTitle: { fontSize: 16, fontWeight: "700", color: "#1A1A1A" },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: "#FFFFFF",
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#101828",
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonActive: { backgroundColor: "#374151" },
  filterBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    backgroundColor: "#FFF",
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#101828",
  },
  filterBadgeText: { fontSize: 10, fontWeight: "700", color: "#101828" },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "#EBEBEB",
  },
  searchIcon: { marginRight: 8 },
  searchPlaceholder: { flex: 1, fontSize: 14, color: "#AAAAAA" },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: { fontSize: 14, color: "#777" },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  emptyText: { fontSize: 15, color: "#888", textAlign: "center" },
  locationDeniedContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 32,
    paddingBottom: 40,
  },
  locationDeniedIconWrap: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "#F3F4F6",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  locationDeniedTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1A1A1A",
    textAlign: "center",
    marginBottom: 8,
  },
  locationDeniedSubtitle: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 24,
  },
  locationDeniedButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#101828",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    minWidth: 180,
  },
  locationDeniedButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  resultsInfo: { paddingHorizontal: 16, paddingTop: 10, paddingBottom: 4 },
  resultsText: {
    fontSize: 13,
    color: "#555",
    fontWeight: "500",
    textAlign: "center",
  },
  gymCard: {
    backgroundColor: "#FFFFFF",
    marginHorizontal: 16,
    marginVertical: 8,
    borderRadius: 12,
    overflow: "visible",
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 4,
  },
  imageContainer: {
    height: 190,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: "hidden",
  },
  gymImage: { width: "100%", height: "100%", resizeMode: "cover" },
  viewsOverlay: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  viewsTextRow: { flexDirection: "row", alignItems: "center" },
  viewsOverlayText: { fontSize: 12, fontWeight: "600" },
  frequentlyBookedBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  frequentlyBookedText: { fontSize: 11, fontWeight: "700", color: "#202020" },
  gymInfo: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 10 },
  gymNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
    marginBottom: 2,
    marginTop: 6,
  },
  gymCardName: { fontSize: 16, fontWeight: "700", color: "#0A0A0A", flex: 1 },
  priceText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
    flexShrink: 0,
  },
  gymCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  gymCardLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    flex: 1,
    minWidth: 0,
  },
  gymCardLocation: {
    fontSize: 14,
    color: "#4A5565",
    flexShrink: 1,
    fontWeight: "400",
  },
  selectButton: {
    backgroundColor: "#101828",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  selectBtnText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  selectedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#22C55E",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 7,
  },
  selectedBadgeText: { color: "#FFF", fontSize: 12, fontWeight: "700" },
  loadMoreContainer: {
    padding: 20,
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  loadMoreText: { fontSize: 13, color: "#777" },
  scrollToTopButton: {
    position: "absolute",
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "#101828",
    justifyContent: "center",
    alignItems: "center",
    elevation: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
});

// ─── Options Sheet & Bottom Bar Styles ────────────────────────
const os = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
  },
  sheet: {
    backgroundColor: "#FFF",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    paddingHorizontal: 20,
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
    fontSize: 17,
    fontWeight: "700",
    color: "#1A1A1A",
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 13,
    color: "#888888",
    marginBottom: 18,
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
  optionTextWrap: {
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
  // Bottom bar
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: "#FFF",
    paddingHorizontal: 20,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#F0F0F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 8,
  },
  createBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#FF5757",
    borderRadius: 14,
    height: 54,
    shadowColor: "#FF5757",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 5,
  },
  createBtnText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#FFF",
    letterSpacing: 0.3,
  },
});

// ─── Payment Modal Styles ─────────────────────────────────────
const pm = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: "#FFF",
    borderRadius: 20,
    padding: 28,
    alignItems: "center",
    width: "100%",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 15,
    color: "#333",
    fontWeight: "500",
  },
  failTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#FF5757",
    marginTop: 14,
    marginBottom: 8,
  },
  failMsg: {
    fontSize: 13,
    color: "#666",
    textAlign: "center",
    lineHeight: 20,
    marginBottom: 12,
  },
  orderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginBottom: 16,
  },
  orderLabel: { fontSize: 12, color: "#888" },
  orderId: { fontSize: 12, color: "#333", fontWeight: "600" },
  btns: {
    flexDirection: "row",
    gap: 12,
    marginTop: 4,
  },
  retryBtn: {
    flex: 1,
    backgroundColor: "#22C55E",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  retryText: { color: "#FFF", fontWeight: "700", fontSize: 14 },
  cancelBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#DDD",
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: "center",
  },
  cancelBtnText: { color: "#666", fontWeight: "600", fontSize: 14 },
});
