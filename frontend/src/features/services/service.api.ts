import { baseApi } from "../../app/base-api";
import type { ServiceItem } from "./service.types";

export const serviceApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listServices: build.query<ServiceItem[], void>({
      query: () => "/services",
      transformResponse: (res: { services: ServiceItem[] }) => res.services,
      providesTags: ["Service"],
    }),
  }),
});

export const { useListServicesQuery } = serviceApi;
