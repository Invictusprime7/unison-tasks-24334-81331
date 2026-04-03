import { templateSchema, Template } from '@/schemas/templateSchema';
import { nanoid } from 'nanoid';

export interface ValidationResult {
  success: boolean;
  data?: Template;
  errors?: string[];
  autoFilled?: string[];
}

/**
 * Validate and auto-fix template JSON from LLM using Zod
 * Returns validated template with safe defaults injected
 */
export function validateTemplate(rawData: unknown): ValidationResult {
  const autoFilled: string[] = [];
  
  try {
    // Generate IDs for items missing them
    if (typeof rawData === 'object' && rawData !== null) {
      const raw = rawData as any;
      
      if (!raw.id) {
        raw.id = nanoid();
        autoFilled.push('id');
      }
      
      if (Array.isArray(raw.frames)) {
        raw.frames.forEach((frame: any, idx: number) => {
          if (!frame.id) {
            frame.id = nanoid();
            autoFilled.push(`frames[${idx}].id`);
          }
          if (Array.isArray(frame.layers)) {
            frame.layers.forEach((layer: any, layerIdx: number) => {
              if (!layer.id) {
                layer.id = nanoid();
                autoFilled.push(`frames[${idx}].layers[${layerIdx}].id`);
              }
            });
          }
        });
      }
    }
    
    const result = templateSchema.safeParse(rawData);
    
    if (!result.success) {
      const errors = result.error.issues.map(err => {
        const path = err.path.join('.');
        return `${path}: ${err.message}`;
      });
      
      console.error('[zodTemplateValidator] Validation failed:', errors);
      
      return {
        success: false,
        errors,
      };
    }
    
    // Check which fields were defaulted
    if (typeof rawData === 'object' && rawData !== null) {
      const raw = rawData as any;
      
      if (!raw.name) autoFilled.push('name');
      if (!raw.description) autoFilled.push('description');
      if (!raw.category) autoFilled.push('category');
      if (!raw.version) autoFilled.push('version');
      
      result.data.frames.forEach((frame, idx) => {
        const rawFrame = raw.frames?.[idx];
        if (!rawFrame) {
          autoFilled.push(`frames[${idx}] (entire frame)`);
        } else {
          if (!rawFrame.name) autoFilled.push(`frames[${idx}].name`);
          if (!rawFrame.background) autoFilled.push(`frames[${idx}].background`);
          if (!rawFrame.layout) autoFilled.push(`frames[${idx}].layout`);
          
          frame.layers.forEach((layer, layerIdx) => {
            const rawLayer = rawFrame.layers?.[layerIdx];
            if (!rawLayer) {
              autoFilled.push(`frames[${idx}].layers[${layerIdx}]`);
            } else {
              if (rawLayer.x === undefined) autoFilled.push(`frames[${idx}].layers[${layerIdx}].x`);
              if (rawLayer.y === undefined) autoFilled.push(`frames[${idx}].layers[${layerIdx}].y`);
              if (rawLayer.width === undefined) autoFilled.push(`frames[${idx}].layers[${layerIdx}].width`);
              if (rawLayer.height === undefined) autoFilled.push(`frames[${idx}].layers[${layerIdx}].height`);
              if (rawLayer.opacity === undefined) autoFilled.push(`frames[${idx}].layers[${layerIdx}].opacity`);
            }
          });
        }
      });
    }
    
    console.log('[zodTemplateValidator] Validation successful', {
      name: result.data.name,
      frames: result.data.frames.length,
      autoFilled: autoFilled.length,
    });
    
    return {
      success: true,
      data: result.data,
      autoFilled: autoFilled.length > 0 ? autoFilled : undefined,
    };
  } catch (error) {
    console.error('[zodTemplateValidator] Unexpected error:', error);
    return {
      success: false,
      errors: [error instanceof Error ? error.message : 'Unknown validation error'],
    };
  }
}

/**
 * Strict mode validator that logs detailed diagnostics
 */
export function validateTemplateStrict(rawData: unknown, verbose = false): ValidationResult {
  if (verbose) {
    console.group('[zodTemplateValidator:STRICT]');
    console.log('Raw input:', JSON.stringify(rawData, null, 2));
  }
  
  const startTime = performance.now();
  const result = validateTemplate(rawData);
  const duration = performance.now() - startTime;
  
  if (verbose) {
    console.log('Validation result:', result);
    console.log(`Validation took ${duration.toFixed(2)}ms`);
    console.groupEnd();
  }
  
  return result;
}
