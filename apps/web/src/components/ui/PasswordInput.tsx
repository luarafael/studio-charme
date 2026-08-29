import { forwardRef, useState, type InputHTMLAttributes } from 'react';
import { Eye, EyeOff } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Input } from './Input';

export type PasswordInputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'type'>;

export const PasswordInput = forwardRef<HTMLInputElement, PasswordInputProps>(
  function PasswordInput({ className, ...props }, ref) {
    const [visible, setVisible] = useState(false);

    return (
      <div className="relative">
        <Input
          ref={ref}
          {...props}
          type={visible ? 'text' : 'password'}
          className={cn('pr-12', className)}
        />
        <button
          type="button"
          onClick={() => setVisible((current) => !current)}
          className={cn(
            'text-brown-500 hover:text-brown-900 absolute top-1/2 right-1.5 flex size-9 -translate-y-1/2',
            'items-center justify-center rounded-control',
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-gold-500/35',
          )}
          aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'}
          aria-pressed={visible}
        >
          {visible ? (
            <EyeOff className="size-5" aria-hidden="true" />
          ) : (
            <Eye className="size-5" aria-hidden="true" />
          )}
        </button>
      </div>
    );
  },
);
