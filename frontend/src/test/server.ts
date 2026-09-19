import { setupServer } from "msw/node";

// The fake backend. Tests add per-test answers with server.use(http.post(...)).
export const server = setupServer();

export const API = "http://api.test/api/v1";
