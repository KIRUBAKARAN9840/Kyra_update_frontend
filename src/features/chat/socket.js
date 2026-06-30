import * as SecureStore from "expo-secure-store";

import apiConfig from "../../../services/apiConfig";
import { refreshToken } from "../../../services/axiosInstance";

const HEARTBEAT_MS = 25_000;
const DEAD_TIMEOUT_MS = 60_000;
const MIN_BACKOFF_MS = 1_500;
const MAX_BACKOFF_MS = 30_000;

// Server close reasons that mean "the token I sent is no longer valid;
// refresh and try again". Other reasons (missing_auth / bad_subject)
// are hard errors — stop reconnecting.
const REFRESHABLE_CLOSE_REASONS = new Set([
  "expired",
  "bad_signature",
  "bad_claims",
]);

class InboxSocket {
  constructor() {
    this.ws = null;
    this.listeners = new Set();
    this.statusListeners = new Set();
    this.pingTimer = null;
    this.deadTimer = null;
    this.wantOpen = false;
    this._status = "idle"; // idle | connecting | open | closed
    this._backoffMs = MIN_BACKOFF_MS;
    this._reconnectTimer = null;
  }

  get status() {
    return this._status;
  }

  _setStatus(s) {
    this._status = s;
    this.statusListeners.forEach((fn) => fn(s));
  }

  connect() {
    this.wantOpen = true;
    this._backoffMs = MIN_BACKOFF_MS;
    this._open();
  }

  disconnect() {
    this.wantOpen = false;
    this._clearReconnectTimer();
    this._cleanup();
    this._setStatus("idle");
  }

  subscribe(fn) {
    this.listeners.add(fn);
    return () => this.listeners.delete(fn);
  }

  onStatus(fn) {
    this.statusListeners.add(fn);
    return () => this.statusListeners.delete(fn);
  }

  // ── internals ──

  async _open() {
    if (!this.wantOpen) return;
    // Tear down any prior socket before opening a new one.
    this._cleanup();

    // SecureStore holds whatever the axios interceptor last wrote (it
    // refreshes on 401 transparently for every HTTP call). So if any
    // HTTP request worked recently, the token here is valid. We DON'T
    // pre-emptively decode or refresh — that's the axios layer's job.
    // If the server tells us the token is expired on this handshake,
    // we'll refresh in the onclose handler and reconnect.
    const jwt = await SecureStore.getItemAsync("access_token");
    if (!jwt) {
      this.wantOpen = false;
      this._setStatus("idle");
      return;
    }

    this._setStatus("connecting");

    const isHttps = apiConfig.API_URL.startsWith("https://");
    const host = apiConfig.API_URL.replace(/^https?:\/\//, "");
    const scheme = isHttps ? "wss" : "ws";
    const url = `${scheme}://${host}/api/v2/gym_mate/chat/ws`;

    let ws;
    try {
      ws = new WebSocket(url, [`bearer.${jwt}`]);
    } catch {
      this._scheduleReconnect();
      return;
    }
    this.ws = ws;

    ws.onopen = () => {
      this._backoffMs = MIN_BACKOFF_MS;
      this._setStatus("open");
      this._startHeartbeat();
    };

    ws.onmessage = (e) => {
      this._resetDeadTimer();
      let frame;
      try {
        frame = JSON.parse(e.data);
      } catch {
        return;
      }
      if (frame.type === "pong") return;
      this.listeners.forEach((fn) => fn(frame));
    };

    ws.onerror = () => {
      /* onclose follows */
    };

    ws.onclose = async (e) => {
      this._stopHeartbeat();
      this._setStatus("closed");
      if (!this.wantOpen) {
        this.ws = null;
        return;
      }

      // Server-initiated permanent close (1008) — read the reason.
      const reason = e && e.reason ? e.reason.toString() : "";
      if (e && e.code === 1008) {
        if (REFRESHABLE_CLOSE_REASONS.has(reason)) {
          // Token problem the server flagged. Call the same refresh
          // axios uses; it writes the new token to SecureStore. Then
          // reconnect; _open() will read the fresh token.
          try {
            await refreshToken();
          } catch {
            // refresh failed; refreshToken() already handles logout
            // when appropriate. Don't loop.
            this.wantOpen = false;
            this.ws = null;
            return;
          }
          // Refresh succeeded — reconnect immediately (no backoff).
          this.ws = null;
          this._open();
          return;
        }
        // Hard auth failure (missing_auth / bad_subject) — stop.
        this.wantOpen = false;
        this.ws = null;
        return;
      }

      // 4001 = single-device-policy replaced this conn. Stop.
      if (e && e.code === 4001) {
        this.wantOpen = false;
        this.ws = null;
        return;
      }

      // 1006 (abnormal close — handshake rejected before upgrade, or
      // network blip) — back off and retry. SecureStore may already
      // have been refreshed by another in-flight HTTP request.
      this._scheduleReconnect();
    };
  }

  _scheduleReconnect() {
    if (!this.wantOpen) return;
    this._clearReconnectTimer();
    const delay = this._backoffMs;
    this._backoffMs = Math.min(this._backoffMs * 2, MAX_BACKOFF_MS);
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      this._open();
    }, delay);
  }

  _clearReconnectTimer() {
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
  }

  _startHeartbeat() {
    this._stopHeartbeat();
    this.pingTimer = setInterval(() => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        try {
          this.ws.send(JSON.stringify({ type: "ping" }));
        } catch { }
      }
    }, HEARTBEAT_MS);
    this._resetDeadTimer();
  }

  _resetDeadTimer() {
    if (this.deadTimer) clearTimeout(this.deadTimer);
    this.deadTimer = setTimeout(() => {
      // Server stopped responding — close so onclose triggers a
      // reconnect (with a fresh token if the server's stale).
      if (this.ws) {
        try {
          this.ws.close();
        } catch { }
      }
    }, DEAD_TIMEOUT_MS);
  }

  _stopHeartbeat() {
    if (this.pingTimer) clearInterval(this.pingTimer);
    if (this.deadTimer) clearTimeout(this.deadTimer);
    this.pingTimer = null;
    this.deadTimer = null;
  }

  _cleanup() {
    this._stopHeartbeat();
    if (this.ws) {
      // Detach handlers so a late close event doesn't trigger a
      // reconnect from the OLD socket.
      try {
        this.ws.onopen = null;
        this.ws.onmessage = null;
        this.ws.onerror = null;
        this.ws.onclose = null;
        this.ws.close();
      } catch { }
      this.ws = null;
    }
  }
}

export const inboxSocket = new InboxSocket();