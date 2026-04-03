/**
 * EntitlementGate - Gate UI elements based on business entitlements
 * 
 * Use this component to conditionally render UI elements based on
 * whether the business has the required entitlement (feature flag or limit).
 */

import React from 'react';
import { useEntitlements } from '@/hooks/useEntitlements';

interface EntitlementGateProps {
  businessId: string | null | undefined;
  entitlement: string;
  currentCount?: number;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function EntitlementGate({
  businessId,
  entitlement,
  currentCount,
  children,
  fallback,
}: EntitlementGateProps) {
  const { check, canCreate, loading } = useEntitlements(businessId);

  if (loading) {
    return null;
  }

  const result = currentCount !== undefined 
    ? canCreate(entitlement, currentCount)
    : check(entitlement);

  if (!result.allowed) {
    return <>{fallback || null}</>;
  }

  return <>{children}</>;
}
