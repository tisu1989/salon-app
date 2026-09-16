import { baseApi } from "../../app/base-api";
import type { ServiceItem } from "./service.types";

export interface CreateServiceRequest {
  name: string;
  category?: string;
  durationMinutes: number;
  price: number;
}

export interface UpdateServiceRequest {
  id: number;
  name?: string;
  category?: string | null;
  durationMinutes?: number;
  price?: number;
}

export const serviceApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listServices: build.query<ServiceItem[], void>({
      query: () => "/services",
      transformResponse: (res: { services: ServiceItem[] }) => res.services,
      providesTags: (result) =>
        result
          ? [
              ...result.map((s) => ({ type: "Service" as const, id: s.id })),
              { type: "Service" as const, id: "LIST" },
            ]
          : [{ type: "Service" as const, id: "LIST" }],
    }),
    createService: build.mutation<ServiceItem, CreateServiceRequest>({
      query: (body) => ({ url: "/services", method: "POST", body }),
      transformResponse: (res: { service: ServiceItem }) => res.service,
      invalidatesTags: [{ type: "Service", id: "LIST" }],
    }),
    updateService: build.mutation<ServiceItem, UpdateServiceRequest>({
      query: ({ id, ...body }) => ({ url: `/services/${id}`, method: "PATCH", body }),
      transformResponse: (res: { service: ServiceItem }) => res.service,
      invalidatesTags: (_result, _error, { id }) => [{ type: "Service", id }],
    }),
    deactivateService: build.mutation<ServiceItem, number>({
      query: (id) => ({ url: `/services/${id}/deactivate`, method: "PATCH" }),
      transformResponse: (res: { service: ServiceItem }) => res.service,
      invalidatesTags: (_result, _error, id) => [{ type: "Service", id }],
    }),
  }),
});

export const {
  useListServicesQuery,
  useCreateServiceMutation,
  useUpdateServiceMutation,
  useDeactivateServiceMutation,
} = serviceApi;
