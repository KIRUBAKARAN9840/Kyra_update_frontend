import { useEffect } from "react";
import { useWS } from "./webSocketProvider";

export default function useFeedSocket(handler) {
  const { add } = useWS();
  useEffect(() => add(handler), [add, handler]);
}
