import React from "react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost";
  children: React.ReactNode;
}

export function Button({
  variant = "primary",
  className = "",
  children,
  ...props
}: ButtonProps) {
  const base =
    "inline-flex items-center justify-center min-h-[44px] min-w-[44px] px-4 rounded-md font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    primary: "bg-green-700 text-white hover:bg-green-800 focus:ring-green-700",
    secondary:
      "bg-white text-green-700 border border-green-700 hover:bg-green-50 focus:ring-green-700",
    ghost: "bg-transparent text-green-700 hover:bg-green-50 focus:ring-green-700",
  };
  return (
    <button className={`${base} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
}
