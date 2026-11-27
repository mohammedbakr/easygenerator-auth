import { zodResolver } from '@hookform/resolvers/zod';
import { useId, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { useLocation, useNavigate } from 'react-router';
import { applyApiError, getRedirectTarget } from '../errors';
import { useSignUp } from '../hooks';
import { signUpSchema, type SignUpValues } from '../schemas';
import { FormError } from './FormError';
import { PasswordChecklist } from './PasswordChecklist';
import { SubmitButton } from './SubmitButton';
import { TextField } from './TextField';

export function SignUpForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const signUp = useSignUp();
  const checklistId = useId();
  const [formError, setFormError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    control,
    formState: { errors },
  } = useForm<SignUpValues>({
    resolver: zodResolver(signUpSchema),
    mode: 'onTouched',
    defaultValues: { email: '', name: '', password: '' },
  });

  const password = useWatch({ control, name: 'password' });

  const onSubmit = (values: SignUpValues) => {
    setFormError(null);
    signUp.mutate(values, {
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
        label="Name"
        autoComplete="name"
        error={errors.name?.message}
        {...register('name')}
      />
      <TextField
        label="Password"
        type="password"
        reveal
        autoComplete="new-password"
        describedBy={checklistId}
        error={errors.password?.message}
        {...register('password')}
      />
      <PasswordChecklist id={checklistId} password={password} />
      <SubmitButton pending={signUp.isPending}>Create account</SubmitButton>
    </form>
  );
}
