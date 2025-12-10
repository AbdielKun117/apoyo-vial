import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs) {
    return twMerge(clsx(inputs));
}

export function Button({ className, variant = 'primary', size = 'default', ...props }) {
    const variants = {
        primary: 'bg-primary text-white hover:bg-yellow-500',
        secondary: 'bg-secondary text-white hover:bg-blue-900',
        outline: 'border-2 border-primary text-primary hover:bg-yellow-50 dark:hover:bg-gray-800',
        ghost: 'hover:bg-gray-100 dark:hover:bg-gray-800 text-text-main',
    };

    const sizes = {
        default: 'h-10 px-4 py-2',
        sm: 'h-8 px-3 text-xs',
        lg: 'h-12 px-8 text-lg',
        icon: 'h-10 w-10 p-2',
    };

    return (
        <button
            className={cn(
                'inline-flex items-center justify-center rounded-md font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50',
                variants[variant],
                sizes[size],
                className
            )}
            {...props}
        />
    );
}
