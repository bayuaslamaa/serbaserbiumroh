'use client';

import { Fragment } from 'react';
import { SERVICE_KEYS } from '@/shared/types';
import type { PricingConfig, ServiceKey } from '@/shared/types';
import { isTransportLeg } from '@/packages/estimate/domain/services';

interface ServiceCheckboxGridProps {
  pricing: PricingConfig;
  value: ServiceKey[];
  onChange: (services: ServiceKey[]) => void;
}

const formatAmount = (currency: string, amount: number): string => {
  if (currency === 'USD') return `$${amount}`;
  if (currency === 'SAR') return `SAR ${amount}`;
  return `Rp ${amount.toLocaleString('id-ID')}`;
};

export const TRANSPORT_GROUP_LABEL = 'Transportasi per Leg';

interface ServiceGroup {
  label?: string;
  keys: ServiceKey[];
}

const groupServices = (keys: ServiceKey[]): ServiceGroup[] => {
  const groups: ServiceGroup[] = [];
  for (const key of keys) {
    const label = isTransportLeg(key) ? TRANSPORT_GROUP_LABEL : undefined;
    const current = groups[groups.length - 1];
    if (current && current.label === label) current.keys.push(key);
    else groups.push({ label, keys: [key] });
  }
  return groups;
};

export const ServiceCheckboxGrid = ({ pricing, value, onChange }: ServiceCheckboxGridProps) => {
  const toggle = (key: ServiceKey) => {
    if (value.includes(key)) {
      onChange(value.filter((k) => k !== key));
    } else {
      onChange([...value, key]);
    }
  };

  const enabledServices = SERVICE_KEYS.filter((key) => pricing.services[key]?.enabled);

  const renderCheckbox = (key: ServiceKey) => {
    const svc = pricing.services[key];
    const checked = value.includes(key);
    return (
      <label
        key={key}
        className="flex items-center gap-3 rounded-md border p-3 cursor-pointer transition-colors"
        style={{
          borderColor: checked ? 'var(--color-gold)' : 'var(--color-border)',
          background: checked ? 'rgba(201,168,76,0.06)' : 'var(--color-surface)',
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={() => toggle(key)}
          className="w-4 h-4 accent-[var(--color-gold)]"
        />
        <span className="flex-1 text-sm" style={{ color: 'var(--color-text)' }}>
          {svc.label}
        </span>
        <span className="text-xs" style={{ color: 'var(--color-text-muted)' }}>
          {formatAmount(svc.currency, svc.amount)}
        </span>
      </label>
    );
  };

  return (
    <div className="flex flex-col gap-2">
      {groupServices(enabledServices).map((group) =>
        group.label ? (
          <section key={group.label} className="flex flex-col gap-2 pt-1">
            <h4
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--color-text-muted)' }}
            >
              {group.label}
            </h4>
            <p className="text-[11px]" style={{ color: 'var(--color-text-muted)' }}>
              Satu perjalanan mendarat di Jeddah sekali dan pulang sekali — pilih satu penjemputan
              dan satu pengantaran.
            </p>
            {group.keys.map(renderCheckbox)}
          </section>
        ) : (
          <Fragment key={group.keys[0]}>{group.keys.map(renderCheckbox)}</Fragment>
        ),
      )}
    </div>
  );
};
