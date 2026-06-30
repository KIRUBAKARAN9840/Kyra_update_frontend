import React, {
  useState,
  useLayoutEffect,
  useRef,
  useMemo,
  useCallback,
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
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useRouter, useFocusEffect } from "expo-router";
import { BackHandler } from "react-native";
import { getDailyPassGymsAPI } from "../../../services/clientApi";
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
import GymPricingModal from "../../../components/ui/DailyPass/GymPricingModal";

const { width } = Dimensions.get("window");

const ITEMS_PER_PAGE = 10;

// One-shot cache for scroll restoration
let DP_LIST_CACHE = null;
let SKIP_NEXT_DP_FOCUS_FETCH = false;

const saveDpCache = (payload) => {
  DP_LIST_CACHE = { ...(DP_LIST_CACHE || {}), ...payload };
};

const clearDpCache = () => {
  DP_LIST_CACHE = null;
};

const getInitialState = () => {
  if (DP_LIST_CACHE && SKIP_NEXT_DP_FOCUS_FETCH && DP_LIST_CACHE.gyms) {
    return DP_LIST_CACHE.gyms;
  }
  return [];
};

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
  discount: null,
  distance_km: gym.distance_km || null,
  views: gym.views || 0,
  frequently_booked: gym.frequently_booked || false,
  dailypass_offer_active: false,
});

