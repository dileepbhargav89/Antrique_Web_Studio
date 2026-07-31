import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { Button } from './button';

describe('Button', () => {
  it('renders accessible text content', () => {
    render(<Button>Get a quote</Button>);
    expect(screen.getByRole('button', { name: 'Get a quote' })).toBeInTheDocument();
  });

  it('fires onClick when clicked', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(<Button onClick={onClick}>Submit</Button>);

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not fire onClick when disabled', async () => {
    const onClick = vi.fn();
    const user = userEvent.setup();
    render(
      <Button onClick={onClick} disabled>
        Submit
      </Button>,
    );

    await user.click(screen.getByRole('button', { name: 'Submit' }));

    expect(onClick).not.toHaveBeenCalled();
  });

  it('applies the requested variant/size as data attributes', () => {
    render(
      <Button variant="destructive" size="sm">
        Delete
      </Button>,
    );
    const button = screen.getByRole('button', { name: 'Delete' });
    expect(button).toHaveAttribute('data-variant', 'destructive');
    expect(button).toHaveAttribute('data-size', 'sm');
  });
});
