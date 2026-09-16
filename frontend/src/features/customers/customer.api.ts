import { baseApi } from "../../app/base-api";
import type { Customer } from "./customer.types";

export const customerApi = baseApi.injectEndpoints({
  endpoints: (build) => ({
    getCustomer: build.query<Customer, number>({
      query: (id) => `/customers/${id}`,
      transformResponse: (res: { customer: Customer }) => res.customer,
      providesTags: (_result, _error, id) => [{ type: "Customer", id }],
    }),
    searchCustomers: build.query<Customer[], string>({
      query: (q) => `/customers?q=${encodeURIComponent(q)}`,
      transformResponse: (res: { customers: Customer[] }) => res.customers,
    }),
    /**
     * Idempotent by phone on the backend - findOrCreateByPhone returns the existing
     * customer if the phone number is already on file instead of erroring, so this is
     * safe to call for "new customer" even if they secretly already exist.
     */
    createCustomer: build.mutation<Customer, { name: string; phone: string }>({
      query: (body) => ({ url: "/customers", method: "POST", body }),
      transformResponse: (res: { customer: Customer }) => res.customer,
    }),
  }),
});

export const {
  useGetCustomerQuery,
  useSearchCustomersQuery,
  useCreateCustomerMutation,
} = customerApi;