const ListGyms = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // State
  const [gyms, setGyms] = useState(getInitialState);
  const [loading, setLoading] = useState(true);
  const [apiLoading, setApiLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [pricingModalVisible, setPricingModalVisible] = useState(false);
  const [pricingGymId, setPricingGymId] = useState(null);
  const [pricingGymName, setPricingGymName] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});
  const [bannerActive, setBannerActive] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [locationArea, setLocationArea] = useState("");
  const [locationDenied, setLocationDenied] = useState(false);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const locationFetchedRef = useRef(false);
  const searchDebounceRef = useRef(null);
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNext: false,
    hasPrev: false,
  });

  // Offer data from API
  const [offerData, setOfferData] = useState({
    dailypass_offer_eligible: false,
    dailypass_count: 0,
    client_name: "",
  });

  // Scroll restoration
  const [needsScrollRestore, setNeedsScrollRestore] = useState(false);
  const [isRestoring, setIsRestoring] = useState(false);

  const flatListRef = useRef(null);
  const scrollOffsetRef = useRef(0);
  const savedScrollOffsetRef = useRef(0);
  const gymsDataRef = useRef([]);
  const isRestoringFromCacheRef = useRef(false);
  const lastFetchParamsRef = useRef(null);
  const lastUsedFiltersRef = useRef({});
  // Tracks the base params for the current "view" so load-more can append correctly
  const activeBaseParamsRef = useRef({});
  const initialFetchDoneRef = useRef(false);

  // Sync data ref before render
  useLayoutEffect(() => {
    gymsDataRef.current = gyms;
  });

  // Scroll restoration via imperative scrollToOffset
  useLayoutEffect(() => {
    if (needsScrollRestore && savedScrollOffsetRef.current > 0) {
      setIsRestoring(true);
      const savedOffset = savedScrollOffsetRef.current;
      // Wait for FlashList to finish rendering the restored data
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: savedOffset,
          animated: false,
        });
        setNeedsScrollRestore(false);
        isRestoringFromCacheRef.current = false;
        setIsRestoring(false);
      }, 100);
    }
  }, [needsScrollRestore]);

  // Keep key stable so FlashList doesn't remount on cache restore
  const flashListKey = "dp-gyms-list";

  // Calculate offer remaining
  const dailypassRemaining = Math.max(0, 3 - offerData.dailypass_count);
  const greetingName = useMemo(() => {
    const name = offerData.client_name || "";
    const first = name.trim().split(" ")[0];
    return first.length > 8 ? first.slice(0, 8) + ".." : first || "Guest";
  }, [offerData.client_name]);

  // ─── Data fetching (fallback: no location permission) ────────────
  const fetchGyms = useCallback(
    async (page = 1, loadMore = false) => {
      try {
        if (loadMore) setLoadingMore(true);
        else setApiLoading(true);

        const params = {
          page,
          limit: ITEMS_PER_PAGE,
        };

        const paramsString = JSON.stringify(params);
        if (!loadMore && lastFetchParamsRef.current === paramsString) {
          setApiLoading(false);
          setLoadingMore(false);
          if (loading) setLoading(false);
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
            setOfferData({
              dailypass_offer_eligible:
                response.dailypass_offer_eligible || false,
              dailypass_count: response.dailypass_count || 0,
              client_name: response.client_name || "",
            });
          }

          setPagination({
            currentPage: response.pagination?.current_page || page,
            totalPages: response.pagination?.total_pages || 1,
            totalCount: response.pagination?.total_count || normalized.length,
            hasNext: response.pagination?.has_next || false,
            hasPrev: response.pagination?.has_prev || false,
          });

          lastUsedFiltersRef.current = params;
          if (!loadMore)
            activeBaseParamsRef.current = { page: 1, limit: ITEMS_PER_PAGE };
        }
      } catch (err) {
        console.error("ListGyms fetchGyms error:", err);
      } finally {
        setApiLoading(false);
        setLoadingMore(false);
        setLoading(false);
      }
    },
    [loading],
  );

  // Initial location-based fetch
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
          setPagination({
            currentPage: 1,
            totalPages: 1,
            totalCount: 0,
            hasNext: false,
            hasPrev: false,
          });
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

      // If a manual override is set, use its label directly and skip reverse geocode.
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
        setOfferData({
          dailypass_offer_eligible: response.dailypass_offer_eligible || false,
          dailypass_count: response.dailypass_count || 0,
          client_name: response.client_name || "",
        });
        setPagination({
          currentPage: response.pagination?.current_page || 1,
          totalPages: response.pagination?.total_pages || 1,
          totalCount: response.pagination?.total_count || normalized.length,
          hasNext: response.pagination?.has_next || false,
          hasPrev: response.pagination?.has_prev || false,
        });
        lastUsedFiltersRef.current = params;
        activeBaseParamsRef.current = {
          client_lat: params.client_lat,
          client_lng: params.client_lng,
        };
      }

      if (geoResults && geoResults.length > 0) {
        locationFetchedRef.current = true;
        const r = geoResults[0];
        setLocationArea(r.district || r.subregion || r.city || r.name || "");
      }
    } catch (err) {
      console.error("ListGyms location fetch error:", err);
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

  // Hydrate from cache when returning from gymdetails
  const hydrateFromCache = useCallback(() => {
    if (!SKIP_NEXT_DP_FOCUS_FETCH || !DP_LIST_CACHE) return false;

    const cachedGyms = DP_LIST_CACHE.gyms || [];
    gymsDataRef.current = cachedGyms;

    const isSameReference = gyms === cachedGyms;
    if (!isSameReference) setGyms(cachedGyms);

    savedScrollOffsetRef.current = DP_LIST_CACHE?.scrollOffset || 0;
    isRestoringFromCacheRef.current = true;
    setNeedsScrollRestore(true);

    if (DP_LIST_CACHE.pagination) setPagination(DP_LIST_CACHE.pagination);
    if (DP_LIST_CACHE.offerData) setOfferData(DP_LIST_CACHE.offerData);

    setLoading(false);
    setApiLoading(false);
    setLoadingMore(false);
    SKIP_NEXT_DP_FOCUS_FETCH = false;

    setTimeout(() => clearDpCache(), 100);
    return true;
  }, [gyms]);

  // Snapshot to cache before navigation
  const snapshotToCache = useCallback(() => {
    const firstVisibleIndex =
      flatListRef.current?.getFirstVisibleIndex?.() ?? 0;
    saveDpCache({
      gyms: gymsDataRef.current,
      pagination,
      offerData,
      scrollOffset: scrollOffsetRef.current,
      firstVisibleIndex,
    });
  }, [pagination, offerData]);

  // Focus effect
  useFocusEffect(
    useCallback(() => {
      const hydrated = hydrateFromCache();
      if (!hydrated && !initialFetchDoneRef.current) {
        initialFetchDoneRef.current = true;
        fetchWithLocation();
      }
    }, [hydrateFromCache, fetchWithLocation]),
  );

  // Back handler
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

  // Load more — uses activeBaseParamsRef to carry current filter/location/banner params
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
      console.error("ListGyms loadMore error:", err);
    } finally {
      setLoadingMore(false);
    }
  }, [
    pagination.hasNext,
    pagination.currentPage,
    pagination.totalPages,
    pagination.totalCount,
    loadingMore,
    apiLoading,
  ]);

  // ─── Search modal ────────────────────────────────────────────────
  const handleSearchChange = useCallback(
    async (text) => {
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
            ...(bannerActive && { dailypass_low: true }),
          });
          if (response?.status === 200) {
            setSearchResults(response.data.map(normalizeGym));
          }
        } catch (e) {
          // silent
        } finally {
          setSearchLoading(false);
        }
      }, 400);
    },
    [bannerActive],
  );

  const handleSearchGymPress = useCallback(
    (item) => {
      setSearchModalVisible(false);
      setSearchQuery("");
      setSearchResults([]);
      snapshotToCache();
      SKIP_NEXT_DP_FOCUS_FETCH = true;
      router.push({
        pathname: "/client/(dailypass)/passDateSelection",
        params: {
          gymId: item.gym_id,
        },
      });
    },
    [snapshotToCache, router],
  );

  // ─── Scroll to top ────────────────────────────────────────────────
  const handleScrollToTop = useCallback(() => {
    // Small delay to let data update settle before scrolling
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 100);
  }, []);

  // ─── Filter modal ─────────────────────────────────────────────────
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

  const handleFilterApply = useCallback(
    async (filters) => {
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
          ...(bannerActive && { dailypass_low: true }),
        };
        const response = await getDailyPassGymsAPI(params);
        if (response?.status === 200) {
          const normalized = response.data.map(normalizeGym);
          gymsDataRef.current = normalized;
          setGyms(normalized);
          setOfferData({
            dailypass_offer_eligible:
              response.dailypass_offer_eligible || false,
            dailypass_count: response.dailypass_count || 0,
            client_name: response.client_name || "",
          });
          setPagination({
            currentPage: response.pagination?.current_page || 1,
            totalPages: response.pagination?.total_pages || 1,
            totalCount: response.pagination?.total_count || normalized.length,
            hasNext: response.pagination?.has_next || false,
            hasPrev: response.pagination?.has_prev || false,
          });
          lastUsedFiltersRef.current = params;
          activeBaseParamsRef.current = params;
        }
      } catch (err) {
        console.error("Filter fetch error:", err);
      } finally {
        setApiLoading(false);
        setLoading(false);
      }
      handleScrollToTop();
    },
    [handleScrollToTop, bannerActive],
  );

  const handleFilterReset = useCallback(async () => {
    setActiveFilters({});
    lastFetchParamsRef.current = null;
    if (bannerActive) {
      // Keep banner active, just remove filters
      try {
        setLoading(true);
        setApiLoading(true);
        const params = { page: 1, limit: ITEMS_PER_PAGE, dailypass_low: true };
        const response = await getDailyPassGymsAPI(params);
        if (response?.status === 200) {
          const normalized = response.data.map(normalizeGym);
          gymsDataRef.current = normalized;
          setGyms(normalized);
          setOfferData({
            dailypass_offer_eligible:
              response.dailypass_offer_eligible || false,
            dailypass_count: response.dailypass_count || 0,
            client_name: response.client_name || "",
          });
          setPagination({
            currentPage: response.pagination?.current_page || 1,
            totalPages: response.pagination?.total_pages || 1,
            totalCount: response.pagination?.total_count || normalized.length,
            hasNext: response.pagination?.has_next || false,
            hasPrev: response.pagination?.has_prev || false,
          });
          lastUsedFiltersRef.current = params;
          activeBaseParamsRef.current = params;
        }
      } catch (err) {
        console.error("Filter reset (banner active) fetch error:", err);
      } finally {
        setLoading(false);
        setApiLoading(false);
      }
    } else {
      await fetchWithLocation();
    }
    handleScrollToTop();
  }, [bannerActive, fetchWithLocation, handleScrollToTop]);

  // Open gym pricing modal
  const handleCardPress = useCallback((item) => {
    setPricingGymId(item.gym_id);
    setPricingGymName(item.name || "");
    setPricingModalVisible(true);
  }, []);

  // Open pricing modal from book button
  const handleBookPress = useCallback(
    (item, index) => {
      setPricingGymId(item.gym_id);
      setPricingGymName(item.name || "");
      setPricingModalVisible(true);
    },
    [],
  );

  // ─── Render gym card ─────────────────────────────────────────────
  const renderGymCard = useCallback(
    ({ item, index }) => (
      <TouchableOpacity
        style={styles.gymCard}
        onPress={() => handleCardPress(item)}
        activeOpacity={0.85}
      >
        {/* Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.image }}
            style={styles.gymImage}
            contentFit="cover"
          />
        </View>

        {/* Views + Frequently Booked — normal flow row after image */}
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

        {/* Info section below image */}
        <View style={styles.gymInfo}>
          {/* Row 1: gym name */}
          <Text style={styles.gymCardName} numberOfLines={1}>
            {item.name ? String(item.name) : ""}
          </Text>

          {/* Row 2: location + price button */}
          <View style={styles.gymCardBottom}>
            <View style={styles.gymCardLocationRow}>
              <Ionicons name="location-outline" size={13} color="#4A5565" />
              <Text style={styles.gymCardLocation} numberOfLines={1}>
                {(() => {
                  const loc = item.area || item.city || item.location || "";
                  return loc.length > 17 ? loc.slice(0, 17) + ".." : loc;
                })()}
                {item.distance_km != null ? ` • ${item.distance_km} km` : ""}
              </Text>
            </View>

            {item.dailyPass && item.discountPrice ? (
              <TouchableOpacity
                style={styles.bookButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleBookPress(item, index);
                }}
                activeOpacity={0.85}
              >
                <Text style={styles.bookBtnRupee}>₹</Text>
                <Text style={styles.bookBtnAmount}>{item.discountPrice}</Text>
                <Text style={styles.bookBtnUnit}>/day</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>
      </TouchableOpacity>
    ),
    [handleCardPress, handleBookPress],
  );

  // ─── Banner press — fetch offer gyms (toggle) ────────────────────
  const handleBannerPress = useCallback(async () => {
    const hasFilters =
      activeFilters.city ||
      activeFilters.area ||
      activeFilters.pincode ||
      activeFilters.selected_fitness_types?.length ||
      activeFilters.sort_price;

    if (bannerActive) {
      // Deselect banner — keep any active filters, just remove dailypass_low
      setBannerActive(false);
      lastFetchParamsRef.current = null;
      if (hasFilters) {
        // Re-fetch with existing filters but without dailypass_low
        try {
          setLoading(true);
          setApiLoading(true);
          const params = {
            page: 1,
            limit: ITEMS_PER_PAGE,
            ...(activeFilters.city && { city: activeFilters.city }),
            ...(activeFilters.area && { area: activeFilters.area }),
            ...(activeFilters.pincode && { pincode: activeFilters.pincode }),
            ...(activeFilters.selected_fitness_types?.length && {
              fitness_types: activeFilters.selected_fitness_types,
            }),
            ...(activeFilters.sort_price && {
              sort_price: true,
              sort_type: activeFilters.sort_type,
            }),
          };
          const response = await getDailyPassGymsAPI(params);
          if (response?.status === 200) {
            const normalized = response.data.map(normalizeGym);
            gymsDataRef.current = normalized;
            setGyms(normalized);
            setOfferData({
              dailypass_offer_eligible:
                response.dailypass_offer_eligible || false,
              dailypass_count: response.dailypass_count || 0,
              client_name: response.client_name || "",
            });
            setPagination({
              currentPage: response.pagination?.current_page || 1,
              totalPages: response.pagination?.total_pages || 1,
              totalCount: response.pagination?.total_count || normalized.length,
              hasNext: response.pagination?.has_next || false,
              hasPrev: response.pagination?.has_prev || false,
            });
            lastUsedFiltersRef.current = params;
            activeBaseParamsRef.current = params;
          }
        } catch (err) {
          console.error("Banner deselect (with filters) fetch error:", err);
        } finally {
          setLoading(false);
          setApiLoading(false);
        }
      } else {
        await fetchWithLocation();
      }
      handleScrollToTop();
      return;
    }
    try {
      setBannerActive(true);
      setLoading(true);
      lastFetchParamsRef.current = null;
      const params = {
        page: 1,
        limit: ITEMS_PER_PAGE,
        dailypass_low: true,
        ...(activeFilters.city && { city: activeFilters.city }),
        ...(activeFilters.area && { area: activeFilters.area }),
        ...(activeFilters.pincode && { pincode: activeFilters.pincode }),
        ...(activeFilters.selected_fitness_types?.length && {
          fitness_types: activeFilters.selected_fitness_types,
        }),
        ...(activeFilters.sort_price && {
          sort_price: true,
          sort_type: activeFilters.sort_type,
        }),
      };
      const response = await getDailyPassGymsAPI(params);
      if (response?.status === 200) {
        const normalized = response.data.map(normalizeGym);
        gymsDataRef.current = normalized;
        setGyms(normalized);
        setOfferData({
          dailypass_offer_eligible: response.dailypass_offer_eligible || false,
          dailypass_count: response.dailypass_count || 0,
          client_name: response.client_name || "",
        });
        setPagination({
          currentPage: response.pagination?.current_page || 1,
          totalPages: response.pagination?.total_pages || 1,
          totalCount: response.pagination?.total_count || normalized.length,
          hasNext: response.pagination?.has_next || false,
          hasPrev: response.pagination?.has_prev || false,
        });
        lastUsedFiltersRef.current = params;
        activeBaseParamsRef.current = params;
        handleScrollToTop();
      }
    } catch (err) {
      console.error("Banner fetch error:", err);
      setBannerActive(false);
    } finally {
      setLoading(false);
      setApiLoading(false);
    }
  }, [bannerActive, activeFilters, fetchWithLocation, handleScrollToTop]);

  // ─── List header (offer banner + result count) ───────────────────
  const renderListHeader = useMemo(() => {
    const showBanner =
      offerData.dailypass_offer_eligible && dailypassRemaining > 0;
    return (
      <View>
        {showBanner && (
          <View style={styles.pricingCardsContainer}>
            <View
              style={{
                width: width,
                paddingHorizontal: 16,
                alignItems: "center",
              }}
            >
              <TouchableOpacity
                style={[
                  styles.gymPassBanner,
                  { width: width - 24 },
                  bannerActive && styles.gymPassBannerActive,
                ]}
                onPress={handleBannerPress}
                activeOpacity={0.8}
              >
                <Text style={styles.bannerEmoji}>🎉</Text>
                <Text style={styles.bannerGreeting} numberOfLines={1}>
                  Hi <Text style={styles.bannerBold}>{greetingName}</Text>
                  {", You've unlocked "}
                  <Text style={styles.bannerBold}>
                    {dailypassRemaining} Daily Pass
                  </Text>
                  {" at "}
                  <Text style={styles.bannerBold}>₹49</Text>
                </Text>
                <Ionicons
                  name="chevron-forward"
                  size={16}
                  color="#454545"
                  style={styles.bannerArrow}
                />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {pagination.totalCount > 0 && (
          <View style={styles.resultsInfo}>
            <Text style={styles.resultsText}>
              {pagination.totalCount} Fitness Studio
              {pagination.totalCount !== 1 ? "s" : ""}
              {Object.keys(activeFilters).length === 0 && locationArea
                ? ` in ${locationArea}`
                : " Found"}
            </Text>
          </View>
        )}
      </View>
    );
  }, [
    offerData,
    dailypassRemaining,
    greetingName,
    pagination.totalCount,
    handleBannerPress,
    bannerActive,
    locationArea,
    activeFilters,
  ]);

  // ─── Footer ──────────────────────────────────────────────────────
  const renderFooter = useMemo(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadMoreContainer}>
        <ActivityIndicator size="small" color="#FF5757" />
        <Text style={styles.loadMoreText}>Loading more gyms...</Text>
      </View>
    );
  }, [loadingMore]);

  // ─── Main render ─────────────────────────────────────────────────
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

        <Text style={styles.headerTitle}>Daily Pass</Text>

        {/* Earn 200 coin button */}
        <TouchableOpacity
          style={styles.earnButton}
          activeOpacity={0.8}
          onPress={() => router.push("/client/referral")}
        >
          <View style={styles.coinGifContainer}>
            <Image
              source={require("../../../assets/gif/coin.gif")}
              style={styles.coinGif}
              contentFit="cover"
            />
          </View>
          <View>
            <Text style={styles.earnLabel}>Earn</Text>
            <Text style={styles.earnAmount}>₹100</Text>
          </View>
        </TouchableOpacity>
      </View>

      {/* Search bar + filter button */}
      <View style={styles.searchContainer}>
        <TouchableOpacity
          style={styles.searchBar}
          onPress={() => setSearchModalVisible(true)}
          activeOpacity={0.7}
        >
          <Ionicons
            name="search"
            size={20}
            color="#FF5757"
            style={styles.searchIcon}
          />
          <Text style={styles.searchPlaceholder} numberOfLines={1}>
            Search by Fitness Studios...
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
          <ActivityIndicator size="large" color="#FF5757" />
          <Text style={styles.loadingText}>
            Finding Fitness Studios with Daily Pass...
          </Text>
        </View>
      ) : locationDenied ? (
        <View style={styles.locationDeniedContainer}>
          <View style={styles.locationDeniedIconWrap}>
            <Ionicons name="location-outline" size={44} color="#FF5757" />
          </View>
          <Text style={styles.locationDeniedTitle}>Location access is off</Text>
          <Text style={styles.locationDeniedSubtitle}>
            We need your location to show fitness studios with daily passes near
            you. Your location is only used to find nearby gyms.
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
          contentContainerStyle={{ paddingBottom: 100 }}
          key={flashListKey}
          data={gyms}
          renderItem={renderGymCard}
          keyExtractor={(item) => String(item.id)}
          estimatedItemSize={160}
          maintainVisibleContentPosition={{ minIndexForVisible: 0 }}
          overScrollMode="never"
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={renderListHeader}
          ListFooterComponent={renderFooter}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.5}
          onScroll={(e) => {
            const offsetY = e.nativeEvent.contentOffset.y;
            scrollOffsetRef.current = offsetY;
            setShowScrollTop(offsetY > 400);
          }}
          scrollEventThrottle={16}
          ListEmptyComponent={() => (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                No Fitness Studios with Daily Pass found nearby.
              </Text>
            </View>
          )}
        />
      )}
      {/* Scroll to Top Button */}
      {showScrollTop && (
        <TouchableOpacity
          style={[styles.scrollToTopButton, { bottom: insets.bottom + 20 }]}
          onPress={handleScrollToTop}
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

      {/* Gym Pricing Modal */}
      <GymPricingModal
        visible={pricingModalVisible}
        onClose={() => setPricingModalVisible(false)}
        gymId={pricingGymId}
        gymName={pricingGymName}
      />
    </View>
  );
};

