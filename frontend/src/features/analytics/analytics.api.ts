import { baseApi } from "../../app/base-api";
import type { AnalyticsSummary } from "./analytics.types";

export const analyticsApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAnalyticsSummary: build.query<AnalyticsSummary, number>({
      query: (days) => `/analytics/summary?days=${days}`,
    }),
  }),
});

export const { useGetAnalyticsSummaryQuery } = analyticsApi;
