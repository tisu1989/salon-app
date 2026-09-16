import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Provider } from "react-redux";
import { RouterProvider } from "react-router-dom";
import { store } from "./app/store";
import { SessionBoot } from "./app/SessionBoot";
import { router } from "./app/router";
import "./styles/global.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <Provider store={store}>
      <SessionBoot>
        <RouterProvider router={router} />
      </SessionBoot>
    </Provider>
  </StrictMode>,
);
