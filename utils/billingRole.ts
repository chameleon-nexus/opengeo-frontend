/** 计费/套餐/积分维度：仅 admin、agent 为特权角色，其余等同 customer */

export type BillingRole = 'admin' | 'agent' | 'customer';

export function normalizeBillingRole(role: string | null | undefined): BillingRole {
  const r = (role || '').toLowerCase();
  if (r === 'admin' || r === 'agent') return r;
  return 'customer';
}

export function isBillingAdmin(role: string | null | undefined): boolean {
  return normalizeBillingRole(role) === 'admin';
}

export function isBillingAgent(role: string | null | undefined): boolean {
  return normalizeBillingRole(role) === 'agent';
}

export function isBillingAccessExempt(role: string | null | undefined): boolean {
  const r = normalizeBillingRole(role);
  return r === 'admin' || r === 'agent';
}

export function isBillingCustomerEquivalent(role: string | null | undefined): boolean {
  return normalizeBillingRole(role) === 'customer';
}
