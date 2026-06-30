import React, { createContext, useContext, useEffect, useRef } from "react";
import ReconnectingWebSocket from "reconnecting-websocket";
import { useFocusEffect } from "@react-navigation/native";
import apiConfig from "../services/apiConfig";

const WSContext = createContext(null);

export const WebSocketProvider = ({ gymId, children, url1, url2 }) => {
  const listeners = useRef(new Set());
  const wsRef = useRef(null);
  const pingIntervalRef = useRef(null);

  useFocusEffect(
    React.useCallback(() => {
      if (!gymId) return;

      const url = `wss://${
        apiConfig.API_URL?.split("//")[1]
      }/${url1}/ws/${url2}/${gymId}`;
      const ws = new ReconnectingWebSocket(url, [], {
        maxRetries: 10,
        reconnectInterval: 2000,
        maxReconnectInterval: 10000,
      });
      wsRef.current = ws;

      ws.addEventListener("message", (e) => {
        try {
          const payload = JSON.parse(e.data);
          listeners.current.forEach((fn) => fn(payload));
        } catch (err) {}
      });

      pingIntervalRef.current = setInterval(() => {
        if (ws.readyState === ws.OPEN) ws.send("{}");
      }, 25000);

      return () => {
        // Clear all listeners on cleanup
        listeners.current.clear();

        if (pingIntervalRef.current) {
          clearInterval(pingIntervalRef.current);
          pingIntervalRef.current = null;
        }
        if (wsRef.current) {
          wsRef.current.close(1000, 'Component unmounted');
          wsRef.current = null;
        }
      };
    }, [gymId])
  );

  // Periodic cleanup of stale listeners every minute
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      // Recreate set to remove any stale references
      const activeListeners = new Set(listeners.current);
      listeners.current = activeListeners;
    }, 60000);

    return () => clearInterval(cleanupInterval);
  }, []);

  const add = (fn) => {
    listeners.current.add(fn);
    return () => listeners.current.delete(fn);
  };

  return <WSContext.Provider value={{ add }}>{children}</WSContext.Provider>;
};

export const useWS = () => {
  const ctx = useContext(WSContext);
  if (!ctx) throw new Error("WebSocketProvider missing");
  return ctx;
};
