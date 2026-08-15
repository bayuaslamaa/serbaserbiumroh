import { SERVICE_KEYS, serviceRowKey } from '@/shared/types';
import type { EstimateParams, ManualOverrides, RowOverride, ServiceKey } from '@/shared/types';

export const RETIRED_SERVICE_EXPANSIONS: Record<string, readonly ServiceKey[]> = {
  TRANSPORT: ['TRANSPORT_JED_MAKKAH', 'TRANSPORT_MAKKAH_MADINAH', 'TRANSPORT_MADINAH_JED'],
};

const OVERRIDE_TARGET_LEG: Record<string, ServiceKey> = {
  TRANSPORT: 'TRANSPORT_JED_MAKKAH',
};

export const isServiceKey = (value: unknown): value is ServiceKey => {
  return typeof value === 'string' && (SERVICE_KEYS as readonly string[]).includes(value);
};

export const isTransportLeg = (value: unknown): value is ServiceKey => {
  return isServiceKey(value) && value.startsWith('TRANSPORT_');
};

export const ARRIVAL_LEG_KEYS = ['TRANSPORT_JED_MAKKAH', 'TRANSPORT_JED_MADINAH'] as const;
export const DEPARTURE_LEG_KEYS = ['TRANSPORT_MAKKAH_JED', 'TRANSPORT_MADINAH_JED'] as const;

export const expandRetiredServices = (
  services: readonly unknown[] | undefined | null,
): unknown[] => {
  if (!Array.isArray(services)) return [];

  const out: unknown[] = [];
  const seen = new Set<unknown>();
  const push = (key: unknown) => {
    if (seen.has(key)) return;
    seen.add(key);
    out.push(key);
  };

  for (const raw of services) {
    const replacements = typeof raw === 'string' ? RETIRED_SERVICE_EXPANSIONS[raw] : undefined;
    if (replacements) {
      for (const replacement of replacements) push(replacement);
    } else {
      push(raw);
    }
  }

  return out;
};

export const normaliseServices = (
  services: readonly unknown[] | undefined | null,
): ServiceKey[] => {
  return expandRetiredServices(services).filter(isServiceKey);
};

export function normaliseStoredParams(params: EstimateParams): EstimateParams;
export function normaliseStoredParams(params: unknown): unknown;
export function normaliseStoredParams(params: unknown): unknown {
  return rewriteServices(params, normaliseServices);
}

export function expandRetiredStoredParams(params: EstimateParams): EstimateParams;
export function expandRetiredStoredParams(params: unknown): unknown;
export function expandRetiredStoredParams(params: unknown): unknown {
  return rewriteServices(params, expandRetiredServices);
}

const rewriteServices = (params: unknown, rewrite: (services: unknown[]) => unknown[]): unknown => {
  if (!params || typeof params !== 'object' || Array.isArray(params)) return params;
  const o = params as Record<string, unknown>;
  if (!Array.isArray(o.services)) return params;
  return { ...o, services: rewrite(o.services) };
};

export function normaliseStoredOverrides(overrides: ManualOverrides): ManualOverrides;
export function normaliseStoredOverrides(overrides: unknown): unknown;
export function normaliseStoredOverrides(overrides: unknown): unknown {
  if (!overrides || typeof overrides !== 'object' || Array.isArray(overrides)) return overrides;
  const o = overrides as Record<string, unknown>;
  const map = o.overrides;
  if (!map || typeof map !== 'object' || Array.isArray(map)) return overrides;

  const source = map as Record<string, RowOverride>;
  const retired = Object.keys(source).filter(
    (key) => key.startsWith('service:') && OVERRIDE_TARGET_LEG[key.slice('service:'.length)],
  );
  if (retired.length === 0) return overrides;

  const next: Record<string, RowOverride> = { ...source };
  for (const key of retired) {
    const composite = key.slice('service:'.length);
    const ov = next[key];
    delete next[key];
    if (!ov || typeof ov !== 'object') continue;

    const targetKey = serviceRowKey(OVERRIDE_TARGET_LEG[composite]);
    if (next[targetKey] !== undefined) continue;
    next[targetKey] = ov;

    const carriesMoney = ov.idr != null || ov.unitPrice != null || ov.hidden === true;
    if (!carriesMoney) continue;
    for (const leg of RETIRED_SERVICE_EXPANSIONS[composite] ?? []) {
      const legKey = serviceRowKey(leg);
      if (legKey === targetKey) continue;
      if (next[legKey] === undefined) next[legKey] = { hidden: true };
    }
  }

  return { ...o, overrides: next };
}
