import axios from "axios";
import * as SecureStore from "expo-secure-store";
import * as Network from "expo-network";
import { router } from "expo-router";
import AsyncStorage from "@react-native-async-storage/async-storage";
import apiConfig from "./apiConfig";
import { showToast } from "../utils/Toaster";

const baseURL = apiConfig.API_URL;
const axiosInstance = axios.create({
  baseURL,
  timeout: 15000, // 15 second timeout
});

let isRefreshing = false;
let refreshPromise = null;
let networkStatusCallback = null;

// Network detection utility
const checkNetworkConnection = async () => {
  try {
    const networkState = await Network.getNetworkStateAsync();
    return networkState.isConnected;
  } catch (error) {
    return false;
  }
};

// Function to set network status callback (call this from your hook)
export const setNetworkStatusCallback = (callback) => {
  networkStatusCallback = callback;
};

// Network error detection
const isNetworkError = (error) => {
  return (
    !error.response &&
    (error.code === "NETWORK_ERROR" ||
      error.code === "ECONNABORTED" ||
      error.message === "Network Error" ||
      error.message.includes("timeout") ||
      error.message.includes("No internet connection") ||
      error.message.includes("internet connection"))
  );
};

axiosInstance.interceptors.request.use(
  async (config) => {
    // Check network before making request
    const isConnected = await checkNetworkConnection();
    if (!isConnected) {
      // Update network status immediately
      if (networkStatusCallback) {
        networkStatusCallback(false);
      }
      showToast({
        type: "error",
        title: "No Internet Connection",
        desc: "Please check your internet connection and try again",
      });
      return Promise.reject(new Error("No internet connection"));
    }

    const token = await SecureStore.getItemAsync("access_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    showToast({
      type: "error",
      title: "Request Error",
      desc: error.message || "Something went wrong",
    });
    return Promise.reject(error);
  },
);

axiosInstance.interceptors.response.use(
  (response) => {
    // If we get a successful response, we know network is working
    if (networkStatusCallback) {
      networkStatusCallback(true);
    }
    return response;
  },
  async (error) => {
    // Check if it's a network error first
    if (isNetworkError(error)) {
      // Update network status immediately
      if (networkStatusCallback) {
        networkStatusCallback(false);
      }

      showToast({
        type: "error",
        title: "Connection Lost",
        desc: "Please check your internet connection",
      });

      return Promise.reject(error);
    }

    const originalRequest = error.config;

    // Handle 401 errors (token refresh)
    if (error.response && error.response.status === 401) {
      if (!isRefreshing) {
        isRefreshing = true;
        refreshPromise = refreshToken();
      }

      try {
        const newAccessToken = await refreshPromise;
        isRefreshing = false;
        refreshPromise = null;

        if (newAccessToken) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          return axiosInstance(originalRequest);
        } else {
          handleLogout();
        }
      } catch (refreshError) {
        isRefreshing = false;
        refreshPromise = null;

        // Don't logout if refresh failed due to network error
        if (!isNetworkError(refreshError)) {
          handleLogout();
        }
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

const refreshToken = async () => {
  try {
    // Check network before refresh attempt
    const isConnected = await checkNetworkConnection();
    if (!isConnected) {
      if (networkStatusCallback) {
        networkStatusCallback(false);
      }
      throw new Error("No internet connection for token refresh");
    }

    const clientId = await AsyncStorage.getItem("client_id");
    const role = "client";

    if (!clientId) {
      handleLogout();
      return null;
    }

    // Use base axios (not the instance) to avoid interceptor loops
    const refreshResponse = await axios.post(
      `${baseURL}/auth/refresh`,
      {
        id: clientId,
        role: role,
      },
      {
        timeout: 10000, // 10 second timeout for refresh
      },
    );

    if (refreshResponse?.status === 200) {
      await SecureStore.setItemAsync(
        "access_token",
        refreshResponse.data.access_token,
      );
      return refreshResponse.data.access_token; // Return just the token, not Bearer
    } else {
      handleLogout();
      return null;
    }
  } catch (error) {
    // Check if refresh failed due to network
    if (isNetworkError(error)) {
      if (networkStatusCallback) {
        networkStatusCallback(false);
      }
      showToast({
        type: "error",
        title: "Connection Lost",
        desc: "Unable to refresh session due to network error",
      });
      // Don't logout on network errors, just reject the promise
      throw error;
    } else {
      // Actual auth error, logout user
      handleLogout();
      throw error;
    }
  }
};

const handleLogout = async () => {
  try {
    await SecureStore.deleteItemAsync("access_token");
    await AsyncStorage.removeItem("client_id");
    await AsyncStorage.removeItem("gym_id");

    router.replace("/");

    showToast({
      type: "info",
      title: "Logged Out",
      desc: "Your session has expired. Please log in again.",
    });
  } catch (error) {
    router.replace("/");
  }
};

// Export utility functions
export { checkNetworkConnection, isNetworkError, refreshToken, handleLogout };
export default axiosInstance;
