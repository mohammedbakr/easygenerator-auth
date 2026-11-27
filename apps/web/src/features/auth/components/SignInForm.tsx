import { zodResolver } from '@hookform/resolvers/zod';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router';
import { applyApiError, getRedirectTarget } from '../errors';
import { useSignIn } from '../hooks';
import { signInSchema, type SignInValues } from '../schemas';
import { FormError } from './FormError';
import { SubmitButton } from './SubmitButton';
import { TextField } from './TextField';

export function SignInForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const signIn = useSignIn();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<SignInValues>({
    resolver: zodResolver(signInSchema),
    mode: 'onTouched',
    defaultValues: { email: '', password: '' },
  });

  const onSubmit = (values: SignInValues) => {
    setFormError(null);
    signIn.mutate(values, {
      onSuccess: () => navigate(getRedirectTarget(location.state), { replace: true }),
      onError: (error) =>
        applyApiError(error, {
          setEmailError: (message) => setError('email', { message }, { shouldFocus: true }),
          setFormError,
        }),
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
      <FormError message={formError} />
      <TextField
        label="Email"
        type="email"
        autoComplete="email"
        error={errors.email?.message}
        {...register('email')}
      />
      <TextField
        label="Password"
        type="password"
        reveal
        autoComplete="current-password"
        error={errors.password?.message}
        {...register('password')}
      />
      <SubmitButton pending={signIn.isPending}>Sign in</SubmitButton>
    </form>
  );
}
