import { createApi, fetchBaseQuery, type BaseQueryFn } from "@reduxjs/toolkit/query/react";
import type { FetchArgs, FetchBaseQueryError } from "@reduxjs/toolkit/query/react";
import { accessTokenRefreshed, loggedOut } from "../features/auth/auth.slice";
import type { LoginResponse } from "../features/auth/auth.types";
import type { RootState } from "./store";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:4000/api/v1";

const rawBaseQuery = fetchBaseQuery({
  baseUrl: API_BASE_URL,
  prepareHeaders: (headers, { getState }) => {
    const accessToken = (getState() as RootState).auth.accessToken;
    if (accessToken) {
      headers.set("Authorization", `Bearer ${accessToken}`);
    }
    return headers;
  },
});

/**
 * Wraps every request so a single 401 doesn't just fail - it first tries to redeem the
 * stored refresh token for a new access token and replays the original request once.
 * Only a *second* failure (or no refresh token at all) actually logs the user out.
 * This is what makes a token refresh invisible to every screen in the app: no screen's
 * own code ever has to know tokens expire.
 */
const baseQueryWithReauth: BaseQueryFn<string | FetchArgs, unknown, FetchBaseQueryError> = async (
  args,
  api,
  extraOptions,
) => {
  let result = await rawBaseQuery(args, api, extraOptions);

  if (result.error?.status === 401) {
    const refreshToken = (api.getState() as RootState).auth.refreshToken;
    if (!refreshToken) {
      api.dispatch(loggedOut());
      return result;
    }

    const refreshResult = await rawBaseQuery(
      { url: "/auth/refresh", method: "POST", body: { refreshToken } },
      api,
      extraOptions,
    );

    if (refreshResult.data) {
      const { accessToken } = refreshResult.data as LoginResponse;
      api.dispatch(accessTokenRefreshed({ accessToken }));
      result = await rawBaseQuery(args, api, extraOptions);
    } else {
      api.dispatch(loggedOut());
    }
  }

  return result;
};

export const baseApi = createApi({
  reducerPath: "api",
  baseQuery: baseQueryWithReauth,
  tagTypes: ["Appointment", "Staff", "Service", "Customer", "Notification"],
  endpoints: () => ({}),
});
