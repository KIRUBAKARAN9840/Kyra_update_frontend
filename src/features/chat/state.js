export const initialInboxState = {
  items: {}, // { [room_id]: InboxItem }
  order: [], // [room_id, ...] sorted by last_message_at DESC
  nextCursor: null,
  hasMore: false,
  loading: false,
  refreshing: false,
  error: null,
};

export function inboxReducer(state, action) {
  switch (action.type) {
    case "LOAD_START":
      return { ...state, loading: true, error: null };

    case "REFRESH_START":
      return { ...state, refreshing: true, error: null };

    case "LOAD_SUCCESS": {
      const { page, append } = action;
      const incoming = page.items;
      const nextItems = append ? { ...state.items } : {};
      const nextOrder = append ? [...state.order] : [];
      for (const it of incoming) {
        if (!nextItems[it.room_id]) nextOrder.push(it.room_id);
        nextItems[it.room_id] = it;
      }
      return {
        ...state,
        items: nextItems,
        order: nextOrder,
        nextCursor: page.next_cursor,
        hasMore: page.has_more,
        loading: false,
        refreshing: false,
        error: null,
      };
    }

    case "LOAD_ERROR":
      return {
        ...state,
        loading: false,
        refreshing: false,
        error: action.message,
      };

    case "WS_MESSAGE": {
      const { frame, myClientId, openRoomId } = action;
      const existing = state.items[frame.room_id];
      if (!existing) return state;

      const isMine = frame.message.sender_client_id === myClientId;
      const userIsViewingThisRoom = openRoomId === frame.room_id;
      const bumpUnread = !isMine && !userIsViewingThisRoom;

      const patched = {
        ...existing,
        last_message_at: frame.message.created_at,
        last_message: {
          message_id: frame.message.message_id,
          sender_client_id: frame.message.sender_client_id,
          body: frame.message.body,
          kind: frame.message.kind,
          created_at: frame.message.created_at,
          is_deleted: frame.message.is_deleted,
        },
        unread_count: bumpUnread
          ? existing.unread_count + 1
          : existing.unread_count,
      };

      const filtered = state.order.filter((id) => id !== frame.room_id);
      return {
        ...state,
        items: { ...state.items, [frame.room_id]: patched },
        order: [frame.room_id, ...filtered],
      };
    }

    case "WS_EDITED": {
      const { frame } = action;
      const existing = state.items[frame.room_id];
      if (!existing?.last_message) return state;
      if (existing.last_message.message_id !== frame.message.message_id)
        return state;
      return {
        ...state,
        items: {
          ...state.items,
          [frame.room_id]: {
            ...existing,
            last_message: {
              ...existing.last_message,
              body: frame.message.body,
              is_deleted: false,
            },
          },
        },
      };
    }

    case "WS_DELETED": {
      const { frame } = action;
      const existing = state.items[frame.room_id];
      if (!existing?.last_message) return state;
      if (existing.last_message.message_id !== frame.message_id) return state;
      return {
        ...state,
        items: {
          ...state.items,
          [frame.room_id]: {
            ...existing,
            last_message: {
              ...existing.last_message,
              body: "[deleted]",
              is_deleted: true,
            },
          },
        },
      };
    }

    case "RESET_UNREAD": {
      const existing = state.items[action.room_id];
      if (!existing || existing.unread_count === 0) return state;
      return {
        ...state,
        items: {
          ...state.items,
          [action.room_id]: { ...existing, unread_count: 0 },
        },
      };
    }

    default:
      return state;
  }
}
