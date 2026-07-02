'use client';
import { formatCurrency } from '../lib/currency';

export default function CurrencyDisplay({ amount, currency = 'LAK', className = '' }) {
  return (
    <span className={className}>
      {formatCurrency(amount, currency)}
    </span>
  );
}
