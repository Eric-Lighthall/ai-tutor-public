// reusable button with variant/size presets
import React from 'react';

const Button = ({
    children,
    onClick,
    variant = 'primary',
    size = 'medium',
    disabled = false,
    loading = false,
    className = '',
    type = 'button',
    ...props
}) => {
    const baseClasses = "inline-flex items-center justify-center font-medium focus:outline-none focus:ring-0 transition-colors duration-150 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed";

    const sizeClasses = {
        small: "px-3 py-1.5 text-xs rounded",
        medium: "px-4 py-2 text-sm rounded-md",
        large: "px-6 py-2 text-base rounded-md"
    };

    const variantClasses = {
        primary: "bg-blue-600 hover:bg-blue-700 text-white",
        secondary: "bg-neutral-700 hover:bg-neutral-600 text-neutral-200",
        danger: "bg-red-600 hover:bg-red-700 text-white",
        ghost: "bg-transparent hover:bg-neutral-700/60 text-neutral-300 hover:text-neutral-100",
        outline: "border border-neutral-600 bg-neutral-700 hover:bg-neutral-600 text-white",
        success: "bg-green-500 hover:bg-green-600 text-white",
        icon: "p-1 rounded text-neutral-400 hover:text-neutral-200",
        iconDanger: "p-1 rounded text-red-400 hover:text-red-300"
    };

    const classes = `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;

    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled || loading}
            className={classes}
            {...props}
        >
            {loading && (
                <span className="w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin" />
            )}
            {children}
        </button>
    );
};

export default Button;
