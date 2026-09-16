import { NavLink, Outlet } from "react-router-dom";
import styles from "./AppShell.module.css";

const NAV_ITEMS = [
  { to: "/", label: "Today", end: true },
  { to: "/staff", label: "Staff" },
  { to: "/services", label: "Services" },
];

/**
 * The persistent frame every logged-in screen renders inside. Same nav items render two
 * ways depending on viewport - a fixed bottom tab bar below 1024px (phone + tablet tiers),
 * a persistent left sidebar at/above it (desktop/back-office tier) - per the Blueprint's
 * "Responsive rules" section. CSS media queries pick one; both exist in the DOM at once.
 */
export function AppShell() {
  return (
    <div className={styles.shell}>
      <nav className={styles.sidebar} aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.end}
            className={styles.sidebarLink}
          >
            {item.label}
          </NavLink>
        ))}
      </nav>

      <main className={styles.main}>
        <Outlet />
      </main>

      <nav className={styles.tabBar} aria-label="Primary">
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.end} className={styles.tabLink}>
            {item.label}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
