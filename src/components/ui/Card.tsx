import React from "react";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  onClick?: () => void;
}

export function Card({ children, className = "", onClick }: CardProps) {
  if (onClick) {
    return (
      <button
        onClick={onClick}
        className={`block w-full text-left bg-white rounded-lg border border-gray-200 shadow-sm p-4 hover:shadow-md transition-shadow min-h-[44px] focus:outline-none focus:ring-2 focus:ring-green-700 ${className}`}
      >
        {children}
      </button>
    );
  }
  return (
    <div
      className={`bg-white rounded-lg border border-gray-200 shadow-sm p-4 ${className}`}
    >
      {children}
    </div>
  );
}