export default ListGyms;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },

  // ── Header ──────────────────────────────────────────────────────
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 12,
    paddingBottom: 8,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E5E5",
  },
  headerButton: {
    padding: 4,
  },
  headerTitle: {
    flex: 1,
    textAlign: "center",
    fontSize: 16,
    fontWeight: "600",
    color: "#1A1A1A",
  },
  earnButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: "#FFD580",
  },
  coinGifContainer: {
    width: 28,
    height: 28,
  },
  coinGif: {
    position: "absolute",
    width: 50,
    height: 50,
    top: -14,
    left: -14,
  },
  earnLabel: {
    fontSize: 11,
    color: "#FF5757",
    fontWeight: "600",
  },
  earnAmount: {
    fontSize: 14,
    color: "#FF5757",
    fontWeight: "700",
  },

  // ── Search ──────────────────────────────────────────────────────
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 10,
    gap: 10,
    backgroundColor: "#FFFFFF",
    paddingBottom: 6,
  },
  filterButton: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#FF5757",
    alignItems: "center",
    justifyContent: "center",
  },
  filterButtonActive: {
    backgroundColor: "#CC3333",
  },
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
    borderColor: "#FF5757",
  },
  filterBadgeText: {
    fontSize: 10,
    fontWeight: "700",
    color: "#FF5757",
  },
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
  searchIcon: {
    marginRight: 8,
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: "#AAAAAA",
  },

  // ── Loading / Empty ─────────────────────────────────────────────
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
  loadingText: {
    fontSize: 14,
    color: "#777",
  },
  emptyContainer: {
    alignItems: "center",
    paddingTop: 60,
    paddingHorizontal: 24,
  },
  emptyText: {
    fontSize: 15,
    color: "#888",
    textAlign: "center",
  },

  // ── Location Denied ─────────────────────────────────────────────
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
    backgroundColor: "#FFF0F0",
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
    backgroundColor: "#FF5757",
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 8,
    minWidth: 180,
    elevation: 2,
    shadowColor: "#FF5757",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  locationDeniedButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },

  // ── Offer Banner (exact copy from gymstudios) ────────────────────
  pricingCardsContainer: {
    paddingTop: 12,
    paddingBottom: 4,
  },
  gymPassBanner: {
    width: "100%",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: "#E0E0E0",
  },
  gymPassBannerActive: {
    backgroundColor: "#FFF0F0",
    borderColor: "#FF5757",
    borderWidth: 1.5,
  },
  bannerEmoji: {
    fontSize: 18,
    marginRight: 8,
  },
  bannerGreeting: {
    flex: 1,
    fontSize: 12,
    color: "#454545",
    fontWeight: "400",
  },
  bannerBold: {
    fontSize: 12,
    color: "#454545",
    fontWeight: "700",
  },
  bannerArrow: {
    marginLeft: 4,
  },

  // ── Results info ────────────────────────────────────────────────
  resultsInfo: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 4,
  },
  resultsText: {
    fontSize: 13,
    color: "#555",
    fontWeight: "500",
    textAlign: "center",
  },

  // ── Gym Card ────────────────────────────────────────────────────
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
    position: "relative",
    height: 190,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    overflow: "hidden",
  },
  gymImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
  // Views + frequently booked — normal flow row after image
  viewsOverlay: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "rgba(0,0,0,0.8)",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  viewsTextRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  viewsOverlayText: {
    fontSize: 12,
    fontWeight: "600",
  },
  frequentlyBookedBadge: {
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 8,
  },
  frequentlyBookedText: {
    fontSize: 11,
    fontWeight: "700",
    color: "#202020",
  },
  // Info section below image
  gymInfo: {
    paddingHorizontal: 12,
    paddingTop: 10,
    paddingBottom: 10,
  },
  gymCardName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0A0A0A",
    marginBottom: 2,
    marginTop: 6,
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
  // Book button
  bookButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FF5757",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 5,
  },
  bookBtnRupee: {
    fontSize: 14,
    color: "#FFFFFF",
    fontWeight: "700",
  },
  bookBtnAmount: {
    fontSize: 16,
    color: "#FFFFFF",
    fontWeight: "800",
  },
  bookBtnUnit: {
    fontSize: 10,
    color: "#FFD5D5",
    fontWeight: "500",
    marginLeft: 1,
  },

  // ── Footer ──────────────────────────────────────────────────────
  loadMoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  loadMoreText: {
    fontSize: 13,
    color: "#777",
  },

  // ── Scroll to Top ────────────────────────────────────────────────
  scrollToTopButton: {
    position: "absolute",
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 25,
    backgroundColor: "#FF5757",
    justifyContent: "center",
    alignItems: "center",
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
  },
});
