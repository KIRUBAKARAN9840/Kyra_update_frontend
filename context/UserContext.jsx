import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getClientXpAPI, getGymIDAPI } from "../services/clientApi";
import { showToast } from "../utils/Toaster";

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [loading, setLoading] = useState(false);
  const [xp, setXp] = useState(null);
  const [profile, setProfile] = useState("");
  const [plan, setPlan] = useState(null);
  const [progress, setProgress] = useState(0);
  const [badge, setBadge] = useState(null);
  const [tag, setTag] = useState(null);
  const [gymDetails, setGymDetails] = useState(null);
  const [sideBarData, setSideBarData] = useState(null);
  const [userType, setUserType] = useState(null);
  const [registrationSteps, setRegistrationSteps] = useState(null);

  const setUpGymId = async () => {
    try {
      const client_id = await AsyncStorage.getItem("client_id");
      if (!client_id) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Something went wrong. Please try again later",
        });
        return;
      }
      const response = await getGymIDAPI(client_id);
      if (response?.status === 200) {
        await AsyncStorage.setItem("gym_id", response?.gym_id?.toString());
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: "Something went wrong. Please try again later",
        });
      }
    } catch (err) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    }
  };
  const loadingRef = useRef(false);

  const fetchUserData = useCallback(async (force = false) => {
    // Prevent multiple simultaneous calls
    if (loadingRef.current && !force) return;

    loadingRef.current = true;
    setLoading(true);
    try {
      setXp("...");
      const client_id = await AsyncStorage.getItem("client_id");
      if (!client_id) {
        showToast({
          type: "error",
          title: "Error",
          desc: "Something went wrong. Please try again later",
        });
        return;
      }

      const response = await getClientXpAPI(client_id);

      if (response?.status === 200) {
        setProfile(response?.profile);
        setTag(response?.tag);
        setXp(response?.data?.xp);
        setBadge(response?.badge);
        setProgress(response?.progress);
        setSideBarData({
          profile: response?.profile,
          userName: response?.name,
          userEmail: response?.mobile_number,
        });

        setUserType(response?.usertype);
        setRegistrationSteps(response?.registration_steps);
        setPlan(response?.tier || "freemium");
        if (
          response?.tier === "freemium_gym" ||
          response?.tier === "premium_gym"
        ) {
          const gym_id = await AsyncStorage.getItem("gym_id");
          {
            await setUpGymId();
          }
        }
        setGymDetails(response?.gym);
      } else {
        showToast({
          type: "error",
          title: "Error",
          desc: response?.detail || "Error Fetching user data",
        });
      }
    } catch (error) {
      showToast({
        type: "error",
        title: "Error",
        desc: "Something went wrong. Please try again later",
      });
    } finally {
      setLoading(false);
      loadingRef.current = false;
    }
  }, []);

  const updatePlan = useCallback((newPlan) => {
    setPlan(newPlan);
  }, []);

  const clearUserData = useCallback(() => {
    setLoading(false);
    setXp(null);
    setProfile("");
    setPlan(null);
    setProgress(0);
    setBadge(null);
    setTag(null);
    setGymDetails(null);
    setSideBarData(null);
    setUserType(null);
    setRegistrationSteps(null);
    loadingRef.current = false;
  }, []);

  const value = {
    // State
    loading,
    xp,
    profile,
    plan,
    progress,
    badge,
    tag,
    gymDetails,
    sideBarData,
    userType,
    registrationSteps,

    // Actions
    fetchUserData,
    updatePlan,
    clearUserData,
  };

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
};
