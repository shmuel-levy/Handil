import axios from 'axios';
import { useCallback, useState } from 'react';
import { login as loginRequest } from '../services/authApi';
import { useAuthStore } from '../store/authStore';

/**
 * Sign-in state and submission.
 *
 * The mobile and desktop login layouts each had their own copy of this logic,
 * which had already drifted — the desktop one reported "שגיאת חיבור" where
 * mobile said "שגיאת חיבור — בדוק אימייל וסיסמה". The layouts stay separate;
 * only the behaviour is shared.
 */
export function useLoginForm() {
  const setAuth = useAuthStore((s) => s.setAuth);

  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  const submit = useCallback(async () => {
    setError('');
    if (!email.trim() || !password) {
      setError('נא למלא אימייל וסיסמה');
      return;
    }

    setLoading(true);
    try {
      const { token, user } = await loginRequest(email.trim(), password);
      setAuth(token, user);
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        // 429 carries the rate-limit message; 401 carries "פרטים שגויים"
        setError(err.response?.data?.message || 'שגיאת חיבור — בדקו אימייל וסיסמה');
      } else {
        setError('אירעה שגיאה, נסו שוב');
      }
    } finally {
      setLoading(false);
    }
  }, [email, password, setAuth]);

  return { email, setEmail, password, setPassword, error, setError, loading, submit };
}
