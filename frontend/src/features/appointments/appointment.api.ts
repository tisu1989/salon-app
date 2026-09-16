import { baseApi } from "../../app/base-api";
import type {
  Appointment,
  AvailabilityParams,
  AvailabilitySlot,
  CreateAppointmentRequest,
  ListAppointmentsParams,
} from "./appointment.types";

export const appointmentApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getAvailability: build.query<AvailabilitySlot[], AvailabilityParams>({
      query: ({ staffId, serviceId, date }) =>
        `/appointments/availability?staffId=${staffId}&serviceId=${serviceId}&date=${date}`,
      transformResponse: (res: { slots: AvailabilitySlot[] }) => res.slots,
    }),
    listAppointments: build.query<Appointment[], ListAppointmentsParams>({
      query: (params) => {
        if ("customerId" in params) return `/appointments?customerId=${params.customerId}`;
        const staffPart = params.staffId !== undefined ? `&staffId=${params.staffId}` : "";
        return `/appointments?date=${params.date}${staffPart}`;
      },
      transformResponse: (res: { appointments: Appointment[] }) => res.appointments,
      providesTags: (result) =>
        result
          ? [
              ...result.map((a) => ({ type: "Appointment" as const, id: a.id })),
              { type: "Appointment" as const, id: "LIST" },
            ]
          : [{ type: "Appointment" as const, id: "LIST" }],
    }),
    bookAppointment: build.mutation<Appointment, CreateAppointmentRequest>({
      query: (body) => ({ url: "/appointments", method: "POST", body }),
      transformResponse: (res: { appointment: Appointment }) => res.appointment,
      invalidatesTags: [{ type: "Appointment", id: "LIST" }],
    }),
    confirmAppointment: build.mutation<Appointment, number>({
      query: (id) => ({ url: `/appointments/${id}/confirm`, method: "PATCH" }),
      transformResponse: (res: { appointment: Appointment }) => res.appointment,
      invalidatesTags: (_result, _error, id) => [{ type: "Appointment", id }],
    }),
    cancelAppointment: build.mutation<Appointment, number>({
      query: (id) => ({ url: `/appointments/${id}/cancel`, method: "PATCH" }),
      transformResponse: (res: { appointment: Appointment }) => res.appointment,
      invalidatesTags: (_result, _error, id) => [{ type: "Appointment", id }],
    }),
    completeAppointment: build.mutation<Appointment, number>({
      query: (id) => ({ url: `/appointments/${id}/complete`, method: "PATCH" }),
      transformResponse: (res: { appointment: Appointment }) => res.appointment,
      invalidatesTags: (_result, _error, id) => [{ type: "Appointment", id }],
    }),
    noShowAppointment: build.mutation<Appointment, number>({
      query: (id) => ({ url: `/appointments/${id}/no-show`, method: "PATCH" }),
      transformResponse: (res: { appointment: Appointment }) => res.appointment,
      invalidatesTags: (_result, _error, id) => [{ type: "Appointment", id }],
    }),
  }),
});

export const {
  useGetAvailabilityQuery,
  useListAppointmentsQuery,
  useBookAppointmentMutation,
  useConfirmAppointmentMutation,
  useCancelAppointmentMutation,
  useCompleteAppointmentMutation,
  useNoShowAppointmentMutation,
} = appointmentApi;
