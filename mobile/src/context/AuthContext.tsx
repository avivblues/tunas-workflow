import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { LoginForm, LoginResult } from '../services/auth.service';
import { loginMobile } from '../services/auth.service';

const TOKEN_KEY = 'tunas_token';
const USER_KEY = 'tunas_user';

interface AuthUser {
  id: string;
  fullName: string;
  roleCode: string | null;
  tenantId: string;
}

interface AuthContextValue {
  token: string | null;
  user: AuthUser | null;
  loading: boolean;
  login: (form: LoginForm) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    AsyncStorage.multiGet([TOKEN_KEY, USER_KEY])
      .then((pairs) => {
        const storedToken = pairs[0][1];
        const storedUser = pairs[1][1];
        if (storedToken && storedUser) {
          setToken(storedToken);
          setUser(JSON.parse(storedUser) as AuthUser);
        }
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const login = useCallback(async (form: LoginForm) => {
    const result: LoginResult = await loginMobile(form);
    setToken(result.token);
    setUser(result.user);
    await AsyncStorage.multiSet([
      [TOKEN_KEY, result.token],
      [USER_KEY, JSON.stringify(result.user)],
    ]);
  }, []);

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
  }, []);

  const value = useMemo(
    () => ({ token, user, loading, login, logout }),
    [token, user, loading, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
