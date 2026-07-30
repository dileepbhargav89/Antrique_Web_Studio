'use client';

import * as React from 'react';
import { Eye, EyeOff } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

export type PasswordInputProps = Omit<React.ComponentProps<'input'>, 'type'>;

function PasswordInput({ className, ...props }: PasswordInputProps) {
  const [visible, setVisible] = React.useState(false);

  return (
    <div data-slot="password-input" className="relative">
      <Input type={visible ? 'text' : 'password'} className={cn('pr-8', className)} {...props} />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
        aria-pressed={visible}
        className="text-muted-foreground hover:text-foreground absolute top-1/2 right-2.5 -translate-y-1/2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 rounded-sm"
      >
        {visible ? (
          <EyeOff aria-hidden="true" className="size-4" />
        ) : (
          <Eye aria-hidden="true" className="size-4" />
        )}
      </button>
    </div>
  );
}

export { PasswordInput };
