import { CheckCircle2Icon, CircleIcon } from 'lucide-react';
import { PASSWORD_MIN_LENGTH } from '../schemas';

const RULES = [
  {
    label: `At least ${PASSWORD_MIN_LENGTH} characters`,
    test: (v: string) => v.length >= PASSWORD_MIN_LENGTH,
  },
  { label: 'A letter', test: (v: string) => /\p{L}/u.test(v) },
  { label: 'A number', test: (v: string) => /\p{N}/u.test(v) },
  { label: 'A special character', test: (v: string) => /[^\p{L}\p{N}]/u.test(v) },
];

/** Live hints only: the zod schema (same rules) stays the real validation. */
export function PasswordChecklist({ id, password }: { id: string; password: string }) {
  return (
    <ul
      id={id}
      aria-live="polite"
      aria-label="Password requirements"
      className="flex flex-col gap-1 text-sm"
    >
      {RULES.map((rule) => {
        const met = rule.test(password);
        return (
          <li
            key={rule.label}
            data-met={met}
            className={
              met
                ? 'flex items-center gap-2 text-brand'
                : 'flex items-center gap-2 text-muted-foreground'
            }
          >
            {met ? (
              <CheckCircle2Icon className="size-4" aria-hidden="true" />
            ) : (
              <CircleIcon className="size-4" aria-hidden="true" />
            )}
            <span>
              {rule.label}
              <span className="sr-only">{met ? ' (met)' : ' (not met yet)'}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}
