import { Link } from "react-router-dom";
import styles from "./ManagePage.module.css";

const CARDS = [
  { to: "/staff", title: "Staff", meta: "Directory, add/edit, schedules" },
  { to: "/services", title: "Services", meta: "Menu, add/edit" },
  { to: "/notifications", title: "Notification log", meta: "Delivery status, manual retry" },
];

export function ManagePage() {
  return (
    <div>
      <h1>Manage</h1>
      <div className={styles.grid} style={{ marginTop: 20 }}>
        {CARDS.map((card) => (
          <Link key={card.to} to={card.to} className={styles.card}>
            <p className={styles.cardTitle}>{card.title}</p>
            <p className={styles.cardMeta}>{card.meta}</p>
          </Link>
        ))}
      </div>
    </div>
  );
}
