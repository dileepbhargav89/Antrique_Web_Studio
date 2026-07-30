import * as React from 'react';

import { Input } from '@/components/ui/input';

export type NumberInputProps = Omit<React.ComponentProps<'input'>, 'type'>;

/** Thin `type="number"` wrapper — no stepper buttons, no unit formatting (that's a business concern). */
function NumberInput(props: NumberInputProps) {
  return <Input type="number" inputMode="numeric" {...props} />;
}

export { NumberInput };
