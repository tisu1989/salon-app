import { NavLink, Outlet } from "react-router-dom";
import { useAppSelector } from "./hooks";
import styles from "./AppShell.module.css";

/**
 * The persistent frame every logged-in screen renders inside. Same nav items render two
 * ways depending on viewport - a fixed bottom tab bar below 1024px (phone + tablet tiers),
 * a persistent left sidebar at/above it (desktop/back-office tier) - per the Blueprint's
 * "Responsive rules" section. "Manage" only renders for ADMIN, matching the Navigation
 * map's "admin-only branches simply don't render for a Staff account."
 */
export function AppShell() {
  const isAdmin = useAppSelector((s) => s.auth.staff?.role === "ADMIN");

  const navItems = [
    { to: "/", label: "Today", end: true },
    { to: "/customers", label: "Customers" },
    ...(isAdmin ? [{ to: "/manage", label: "Manage" }] : []),
    { to: "/account", label: "Account" },
  ];

  return (
    <div className={styles.shell}>
      <nav className={styles.sidebar} aria-label="Primary">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={styles.sidebarLink}>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <main className={styles.main}>
        <Outlet />
      </main>

      <nav className={styles.tabBar} aria-label="Primary">
        {navItems.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={styles.tabLink}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
