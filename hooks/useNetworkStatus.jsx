import { useState, useEffect, useCallback } from "react";
import * as Network from "expo-network";
import { setNetworkStatusCallback } from "../services/axiosInstance"; // Import from your axios file

export const useNetworkStatusExpo = () => {
  const [isConnected, setIsConnected] = useState(null);
  const [isRetrying, setIsRetrying] = useState(false);

  const updateNetworkStatus = useCallback((status) => {
    setIsConnected(status);
  }, []);

  const checkConnection = useCallback(async () => {
    try {
      const networkState = await Network.getNetworkStateAsync();
      const connected = networkState.isConnected;
      setIsConnected(connected);
      return connected;
    } catch (error) {
      setIsConnected(false);
      return false;
    }
  }, []);

  useEffect(() => {
    // Set up the callback for axios to update network status
    setNetworkStatusCallback(updateNetworkStatus);

    // Initial connection check
    checkConnection();

    // Real-time network state listener
    const unsubscribe = Network.addNetworkStateListener((networkState) => {
      setIsConnected(networkState.isConnected);
    });

    // Backup polling with longer interval (30 seconds)
    const interval = setInterval(() => {
      checkConnection();
    }, 30000);

    return () => {
      unsubscribe?.remove();
      clearInterval(interval);
      // Clean up the callback
      setNetworkStatusCallback(null);
    };
  }, [checkConnection, updateNetworkStatus]);

  const retryConnection = async () => {
    setIsRetrying(true);
    try {
      const connected = await checkConnection();
      if (connected) {
        // Optionally show success message
      }
      return connected;
    } finally {
      setTimeout(() => setIsRetrying(false), 1000);
    }
  };

  return {
    isConnected,
    isRetrying,
    retryConnection,
    checkConnection, // Export for manual checks
  };
};
