import { configureStore } from "@reduxjs/toolkit";
import { authReducer } from "../features/auth/auth.slice";
import { baseApi } from "./base-api";

export const store = configureStore({
  reducer: {
    auth: authReducer,
    [baseApi.reducerPath]: baseApi.reducer,
  },
  middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
  // Redux DevTools browser extension: inspect actions, auth state, and the RTK Query cache.
  // Off in production builds so state (including the access token) isn't inspectable there.
  devTools: import.meta.env.DEV,
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
