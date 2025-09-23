'use client';

import { cn } from '@/lib/utils';

interface PasswordRequirementsProps {
  password?: string;
  className?: string;
}

export function PasswordRequirements({ password = '', className }: PasswordRequirementsProps) {
  const requirements = [
    {
      text: 'At least 6 characters',
      met: password.length >= 6,
    },
  ];

  return (
    <div className={cn('space-y-2', className)}>
      <p className="text-sm text-zinc-600 dark:text-zinc-400 font-medium">
        Password requirements:
      </p>
      <ul className="space-y-1">
        {requirements.map((requirement, index) => (
          <li
            key={index}
            className={cn(
              'text-sm flex items-center gap-2',
              requirement.met
                ? 'text-green-600 dark:text-green-400'
                : 'text-zinc-500 dark:text-zinc-500'
            )}
          >
            <span
              className={cn(
                'w-1.5 h-1.5 rounded-full',
                requirement.met
                  ? 'bg-green-600 dark:bg-green-400'
                  : 'bg-zinc-400 dark:bg-zinc-600'
              )}
            />
            {requirement.text}
          </li>
        ))}
      </ul>
    </div>
  );
}