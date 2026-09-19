import { render } from "@testing-library/react";
import type { ReactElement } from "react";
import { Provider } from "react-redux";
import { MemoryRouter } from "react-router-dom";
import { makeStore } from "../app/store";

/** Renders a screen the way the real app does (Redux + Router), with a fresh store per call. */
export function renderWithProviders(ui: ReactElement, { route = "/" } = {}) {
  const store = makeStore();
  const result = render(
    <Provider store={store}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </Provider>,
  );
  return { store, ...result };
}
