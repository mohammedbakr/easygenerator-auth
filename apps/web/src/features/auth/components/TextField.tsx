import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { useId, useState, type ComponentProps } from 'react';
import { Button } from '@/components/ui/button';
import { Field, FieldError, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';

interface TextFieldProps extends Omit<ComponentProps<'input'>, 'id'> {
  label: string;
  error?: string;
  reveal?: boolean;
  /** Extra element linked via aria-describedby (e.g. the password checklist). */
  describedBy?: string;
}

/** Label + input + linked error text. Accessibility wiring lives here once, for every field. */
export function TextField({
  label,
  error,
  reveal = false,
  describedBy,
  type = 'text',
  ...inputProps
}: TextFieldProps) {
  const id = useId();
  const errorId = `${id}-error`;
  const [shown, setShown] = useState(false);
  const describedIds = [error ? errorId : undefined, describedBy].filter(Boolean).join(' ');

  return (
    <Field data-invalid={error ? true : undefined}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <div className="relative">
        <Input
          id={id}
          type={reveal && shown ? 'text' : type}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedIds || undefined}
          className={reveal ? 'h-10 pr-12 md:h-9 md:pr-10' : 'h-10 md:h-9'}
          {...inputProps}
        />
        {reveal && (
          // Centred with flex, not translate: the Button's pressed state uses translate-y and would
          // overwrite a translate-based centring, making the icon jump while clicked.
          <div className="absolute inset-y-0 right-1 flex items-center">
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              className="size-10 md:size-7"
              aria-label={shown ? 'Hide password' : 'Show password'}
              aria-pressed={shown}
              onClick={() => setShown((value) => !value)}
            >
              {shown ? <EyeOffIcon aria-hidden="true" /> : <EyeIcon aria-hidden="true" />}
            </Button>
          </div>
        )}
      </div>
      {error && <FieldError id={errorId}>{error}</FieldError>}
    </Field>
  );
}
