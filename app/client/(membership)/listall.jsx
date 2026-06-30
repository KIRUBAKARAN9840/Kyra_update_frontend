import React, {
  useState,
  useEffect,
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
  ActivityIndicator,
  BackHandler,
  Linking,
  Dimensions,
} from "react-native";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Image } from "expo-image";
import { useRouter, useFocusEffect } from "expo-router";
import { getMembershipGymsAPI } from "../../../services/clientApi";
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
import MembershipSearchModal from "../../../components/ui/Membership/MembershipSearchModal";
import MembershipFilterModal from "../../../components/ui/Membership/MembershipFilterModal";

const ITEMS_PER_PAGE = 10;

// ─── One-shot cache for scroll restoration ────────────────────────
let MEM_LIST_CACHE = null;
let SKIP_NEXT_MEM_FOCUS_FETCH = false;

const saveMemCache = (payload) => {
  MEM_LIST_CACHE = { ...(MEM_LIST_CACHE || {}), ...payload };
};

const clearMemCache = () => {
  MEM_LIST_CACHE = null;
};

const getInitialState = () => {
  if (MEM_LIST_CACHE && SKIP_NEXT_MEM_FOCUS_FETCH && MEM_LIST_CACHE.gyms) {
    return MEM_LIST_CACHE.gyms;
  }
  return [];
};

// ─── Normalizer matching MembershipGymResponse schema ─────────────
const normalizeGym = (gym) => ({
  id: gym.gym_id,
  gym_id: gym.gym_id,
  name: gym.gym_name,
  area: gym.area || "",
  image:
    gym.cover_pic ||
    "https://fittbot-uploads.s3.ap-south-2.amazonaws.com/Gym_Studios/default_gym_mage.png",
  distance_km: gym.distance_km ?? null,
  views: gym.views || 0,
  frequently_booked: gym.frequently_booked || false,
  starting_price: gym.membership_price ?? null,
  plan_id: gym.plan_id ?? null,
  no_cost_emi: gym.no_cost_emi || false,
  duration: gym?.duration || 0,
});

