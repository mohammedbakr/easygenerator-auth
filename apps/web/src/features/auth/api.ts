import { http } from '@/lib/http';
import type { SignInValues, SignUpValues } from './schemas';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
}

export async function signUp(values: SignUpValues): Promise<AuthUser> {
  const { data } = await http.post<AuthUser>('/auth/signup', values);
  return data;
}

export async function signIn(values: SignInValues): Promise<AuthUser> {
  const { data } = await http.post<AuthUser>('/auth/signin', values);
  return data;
}

export async function logout(): Promise<void> {
  await http.post('/auth/logout');
}

export async function getMe(): Promise<AuthUser> {
  const { data } = await http.get<AuthUser>('/users/me');
  return data;
}
