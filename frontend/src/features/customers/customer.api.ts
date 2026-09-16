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
  }),
});

export const { useGetCustomerQuery, useSearchCustomersQuery } = customerApi;
