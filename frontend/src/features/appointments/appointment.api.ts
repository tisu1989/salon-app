import { baseApi } from "../../app/base-api";
import type {
  Appointment,
  CreateAppointmentRequest,
  ListAppointmentsParams,
} from "./appointment.types";

export const appointmentApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    listAppointments: build.query<Appointment[], ListAppointmentsParams>({
      query: ({ staffId, date }) => `/appointments?staffId=${staffId}&date=${date}`,
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
  useListAppointmentsQuery,
  useBookAppointmentMutation,
  useCancelAppointmentMutation,
  useCompleteAppointmentMutation,
  useNoShowAppointmentMutation,
} = appointmentApi;