const ListAll = () => {
  const router = useRouter();
  const insets = useSafeAreaInsets();

  // ─── State ────────────────────────────────────────────────────────
  const [gyms, setGyms] = useState(getInitialState);
  const [loading, setLoading] = useState(true);
  const [apiLoading, setApiLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [locationArea, setLocationArea] = useState("");
  const [locationDenied, setLocationDenied] = useState(false);
  const [requestingLocation, setRequestingLocation] = useState(false);
  const locationFetchedRef = useRef(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [activeFilters, setActiveFilters] = useState({});
  const [needsScrollRestore, setNeedsScrollRestore] = useState(false);
  const [walkawayDiscountActive, setWalkawayDiscountActive] = useState(false);
  const [walkawayCountdown, setWalkawayCountdown] = useState(30 * 60); // 30 mins in seconds
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    totalCount: 0,
    hasNext: false,
    hasPrev: false,
  });

  // ─── Refs ─────────────────────────────────────────────────────────
  const flatListRef = useRef(null);
  const scrollOffsetRef = useRef(0);
  const savedScrollOffsetRef = useRef(0);
  const gymsDataRef = useRef([]);
  const isRestoringFromCacheRef = useRef(false);
  const lastFetchParamsRef = useRef(null);
  const lastUsedFiltersRef = useRef({});
  const activeBaseParamsRef = useRef({});
  const initialFetchDoneRef = useRef(false);
  const searchDebounceRef = useRef(null);
  const lottieRef = useRef(null);

  // Sync data ref before render
  useLayoutEffect(() => {
    gymsDataRef.current = gyms;
  });

  // Scroll restoration
  useLayoutEffect(() => {
    if (needsScrollRestore && savedScrollOffsetRef.current > 0) {
      const savedOffset = savedScrollOffsetRef.current;
      setTimeout(() => {
        flatListRef.current?.scrollToOffset({
          offset: savedOffset,
          animated: false,
        });
        setNeedsScrollRestore(false);
        isRestoringFromCacheRef.current = false;
      }, 100);
    }
  }, [needsScrollRestore]);

  // ─── Lottie play/pause on focus ───────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      lottieRef.current?.play();
      return () => lottieRef.current?.pause();
    }, []),
  );

  // ─── Walkaway countdown timer ──────────────────────────────────────
  useEffect(() => {
    if (!walkawayDiscountActive || walkawayCountdown <= 0) return;
    const id = setInterval(() => {
      setWalkawayCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(id);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [walkawayDiscountActive]);

  // ─── Back handler ─────────────────────────────────────────────────
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

  // ─── Cache helpers ────────────────────────────────────────────────
  const snapshotToCache = useCallback(() => {
    const firstVisibleIndex =
      flatListRef.current?.getFirstVisibleIndex?.() ?? 0;
    saveMemCache({
      gyms: gymsDataRef.current,
      pagination,
      scrollOffset: scrollOffsetRef.current,
      firstVisibleIndex,
    });
  }, [pagination]);

  const hydrateFromCache = useCallback(() => {
    if (!SKIP_NEXT_MEM_FOCUS_FETCH || !MEM_LIST_CACHE) return false;

    const cachedGyms = MEM_LIST_CACHE.gyms || [];
    gymsDataRef.current = cachedGyms;
    const isSameReference = gyms === cachedGyms;
    if (!isSameReference) setGyms(cachedGyms);

    savedScrollOffsetRef.current = MEM_LIST_CACHE?.scrollOffset || 0;
    isRestoringFromCacheRef.current = true;
    setNeedsScrollRestore(true);

    if (MEM_LIST_CACHE.pagination) setPagination(MEM_LIST_CACHE.pagination);

    setLoading(false);
    setApiLoading(false);
    setLoadingMore(false);
    SKIP_NEXT_MEM_FOCUS_FETCH = false;
    setTimeout(() => clearMemCache(), 100);
    return true;
  }, [gyms]);

  // ─── Fetch (no location) ──────────────────────────────────────────
  const fetchGyms = useCallback(
    async (page = 1, loadMore = false) => {
      try {
        if (loadMore) setLoadingMore(true);
        else setApiLoading(true);

        const params = { page, limit: ITEMS_PER_PAGE };

        const paramsString = JSON.stringify(params);
        if (!loadMore && lastFetchParamsRef.current === paramsString) {
          setApiLoading(false);
          setLoadingMore(false);
          if (loading) setLoading(false);
          return;
        }
        if (!loadMore) lastFetchParamsRef.current = paramsString;

        const response = await getMembershipGymsAPI(params);

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

          // Walkaway discount flags
          if (!loadMore) {
            if (response.walkaway_discount_active)
              setWalkawayDiscountActive(true);
          }

          lastUsedFiltersRef.current = params;
          if (!loadMore)
            activeBaseParamsRef.current = { page: 1, limit: ITEMS_PER_PAGE };
        }
      } catch (err) {
        console.error("ListAll fetchGyms error:", err);
      } finally {
        setApiLoading(false);
        setLoadingMore(false);
        setLoading(false);
      }
    },
    [loading],
  );

  // ─── Initial location-based fetch ────────────────────────────────
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
        getMembershipGymsAPI(params),
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

        // Walkaway discount flags
        if (response.walkaway_discount_active) setWalkawayDiscountActive(true);

        lastUsedFiltersRef.current = params;
        activeBaseParamsRef.current = {
          client_lat: params.client_lat,
          client_lng: params.client_lng,
        };
      }

      if (geoResults && geoResults.length > 0) {
        locationFetchedRef.current = true;
        const r = geoResults[0];
        const area = r.district || r.subregion || r.city || r.name || "";
        setLocationArea(area);
      }
    } catch (err) {
      console.error("ListAll location fetch error:", err);
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

  // ─── Focus effect ─────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      const hydrated = hydrateFromCache();
      if (!hydrated && !initialFetchDoneRef.current) {
        initialFetchDoneRef.current = true;
        fetchWithLocation();
      }
    }, [hydrateFromCache, fetchWithLocation]),
  );

  // ─── Load more ────────────────────────────────────────────────────
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
      const response = await getMembershipGymsAPI(params);
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
      console.error("ListAll loadMore error:", err);
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

  // ─── Scroll helpers ───────────────────────────────────────────────
  const handleScrollToTop = useCallback(() => {
    setTimeout(() => {
      flatListRef.current?.scrollToOffset({ offset: 0, animated: true });
    }, 100);
  }, []);

  // ─── Filter ───────────────────────────────────────────────────────
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (activeFilters.state) count++;
    if (activeFilters.city) count++;
    if (activeFilters.area) count++;
    if (activeFilters.pincode) count++;
    if (activeFilters.selected_fitness_types?.length)
      count += activeFilters.selected_fitness_types.length;
    if (activeFilters.sort_price) count++;
    if (activeFilters.no_cost_emi) count++;
    if (activeFilters.membership_types?.length)
      count += activeFilters.membership_types.length;
    return count;
  }, [activeFilters]);

  const handleFilterApply = useCallback(
    (filters) => {
      setActiveFilters(filters);
      setLoading(true);
      lastFetchParamsRef.current = null;

      const fetchWithFilters = async () => {
        try {
          setApiLoading(true);
          const params = {
            page: 1,
            limit: ITEMS_PER_PAGE,
            ...(filters.state && { state: filters.state }),
            ...(filters.city && { city: filters.city }),
            ...(filters.area && { area: filters.area }),
            ...(filters.pincode && { pincode: filters.pincode }),
            ...(filters.selected_fitness_types?.length && {
              fitness_types: filters.selected_fitness_types,
            }),
            ...(filters.no_cost_emi && { no_cost_emi: true }),
            ...(filters.membership_types?.length && {
              membership_types: filters.membership_types,
            }),
            ...(filters.sort_price && {
              sort_price: true,
              sort_type: filters.sort_type,
            }),
          };
          const response = await getMembershipGymsAPI(params);
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
            lastUsedFiltersRef.current = params;
            activeBaseParamsRef.current = params;
          }
        } catch (err) {
          console.error("Filter fetch error:", err);
        } finally {
          setApiLoading(false);
          setLoading(false);
        }
      };
      fetchWithFilters();
      handleScrollToTop();
    },
    [handleScrollToTop],
  );

  const handleFilterReset = useCallback(() => {
    setActiveFilters({});
    setLoading(true);
    lastFetchParamsRef.current = null;
    fetchWithLocation();
    handleScrollToTop();
  }, [fetchWithLocation, handleScrollToTop]);

  // ─── Search modal ─────────────────────────────────────────────────
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
        const response = await getMembershipGymsAPI({
          search: text,
          page: 1,
          limit: 20,
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
  }, []);

  const handleSearchGymPress = useCallback(
    (item) => {
      setSearchModalVisible(false);
      setSearchQuery("");
      setSearchResults([]);
      snapshotToCache();
      SKIP_NEXT_MEM_FOCUS_FETCH = true;
      router.push({
        pathname: "/client/(membership)/onegym",
        params: { gym_id: item.gym_id },
      });
    },
    [snapshotToCache, router],
  );

  // ─── Footer ───────────────────────────────────────────────────────
  const renderFooter = useMemo(() => {
    if (!loadingMore) return null;
    return (
      <View style={styles.loadMoreContainer}>
        <ActivityIndicator size="small" color="#FF5757" />
        <Text style={styles.loadMoreText}>Loading more gyms...</Text>
      </View>
    );
  }, [loadingMore]);

  // ─── Gym Card ─────────────────────────────────────────────────────
  const renderGymCard = useCallback(
    ({ item }) => (
      <TouchableOpacity
        style={styles.gymCard}
        activeOpacity={0.85}
        onPress={() => {
          snapshotToCache();
          SKIP_NEXT_MEM_FOCUS_FETCH = true;
          router.push({
            pathname: "/client/(membership)/onegym",
            params: { gym_id: item.gym_id },
          });
        }}
      >
        {/* Image */}
        <View style={styles.imageContainer}>
          <Image
            source={{ uri: item.image }}
            style={styles.gymImage}
            contentFit="cover"
          />
        </View>

        {/* Views + Frequently Booked row */}
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

        {/* Info section */}
        <View style={styles.gymInfo}>
          {/* Row 1: name + No Cost EMI badge */}
          <View style={styles.gymNameRow}>
            <Text style={styles.gymCardName} numberOfLines={1}>
              {item.name ? String(item.name) : ""}
            </Text>
            {item.no_cost_emi && (
              <View style={styles.emiBadgeContainer}>
                <MaskedText
                  bg1="#F4B23B"
                  bg2="#FFF0C3"
                  text="No Cost EMI"
                  textStyle={styles.emiBadgeText}
                />
              </View>
            )}
          </View>

          {/* Row 2: location */}
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

          {/* Row 3: Price button + View more plan */}
          <View style={styles.gymCardBottom}>
            {item.starting_price != null ? (
              <TouchableOpacity
                style={styles.priceButton}
                activeOpacity={0.85}
                onPress={(e) => {
                  e.stopPropagation();
                  snapshotToCache();
                  SKIP_NEXT_MEM_FOCUS_FETCH = true;
                  router.push({
                    pathname: "/client/(membership)/payment",
                    params: {
                      gym_id: item.gym_id,
                      plan_id: item.plan_id,
                    },
                  });
                }}
              >
                <Text style={styles.priceBtnRupee}>₹</Text>
                <Text style={styles.priceBtnAmount}>{item.starting_price}</Text>
                <Text style={styles.priceBtnUnit}>
                  /{item?.duration > 1 ? item?.duration : ""} month
                  {item?.duration > 1 ? "s" : ""}
                </Text>
              </TouchableOpacity>
            ) : (
              <View style={styles.priceButtonPlaceholder} />
            )}

            <TouchableOpacity
              style={styles.viewMoreButton}
              activeOpacity={0.8}
              onPress={(e) => {
                e.stopPropagation();
                snapshotToCache();
                SKIP_NEXT_MEM_FOCUS_FETCH = true;
                router.push({
                  pathname: "/client/(membership)/onegym",
                  params: { gym_id: item.gym_id, scroll_to_plans: "1" },
                });
              }}
            >
              <Text style={styles.viewMoreText}>View more plan</Text>
              <Ionicons name="arrow-forward" size={13} color="#007AFF" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    ),
    [snapshotToCache],
  );

  // ─── Walkaway countdown formatted ─────────────────────────────────
  const walkawayTimerText = useMemo(() => {
    const m = String(Math.floor(walkawayCountdown / 60)).padStart(2, "0");
    const s = String(walkawayCountdown % 60).padStart(2, "0");
    return `${m}:${s}`;
  }, [walkawayCountdown]);

  // ─── List Header ─────────────────────────────────────────────────
  const renderListHeader = useMemo(
    () => (
      <View>
        {walkawayDiscountActive ? (
          <View style={styles.membershipBannerContainer}>
            <Image
              source={require("../../../assets/images/home/offer.webp")}
              style={styles.membershipBanner}
              contentFit="contain"
            />
          </View>
        ) : (
          <View style={styles.membershipGifContainer}>
            <Image
              source={require("../../../assets/gif/text.gif")}
              style={styles.membershipBannerGif}
              contentFit="contain"
            />
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
    ),
    [
      pagination.totalCount,
      locationArea,
      activeFilters,
      walkawayDiscountActive,
      walkawayTimerText,
    ],
  );

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

        <Text style={styles.headerTitle}>Membership Plans</Text>

        {/* Earn coin button */}
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

      {/* Search bar + filter */}
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
          <Text style={styles.loadingText}>Finding Memberships...</Text>
        </View>
      ) : locationDenied ? (
        <View style={styles.locationDeniedContainer}>
          <View style={styles.locationDeniedIconWrap}>
            <Ionicons name="location-outline" size={44} color="#FF5757" />
          </View>
          <Text style={styles.locationDeniedTitle}>Location access is off</Text>
          <Text style={styles.locationDeniedSubtitle}>
            We need your location to show fitness studios near you. Your
            location is only used to find nearby gyms.
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
          key="mem-gyms-list"
          data={gyms}
          renderItem={renderGymCard}
          keyExtractor={(item) => String(item.id)}
          estimatedItemSize={320}
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
                No Gym Memberships found nearby.
              </Text>
            </View>
          )}
        />
      )}

      {/* Scroll to Top */}
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
      <MembershipSearchModal
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
      <MembershipFilterModal
        visible={filterModalVisible}
        onClose={() => setFilterModalVisible(false)}
        onApply={handleFilterApply}
        onReset={handleFilterReset}
        filters={activeFilters}
      />
    </View>
  );
};

