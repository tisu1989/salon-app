import { baseApi } from "../../app/base-api";
import type { StaffMember } from "./staff.types";

export const staffApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listStaff: build.query<StaffMember[], void>({
      query: () => "/staff",
      transformResponse: (res: { staff: StaffMember[] }) => res.staff,
      providesTags: ["Staff"],
    }),
  }),
});

export const { useListStaffQuery } = staffApi;
