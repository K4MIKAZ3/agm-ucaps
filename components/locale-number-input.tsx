"use client";

import { useEffect, useState } from "react";
import {
  formatColombianInput,
  formatColombianNumber,
  parseColombianNumber,
} from "@/lib/locale-numbers";

type Props = {
  id?: string;
  name?: string;
  value?: string;
  defaultValue?: number;
  onValueChange?: (numeric: number, formatted: string) => void;
  decimals?: number;
  className?: string;
  required?: boolean;
  min?: number;
  disabled?: boolean;
  placeholder?: string;
};

export default function LocaleNumberInput({
  id,
  name,
  value,
  defaultValue,
  onValueChange,
  decimals = 2,
  className,
  required,
  min,
  disabled,
  placeholder,
}: Props) {
  const isControlled = value !== undefined;
  const [display, setDisplay] = useState(() =>
    isControlled
      ? value
      : defaultValue != null
        ? formatColombianNumber(defaultValue, { decimals })
        : ""
  );

  useEffect(() => {
    if (isControlled && value !== display) {
      setDisplay(value);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isControlled, value]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const formatted = formatColombianInput(e.target.value, decimals);
    setDisplay(formatted);
    onValueChange?.(parseColombianNumber(formatted), formatted);
  }

  function handleBlur() {
    if (!display) return;
    const n = parseColombianNumber(display);
    const formatted = formatColombianNumber(n, { decimals });
    setDisplay(formatted);
    onValueChange?.(n, formatted);
  }

  return (
    <input
      id={id}
      name={name}
      type="text"
      inputMode="decimal"
      autoComplete="off"
      className={className}
      value={display}
      required={required}
      min={min}
      disabled={disabled}
      placeholder={placeholder}
      onChange={handleChange}
      onBlur={handleBlur}
    />
  );
}

export function parseFormLocaleNumber(formData: FormData, name: string): number {
  return parseColombianNumber(String(formData.get(name) ?? ""));
}
