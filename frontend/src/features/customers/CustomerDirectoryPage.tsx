import { useState } from "react";
import { Link } from "react-router-dom";
import { useSearchCustomersQuery, useCreateCustomerMutation } from "./customer.api";
import styles from "./CustomerDirectoryPage.module.css";

export function CustomerDirectoryPage() {
  const [query, setQuery] = useState("");
  const { data: results, isFetching } = useSearchCustomersQuery(query, { skip: query.length < 2 });

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [createCustomer, { isLoading: saving, error: createError }] = useCreateCustomerMutation();

  const handleCreate = async () => {
    if (!name.trim() || !phone.trim()) return;
    await createCustomer({ name: name.trim(), phone: phone.trim() }).unwrap();
    setName("");
    setPhone("");
    setCreating(false);
  };

  return (
    <div>
      <div className={styles.header}>
        <h1>Customers</h1>
        {!creating && (
          <button type="button" className={styles.addButton} onClick={() => setCreating(true)}>
            + New customer
          </button>
        )}
      </div>

      {creating && (
        <div className={styles.form}>
          <div className={styles.formRow}>
            <div className={styles.field}>
              <label htmlFor="new-customer-name">Name</label>
              <input id="new-customer-name" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className={styles.field}>
              <label htmlFor="new-customer-phone">Phone</label>
              <input
                id="new-customer-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+91…"
              />
            </div>
          </div>
          {createError && <p className={styles.error}>Couldn't save that customer. Try again.</p>}
          <div className={styles.formActions}>
            <button
              type="button"
              className={styles.addButton}
              disabled={saving || !name.trim() || !phone.trim()}
              onClick={handleCreate}
            >
              {saving ? "Saving…" : "Add customer"}
            </button>
            <button type="button" className={styles.secondaryButton} onClick={() => setCreating(false)}>
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className={styles.searchField}>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or phone…"
        />
      </div>

      {query.length < 2 && <p className={styles.empty}>Type at least 2 characters to search.</p>}
      {query.length >= 2 && isFetching && <p className={styles.empty}>Searching…</p>}
      {query.length >= 2 && !isFetching && results?.length === 0 && (
        <p className={styles.empty}>No customers match "{query}".</p>
      )}

      <div className={styles.grid}>
        {results?.map((customer) => (
          <Link key={customer.id} to={`/customers/${customer.id}`} className={styles.card}>
            <div>
              <div className={styles.name}>{customer.name}</div>
              <div className={styles.meta}>{customer.phone}</div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
