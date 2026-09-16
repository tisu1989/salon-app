import { baseApi } from "../../app/base-api";
import type { NotificationLogEntry, NotificationStatus } from "./notification.types";

export const notificationApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listNotifications: build.query<NotificationLogEntry[], { status?: NotificationStatus }>({
      query: ({ status }) => `/notifications${status ? `?status=${status}` : ""}`,
      transformResponse: (res: { notifications: NotificationLogEntry[] }) => res.notifications,
      providesTags: (result) =>
        result
          ? [
              ...result.map((n) => ({ type: "Notification" as const, id: n.id })),
              { type: "Notification" as const, id: "LIST" },
            ]
          : [{ type: "Notification" as const, id: "LIST" }],
    }),
    retryNotification: build.mutation<void, number>({
      query: (id) => ({ url: `/notifications/${id}/retry`, method: "POST" }),
      invalidatesTags: [{ type: "Notification", id: "LIST" }],
    }),
  }),
});

export const { useListNotificationsQuery, useRetryNotificationMutation } = notificationApi;