export default ListAll;

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
  headerButton: { padding: 4 },
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
  coinGifContainer: { width: 28, height: 28 },
  coinGif: {
    position: "absolute",
    width: 50,
    height: 50,
    top: -14,
    left: -14,
  },
  earnLabel: { fontSize: 11, color: "#FF5757", fontWeight: "600" },
  earnAmount: { fontSize: 14, color: "#FF5757", fontWeight: "700" },

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
  filterButtonActive: { backgroundColor: "#CC3333" },
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
  filterBadgeText: { fontSize: 10, fontWeight: "700", color: "#FF5757" },
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

  // ── Loading / Empty ─────────────────────────────────────────────
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
  gymInfo: { paddingHorizontal: 12, paddingTop: 10, paddingBottom: 12 },
  gymNameRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
    marginTop: 4,
  },
  gymCardName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0A0A0A",
    flex: 1,
    marginRight: 8,
  },
  emiBadgeContainer: {
    backgroundColor: "#000000",
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  emiBadgeText: { fontSize: 11, fontWeight: "700" },
  gymCardLocationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginBottom: 10,
  },
  gymCardLocation: {
    fontSize: 14,
    color: "#4A5565",
    fontWeight: "400",
    flexShrink: 1,
  },
  gymCardBottom: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 8,
  },
  priceButton: {
    flexDirection: "row",
    alignItems: "baseline",
    backgroundColor: "#FF5757",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 7,
  },
  priceButtonPlaceholder: {
    height: 34,
    flex: 1,
  },
  priceBtnRupee: { fontSize: 14, color: "#FFFFFF", fontWeight: "700" },
  priceBtnAmount: { fontSize: 16, color: "#FFFFFF", fontWeight: "800" },
  priceBtnUnit: {
    fontSize: 10,
    color: "#fddfdf",
    fontWeight: "500",
    marginLeft: 1,
  },
  viewMoreButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
    backgroundColor: "#FFFFFF",
    borderWidth: 1,
    borderColor: "#E0E7FF",
    elevation: 2,
    shadowColor: "#007AFF",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
  },
  viewMoreText: { fontSize: 13, fontWeight: "600", color: "#007AFF" },

  // ── Footer ──────────────────────────────────────────────────────
  loadMoreContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 8,
  },
  loadMoreText: { fontSize: 13, color: "#777" },

  // ── Membership Banner ────────────────────────────────────────────
  membershipBannerContainer: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
  },
  membershipBanner: {
    width: Dimensions.get("window").width * 0.95,
    height: (Dimensions.get("window").width * 0.95) / 5,
    marginBottom: 0,
    borderRadius: 12,
    marginTop: 10,
  },
  membershipGifContainer: {
    width: "100%",
    height: 50,
    alignItems: "center",
    justifyContent: "center",
  },
  membershipBannerGif: {
    width: "100%",
    height: 80,
    marginBottom: 20,
  },

  // ── Walkaway Discount Banner ──────────────────────────────────────
  walkawayBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 4,
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  walkawayBannerLeft: {},
  walkawayBannerOff: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 1,
  },
  walkawayBannerSub: {
    fontSize: 13,
    color: "#FFE0E0",
    fontWeight: "600",
    marginTop: 2,
  },
  walkawayBannerRight: { alignItems: "center" },
  walkawayBannerTimer: {
    fontSize: 24,
    fontWeight: "900",
    color: "#FFFFFF",
    fontVariant: ["tabular-nums"],
  },
  walkawayBannerTimerLabel: {
    fontSize: 11,
    color: "#FFE0E0",
    fontWeight: "600",
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
