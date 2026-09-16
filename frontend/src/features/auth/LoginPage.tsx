import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useLoginMutation } from "./auth.api";
import { useAppDispatch } from "../../app/hooks";
import { sessionEstablished } from "./auth.slice";
import styles from "./LoginPage.module.css";

interface ApiError {
  data?: { message?: string };
}

export function LoginPage() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [login, { isLoading }] = useLoginMutation();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setFormError(null);
    try {
      const { staff, accessToken, refreshToken } = await login({
        identifier,
        password,
      }).unwrap();
      dispatch(sessionEstablished({ staff, accessToken, refreshToken }));
      navigate("/", { replace: true });
    } catch (err) {
      const message = (err as ApiError).data?.message ?? "Couldn't sign in. Try again.";
      setFormError(message);
    }
  };

  return (
    <div className={styles.page}>
      <form className={styles.card} onSubmit={handleSubmit}>
        <h1 className={styles.title}>Front Desk</h1>

        {formError && <p className={styles.error}>{formError}</p>}

        <div className={styles.field}>
          <label htmlFor="login-identifier">Phone or email</label>
          <input
            id="login-identifier"
            type="text"
            autoComplete="username"
            value={identifier}
            onChange={(e) => setIdentifier(e.target.value)}
            required
          />
        </div>

        <div className={styles.field}>
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
        </div>

        <button type="submit" className={styles.submit} disabled={isLoading}>
          {isLoading ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </div>
  );
}
