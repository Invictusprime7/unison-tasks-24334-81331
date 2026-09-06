import { useContext } from 'react';
import {
  BusinessProfileContext,
  type BusinessProfileContextValue,
} from '@/contexts/BusinessProfileContextDef';

export function useBusinessProfile(): BusinessProfileContextValue {
  return useContext(BusinessProfileContext);
}