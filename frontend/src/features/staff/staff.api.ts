import { baseApi } from "../../app/base-api";
import type { StaffMember, TimeOffBlock, WorkingHoursRule } from "./staff.types";

export interface CreateStaffRequest {
  name: string;
  phone: string;
  email?: string;
  password: string;
  role: "STAFF" | "ADMIN";
}

export interface UpdateStaffRequest {
  id: number;
  name?: string;
  email?: string | null;
}

export interface WorkingHoursRuleInput {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
}

export interface CreateTimeOffRequest {
  staffId: number;
  startDateTime: string;
  endDateTime: string;
  reason?: string;
}

export const staffApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listStaff: build.query<StaffMember[], void>({
      query: () => "/staff",
      transformResponse: (res: { staff: StaffMember[] }) => res.staff,
      providesTags: (result) =>
        result
          ? [
              ...result.map((s) => ({ type: "Staff" as const, id: s.id })),
              { type: "Staff" as const, id: "LIST" },
            ]
          : [{ type: "Staff" as const, id: "LIST" }],
    }),
    createStaff: build.mutation<StaffMember, CreateStaffRequest>({
      query: (body) => ({ url: "/staff", method: "POST", body }),
      transformResponse: (res: { staff: StaffMember }) => res.staff,
      invalidatesTags: [{ type: "Staff", id: "LIST" }],
    }),
    updateStaff: build.mutation<StaffMember, UpdateStaffRequest>({
      query: ({ id, ...body }) => ({ url: `/staff/${id}`, method: "PATCH", body }),
      transformResponse: (res: { staff: StaffMember }) => res.staff,
      invalidatesTags: (_result, _error, { id }) => [{ type: "Staff", id }],
    }),
    deactivateStaff: build.mutation<StaffMember, number>({
      query: (id) => ({ url: `/staff/${id}/deactivate`, method: "PATCH" }),
      transformResponse: (res: { staff: StaffMember }) => res.staff,
      invalidatesTags: (_result, _error, id) => [{ type: "Staff", id }],
    }),
    resetStaffPassword: build.mutation<StaffMember, { id: number; password: string }>({
      query: ({ id, password }) => ({
        url: `/staff/${id}/reset-password`,
        method: "PATCH",
        body: { password },
      }),
      transformResponse: (res: { staff: StaffMember }) => res.staff,
    }),

    getWorkingHours: build.query<WorkingHoursRule[], number>({
      query: (staffId) => `/staff/${staffId}/working-hours`,
      transformResponse: (res: { workingHours: WorkingHoursRule[] }) => res.workingHours,
      providesTags: (_result, _error, staffId) => [{ type: "Staff", id: `${staffId}-hours` }],
    }),
    setWorkingHours: build.mutation<
      WorkingHoursRule[],
      { staffId: number; rules: WorkingHoursRuleInput[] }
    >({
      query: ({ staffId, rules }) => ({
        url: `/staff/${staffId}/working-hours`,
        method: "PUT",
        body: { rules },
      }),
      transformResponse: (res: { workingHours: WorkingHoursRule[] }) => res.workingHours,
      invalidatesTags: (_result, _error, { staffId }) => [{ type: "Staff", id: `${staffId}-hours` }],
    }),

    listTimeOff: build.query<TimeOffBlock[], number>({
      query: (staffId) => `/staff/${staffId}/time-off`,
      transformResponse: (res: { timeOff: TimeOffBlock[] }) => res.timeOff,
      providesTags: (_result, _error, staffId) => [{ type: "Staff", id: `${staffId}-timeoff` }],
    }),
    createTimeOff: build.mutation<TimeOffBlock, CreateTimeOffRequest>({
      query: ({ staffId, ...body }) => ({
        url: `/staff/${staffId}/time-off`,
        method: "POST",
        body,
      }),
      transformResponse: (res: { timeOff: TimeOffBlock }) => res.timeOff,
      invalidatesTags: (_result, _error, { staffId }) => [
        { type: "Staff", id: `${staffId}-timeoff` },
      ],
    }),
    deleteTimeOff: build.mutation<void, { staffId: number; timeOffId: number }>({
      query: ({ staffId, timeOffId }) => ({
        url: `/staff/${staffId}/time-off/${timeOffId}`,
        method: "DELETE",
      }),
      invalidatesTags: (_result, _error, { staffId }) => [
        { type: "Staff", id: `${staffId}-timeoff` },
      ],
    }),
  }),
});

export const {
  useListStaffQuery,
  useCreateStaffMutation,
  useUpdateStaffMutation,
  useDeactivateStaffMutation,
  useResetStaffPasswordMutation,
  useGetWorkingHoursQuery,
  useSetWorkingHoursMutation,
  useListTimeOffQuery,
  useCreateTimeOffMutation,
  useDeleteTimeOffMutation,
} = staffApi;
