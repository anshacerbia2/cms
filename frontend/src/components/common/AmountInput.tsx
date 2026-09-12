import { forwardRef } from "react";
import type { ComponentProps } from "react";
import { Input } from "@/components/ui/input";
import { cn, formatInputAmount, cleanInputAmount } from "@/lib/utils";

type AmountInputProps = Omit<
  ComponentProps<typeof Input>,
  "value" | "onChange" | "type"
> & {
  value?: string | number | null;
  /** Receives the cleaned numeric string, never the separated display text. */
  onChange: (value: string) => void;
};

/**
 * A money field.
 *
 * Groups thousands while the user types and hands back a clean numeric string,
 * which is what the finance ledger modals already do through the same two
 * helpers. The sales pipeline used `type="number"` instead, so the identical
 * kind of value looked different depending on which module you were in — a
 * contract value read as `50000000` on the project form and `50.000.000` two
 * screens later.
 *
 * Only for amounts. Quantities, frequencies and percentage rates stay plain
 * number inputs: grouping a quantity of 1000 into `1.000` reads as a price, and
 * a VAT rate has no thousands to group.
 */
export const AmountInput = forwardRef<HTMLInputElement, AmountInputProps>(
  ({ value, onChange, className, ...rest }, ref) => (
    <Input
      ref={ref}
      // Not type="number": the value carries separators, which a number input
      // rejects outright. Decimal keyboards still come up on mobile.
      inputMode="decimal"
      value={formatInputAmount(value ?? "")}
      onChange={(event) => onChange(cleanInputAmount(event.target.value))}
      className={cn("text-right tabular-nums", className)}
      {...rest}
    />
  ),
);

AmountInput.displayName = "AmountInput";
