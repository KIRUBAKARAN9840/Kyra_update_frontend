// ─── UUID helper ────────────────────────────────────────────────────────────

export function generateMsgId() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// ─── Initial state ───────────────────────────────────────────────────────────

export const initialThreadState = {
  messages: [], // oldest-first internally; reverse before render for inverted list
  loading: false,
  refreshing: false,
  hasMore: true,
  nextCursor: null, // oldest message_id loaded — for `?before=` pagination
  error: null,
  pendingIds: new Set(),
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

function dedup(arr) {
  const seen = new Set();
  return arr.filter((m) => {
    const key = m.message_id || m._clientMsgId;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function mergeServerMsg(messages, pendingIds, serverMsg) {
  // Match optimistic by client_msg_id → replace in place
  const idx = messages.findIndex(
    (m) => m._clientMsgId && m._clientMsgId === serverMsg.client_msg_id,
  );
  if (idx !== -1) {
    const updated = [...messages];
    updated[idx] = { ...serverMsg };
    const newPending = new Set(pendingIds);
    newPending.delete(serverMsg.client_msg_id);
    return { messages: updated, pendingIds: newPending };
  }
  if (messages.some((m) => m.message_id === serverMsg.message_id)) {
    return { messages, pendingIds };
  }
  return { messages: [...messages, serverMsg], pendingIds };
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

export function threadReducer(state, action) {
  switch (action.type) {
    case "LOAD_START":
      return { ...state, loading: true, error: null };

    case "LOAD_SUCCESS": {
      // Backend returns `data: MessageDTO[]` (newest first). `action.page` IS that array.
      const incoming = Array.isArray(action.page) ? action.page : [];
      // Reverse so our internal array stays oldest-first.
      const sorted = [...incoming].reverse();
      const merged = action.append
        ? dedup([...sorted, ...state.messages])
        : dedup([...sorted, ...state.messages.filter((m) => m._clientMsgId)]);
      const oldestId =
        sorted.length > 0 ? sorted[0].message_id : state.nextCursor;
      return {
        ...state,
        messages: merged,
        loading: false,
        refreshing: false,
        hasMore: incoming.length >= (action.limit || 40),
        nextCursor: oldestId,
      };
    }

    case "LOAD_ERROR":
      return {
        ...state,
        loading: false,
        refreshing: false,
        error: action.message,
      };

    case "OPTIMISTIC_SEND": {
      const optimistic = {
        _clientMsgId: action.client_msg_id,
        message_id: action.client_msg_id,
        body: action.body,
        sender_client_id: action.myClientId,
        kind: "text",
        created_at: new Date().toISOString(),
        _pending: true,
      };
      const newPending = new Set(state.pendingIds);
      newPending.add(action.client_msg_id);
      return {
        ...state,
        messages: [...state.messages, optimistic],
        pendingIds: newPending,
      };
    }

    case "SEND_CONFIRMED": {
      const { messages, pendingIds } = mergeServerMsg(
        state.messages,
        state.pendingIds,
        action.serverMsg,
      );
      return { ...state, messages, pendingIds };
    }

    case "SEND_FAILED": {
      return {
        ...state,
        messages: state.messages.map((m) =>
          m._clientMsgId === action.client_msg_id
            ? { ...m, _failed: true, _pending: false }
            : m,
        ),
      };
    }

    // WS frame shape: { type:"message", room_id, message: MessageDTO }
    case "WS_MESSAGE": {
      const msg = action.frame?.message;
      if (!msg) return state;
      // Own echo — merge with any optimistic placeholder, never duplicate
      if (msg.sender_client_id === action.myClientId) {
        const { messages, pendingIds } = mergeServerMsg(
          state.messages,
          state.pendingIds,
          msg,
        );
        return { ...state, messages, pendingIds };
      }
      if (state.messages.some((m) => m.message_id === msg.message_id)) {
        return state;
      }
      return { ...state, messages: [...state.messages, msg] };
    }

    // WS frame shape: { type:"edited", room_id, message: MessageDTO }
    case "WS_EDITED": {
      const msg = action.frame?.message;
      if (!msg) return state;
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.message_id === msg.message_id
            ? { ...m, body: msg.body, is_edited: true }
            : m,
        ),
      };
    }

    // WS frame shape: { type:"deleted", room_id, message_id }
    case "WS_DELETED": {
      const targetId = action.frame?.message_id;
      if (targetId == null) return state;
      return {
        ...state,
        messages: state.messages.map((m) =>
          m.message_id === targetId ? { ...m, is_deleted: true } : m,
        ),
      };
    }

    default:
      return state;
  }
}
