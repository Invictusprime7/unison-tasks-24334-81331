/**
 * Template Provisioning Hook
 * 
 * React hook for provisioning templates with full backend support.
 * This is the integration point between UI and the provisioning service.
 */

import { useState, useCallback, useEffect } from 'react';
import { 
  provisionTemplate, 
  getProvisioningStatus, 
  isTemplateProductionReady,
  quickProvision,
  ProvisioningResult,
} from '@/services/templateProvisioner';
import { 
  TemplateManifest, 
  ProvisioningStatus,
  getTemplateManifest,
  getDefaultManifestForSystem,
} from '@/data/templates/manifest';
import type { BusinessSystemType } from '@/data/templates/types';
import { setDefaultBusinessId } from '@/runtime/intentRouter';
import { toast } from 'sonner';

interface UseTemplateProvisioningOptions {
  templateId?: string;
  systemType: BusinessSystemType;
  autoProvision?: boolean;
}

interface UseTemplateProvisioningReturn {
  /** Current business ID */
  businessId: string | null;
  /** Current manifest */
  manifest: TemplateManifest | null;
  /** Provisioning status */
  status: ProvisioningStatus | null;
  /** Loading state */
  isProvisioning: boolean;
  /** Is template production-ready */
  isReady: boolean;
  /** Missing requirements for production */
  missingRequirements: string[];
  /** Errors during provisioning */
  errors: string[];
  /** Warnings during provisioning */
  warnings: string[];
  /** Trigger full provisioning */
  provision: () => Promise<ProvisioningResult | null>;
  /** Quick provision for preview/demo */
  quickStart: () => void;
  /** Check production readiness */
  checkReadiness: () => Promise<void>;
}

export function useTemplateProvisioning({
  templateId,
  systemType,
  autoProvision = false,
}: UseTemplateProvisioningOptions): UseTemplateProvisioningReturn {
  const [businessId, setBusinessId] = useState<string | null>(null);
  const [manifest, setManifest] = useState<TemplateManifest | null>(null);
  const [status, setStatus] = useState<ProvisioningStatus | null>(null);
  const [isProvisioning, setIsProvisioning] = useState(false);
  const [isReady, setIsReady] = useState(false);
  const [missingRequirements, setMissingRequirements] = useState<string[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);

  // Initialize manifest
  useEffect(() => {
    const m = templateId 
      ? getTemplateManifest(templateId) || getDefaultManifestForSystem(systemType)
      : getDefaultManifestForSystem(systemType);
    setManifest(m);
  }, [templateId, systemType]);

  // Check for existing provisioning
  useEffect(() => {
    // Look for existing businessId in localStorage
    const key = systemType ? `webbuilder_businessId:${systemType}` : 'webbuilder_businessId';
    const existingId = localStorage.getItem(key);
    
    if (existingId) {
      setBusinessId(existingId);
      const existingStatus = getProvisioningStatus(existingId);
      if (existingStatus) {
        setStatus(existingStatus);
        setIsReady(existingStatus.status === 'ready');
      }
    }
  }, [systemType]);

  // Full provisioning
  const provision = useCallback(async (): Promise<ProvisioningResult | null> => {
    if (!manifest) return null;
    
    setIsProvisioning(true);
    setErrors([]);
    setWarnings([]);
    
    try {
      const result = await provisionTemplate(templateId, systemType, businessId || undefined);
      
      setBusinessId(result.businessId);
      setStatus(result.status);
      setErrors(result.errors);
      setWarnings(result.warnings);
      setIsReady(result.success);
      
      // Store businessId for future sessions
      const key = systemType ? `webbuilder_businessId:${systemType}` : 'webbuilder_businessId';
      localStorage.setItem(key, result.businessId);
      
      // Set as default for intent routing
      setDefaultBusinessId(result.businessId);
      
      if (result.success) {
        toast.success('Template provisioned!', {
          description: `${result.manifest.businessOutcome}`,
        });
      } else {
        toast.error('Provisioning incomplete', {
          description: result.errors[0] || 'Some features may not work',
        });
      }
      
      // Show warnings
      result.warnings.forEach(warning => {
        toast.warning(warning);
      });
      
      return result;
      
    } catch (error) {
      const errorMessage = String(error);
      setErrors([errorMessage]);
      toast.error('Provisioning failed', { description: errorMessage });
      return null;
    } finally {
      setIsProvisioning(false);
    }
  }, [manifest, templateId, systemType, businessId]);

  // Quick start for preview/demo
  const quickStart = useCallback(() => {
    const { businessId: newBusinessId, manifest: newManifest } = quickProvision(systemType);
    
    setBusinessId(newBusinessId);
    setManifest(newManifest);
    setIsReady(true);
    
    // Store and set as default
    const key = systemType ? `webbuilder_businessId:${systemType}` : 'webbuilder_businessId';
    localStorage.setItem(key, newBusinessId);
    setDefaultBusinessId(newBusinessId);
    
    console.log('[useTemplateProvisioning] Quick started with businessId:', newBusinessId);
  }, [systemType]);

  // Check production readiness
  const checkReadiness = useCallback(async () => {
    if (!manifest || !businessId) {
      setIsReady(false);
      return;
    }
    
    const { ready, missing } = await isTemplateProductionReady(manifest, businessId);
    setIsReady(ready);
    setMissingRequirements(missing);
  }, [manifest, businessId]);

  // Auto-provision on mount if requested
  useEffect(() => {
    if (autoProvision && manifest && !businessId) {
      provision();
    }
  }, [autoProvision, manifest, businessId, provision]);

  return {
    businessId,
    manifest,
    status,
    isProvisioning,
    isReady,
    missingRequirements,
    errors,
    warnings,
    provision,
    quickStart,
    checkReadiness,
  };
}
