import React, {
  createContext,
  useContext,
  useEffect,
  useRef,
  useCallback,
} from "react";
import ReconnectingWebSocket from "reconnecting-websocket";
import apiConfig from "../services/apiConfig";

const ChatCtx = createContext(null);

export const ChatSocketProvider = ({ sessionId, children }) => {
  const wsRef = useRef(null);
  const listeners = useRef(new Set());

  /* connect */
  useEffect(() => {
    if (!sessionId) return;

    const host = apiConfig.API_URL.split("//")[1];
    const url = `wss://${host}/websocket_live/ws/chat/${sessionId}`;
    const ws = new ReconnectingWebSocket(url, [], {
      maxRetries: 999,
      reconnectInterval: 1500,
    });
    wsRef.current = ws;

    ws.addEventListener("message", (e) => {
      try {
        const p = JSON.parse(e.data);
        listeners.current.forEach((fn) => fn(p));
      } catch (_) {}
    });

    const ping = setInterval(
      () => ws.readyState === ws.OPEN && ws.send("{}"),
      20_000
    );

    return () => {
      clearInterval(ping);
      ws.close();
    };
  }, [sessionId]);

  const rawSend = useCallback((d) => {
    const msg = JSON.stringify(d);
    const send = () =>
      wsRef.current?.readyState === wsRef.current?.OPEN
        ? wsRef.current.send(msg)
        : setTimeout(send, 100);
    send();
  }, []);

  /* helpers that match backend */
  const sendMessage = ({ clientId, message }) =>
    rawSend({ action: "send", client_id: clientId, message });

  const editMessage = ({ messageId, message }) =>
    rawSend({ action: "edit", message_id: messageId, message });

  const deleteMessages = (ids) =>
    rawSend({ action: "delete", message_ids: ids });

  const addListener = (fn) => {
    listeners.current.add(fn);
    return () => listeners.current.delete(fn);
  };

  return (
    <ChatCtx.Provider
      value={{ addListener, sendMessage, editMessage, deleteMessages }}
    >
      {children}
    </ChatCtx.Provider>
  );
};

export const useChatSocket = () => {
  const ctx = useContext(ChatCtx);
  if (!ctx) throw new Error("ChatSocketProvider missing");
  return ctx;
};
