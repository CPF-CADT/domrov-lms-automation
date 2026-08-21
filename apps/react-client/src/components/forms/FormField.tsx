/**
 * FormField - Reusable form input with label.
 * Usage: <FormField id="email" label="Email" type="email" required />
 */

import type { InputHTMLAttributes } from "react";

interface FormFieldProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
}

export default function FormField({
  id,
  label,
  className = "",
  ...props
}: FormFieldProps) {
  return (
    <div className="space-y-2">
      <label htmlFor={id} className="text-sm font-semibold text-slate-700">
        {label}
      </label>
      <input
        id={id}
        name={id}
        className={`form-input ${className}`.trim()}
        {...props}
      />
    </div>
  );
}
