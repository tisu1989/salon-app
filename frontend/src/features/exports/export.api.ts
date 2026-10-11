import { baseApi } from "../../app/base-api";
import type { ExportEntry } from "./export.types";

export const exportApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listExports: build.query<ExportEntry[], void>({
      query: () => "/exports",
      transformResponse: (res: { exports: ExportEntry[] }) => res.exports,
      providesTags: (result) =>
        result
          ? [
              ...result.map((e) => ({ type: "Export" as const, id: e.id })),
              { type: "Export" as const, id: "LIST" },
            ]
          : [{ type: "Export" as const, id: "LIST" }],
    }),
    requestAppointmentsExport: build.mutation<ExportEntry, { date: string }>({
      query: ({ date }) => ({
        url: "/exports",
        method: "POST",
        body: { type: "APPOINTMENTS", date },
      }),
      transformResponse: (res: { export: ExportEntry }) => res.export,
      invalidatesTags: [{ type: "Export", id: "LIST" }],
    }),
    // responseHandler reads the body as a file instead of JSON; fetchBaseQuery still
    // attaches the Authorization header the normal way, so this needs no special handling.
    downloadExport: build.mutation<Blob, number>({
      query: (id) => ({ url: `/exports/${id}/download`, responseHandler: (res) => res.blob() }),
    }),
  }),
});

export const {
  useListExportsQuery,
  useRequestAppointmentsExportMutation,
  useDownloadExportMutation,
} = exportApi;
