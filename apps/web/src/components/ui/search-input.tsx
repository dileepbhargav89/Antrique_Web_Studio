import * as React from 'react';
import { SearchIcon } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

function SearchInput({ className, ...props }: React.ComponentProps<'input'>) {
  return (
    <div data-slot="search-input" className="relative">
      <SearchIcon
        aria-hidden="true"
        className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2"
      />
      <Input type="search" className={cn('pl-8', className)} {...props} />
    </div>
  );
}

export { SearchInput };
