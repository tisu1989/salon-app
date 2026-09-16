import { useState } from "react";
import { useSearchCustomersQuery, useCreateCustomerMutation } from "../customers/customer.api";
import type { Customer } from "../customers/customer.types";
import styles from "./NewBookingWizard.module.css";

export function CustomerStep({ onSelect }: { onSelect: (customer: Customer) => void }) {
  const [query, setQuery] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [showCreate, setShowCreate] = useState(false);

  const { data: results, isFetching } = useSearchCustomersQuery(query, { skip: query.length < 2 });
  const [createCustomer, { isLoading: creating, error: createError }] =
    useCreateCustomerMutation();

  const handleCreate = async () => {
    if (!newName.trim() || !newPhone.trim()) return;
    const customer = await createCustomer({ name: newName.trim(), phone: newPhone.trim() }).unwrap();
    onSelect(customer);
  };

  return (
    <div>
      <div className={styles.field}>
        <label htmlFor="customer-search">Search by name or phone</label>
        <input
          id="customer-search"
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. Asha or +91…"
        />
      </div>

      {query.length >= 2 && (
        <div className={styles.optionList} style={{ marginTop: 12 }}>
          {isFetching && <p className={styles.empty}>Searching…</p>}
          {!isFetching && results?.length === 0 && (
            <p className={styles.empty}>No matches. Add them as a new customer below.</p>
          )}
          {results?.map((customer) => (
            <button
              key={customer.id}
              type="button"
              className={styles.optionCard}
              onClick={() => onSelect(customer)}
            >
              <span>{customer.name}</span>
              <span className={styles.optionMeta}>{customer.phone}</span>
            </button>
          ))}
        </div>
      )}

      {!showCreate ? (
        <button
          type="button"
          className={styles.button}
          style={{ marginTop: 16 }}
          onClick={() => setShowCreate(true)}
        >
          + New customer
        </button>
      ) : (
        <div className={styles.panel} style={{ marginTop: 16, padding: 16 }}>
          <div className={styles.field}>
            <label htmlFor="new-customer-name">Name</label>
            <input
              id="new-customer-name"
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
            />
          </div>
          <div className={styles.field}>
            <label htmlFor="new-customer-phone">Phone</label>
            <input
              id="new-customer-phone"
              type="tel"
              value={newPhone}
              onChange={(e) => setNewPhone(e.target.value)}
            />
          </div>
          {createError && <p className={styles.error}>Couldn't save that customer. Try again.</p>}
          <button
            type="button"
            className={`${styles.button} ${styles.buttonPrimary}`}
            disabled={creating || !newName.trim() || !newPhone.trim()}
            onClick={handleCreate}
          >
            {creating ? "Saving…" : "Use this customer"}
          </button>
        </div>
      )}
    </div>
  );
}
