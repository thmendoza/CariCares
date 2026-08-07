"use client";

import { cn } from "@/lib/utils";
import { SelectHTMLAttributes, forwardRef, useId } from "react";

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
}

const Select = forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, label, error, id, children, ...props }, ref) => {
    const generatedId = useId();
    const selectId = id ?? generatedId;

    return (
      <div>
        {label && (
          <label htmlFor={selectId} className="block text-xs font-medium text-care-charcoal mb-1">
            {label}
          </label>
        )}
        <select
          ref={ref}
          id={selectId}
          aria-invalid={!!error}
          className={cn(
            "w-full rounded-xl border px-3 py-2 text-sm text-care-charcoal transition-colors",
            "focus:outline-none focus:ring-2 focus:ring-care-pink-deep",
            error ? "border-care-red-deep" : "border-care-cream focus:border-care-pink-deep",
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-xs text-care-red-deep mt-1">{error}</p>}
      </div>
    );
  }
);
Select.displayName = "Select";

export { Select };
