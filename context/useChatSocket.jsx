import { useEffect } from "react";
import { useChatSocket } from "../context/chatWebSocketProvider";

export default function useChatSocketHook(handler) {
  const { addListener } = useChatSocket();
  useEffect(() => addListener(handler), [addListener, handler]);
}
