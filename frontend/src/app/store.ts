import { configureStore } from "@reduxjs/toolkit";
import { authReducer } from "../features/auth/auth.slice";
import { baseApi } from "./base-api";

// A factory, not just a singleton, so tests can build an isolated store per test.
export function makeStore() {
  return configureStore({
    reducer: {
      auth: authReducer,
      [baseApi.reducerPath]: baseApi.reducer,
    },
    middleware: (getDefaultMiddleware) => getDefaultMiddleware().concat(baseApi.middleware),
    // Redux DevTools browser extension: inspect actions, auth state, and the RTK Query cache.
    // Off in production builds so state (including the access token) isn't inspectable there.
    devTools: import.meta.env.DEV,
  });
}

export const store = makeStore();

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];
