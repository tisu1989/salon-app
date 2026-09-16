import { useGetCustomerQuery } from "../customers/customer.api";

/**
 * The appointment list endpoint returns customerId only, not a joined customer record
 * (Blueprint > Backend Gaps). Each row fetches its own customer by id; RTK Query caches
 * by id so a customer with several appointments today only costs one request.
 */
export function CustomerName({ customerId }: { customerId: number }) {
  const { data: customer, isLoading } = useGetCustomerQuery(customerId);
  if (isLoading) return <span>…</span>;
  return <span>{customer?.name ?? `Customer #${customerId}`}</span>;
}
