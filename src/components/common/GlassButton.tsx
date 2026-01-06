import React from 'react';
import { clsx } from 'clsx';

interface GlassButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger';
    size?: 'sm' | 'md' | 'lg';
    icon?: React.ReactNode;
    fullWidth?: boolean;
}

export const GlassButton: React.FC<GlassButtonProps> = ({
    children,
    className,
    variant = 'primary',
    size = 'md',
    icon,
    fullWidth = false,
    ...props
}) => {
    const baseStyles = "relative group overflow-hidden rounded-2xl transition-all duration-300 active:scale-95 touch-none border border-white/10 backdrop-blur-md";

    const variants = {
        primary: "bg-gradient-to-r from-cyan-500/80 to-blue-600/80 hover:from-cyan-400 hover:to-blue-500 text-white shadow-[0_0_20px_rgba(6,182,212,0.3)]",
        secondary: "bg-white/5 hover:bg-white/10 text-white hover:text-cyan-200",
        danger: "bg-gradient-to-r from-red-500/80 to-rose-600/80 hover:from-red-400 hover:to-rose-500 text-white shadow-[0_0_20px_rgba(225,29,72,0.3)]",
    };

    const sizes = {
        sm: "px-4 py-2 text-sm",
        md: "px-6 py-3 text-base",
        lg: "px-8 py-4 text-xl font-bold tracking-widest",
    };

    return (
        <button
            className={clsx(
                baseStyles,
                variants[variant],
                sizes[size],
                fullWidth ? 'w-full' : 'w-auto',
                className
            )}
            {...props}
        >
            {/* Shine Effect */}
            <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.2)_50%,transparent_75%)] bg-[length:250%_250%,100%_100%] bg-no-repeat opacity-0 group-hover:opacity-100 animate-[shine_3s_infinite]" />

            {/* Content having z-index to stay on top of effects */}
            <div className="relative flex items-center justify-center gap-3">
                {icon && <span className="text-current">{icon}</span>}
                {children}
            </div>
        </button>
    );
};
