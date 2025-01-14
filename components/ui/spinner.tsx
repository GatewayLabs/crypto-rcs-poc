"use client";

import { cn } from '@/lib/utils';

interface SpinnerProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function Spinner({ className, size = 'md' }: SpinnerProps) {
  return (
    <div className={cn(
      "animate-spin rounded-full border-t-transparent",
      size === 'sm' && "w-4 h-4 border-2",
      size === 'md' && "w-8 h-8 border-4",
      size === 'lg' && "w-12 h-12 border-4",
      "border-blue-500",
      className
    )} />
  );
}