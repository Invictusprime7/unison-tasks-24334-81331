/**
 * AST Transform Types
 * Types for the TSX/React safe transform pipeline
 */

import type { AssetReference } from './asset';

/**
 * Transform operation types
 */
export type TransformOperation = 
  | ReplaceImageSrcTransform
  | AddImportTransform
  | InsertAssetHookTransform
  | AddAltTextTransform
  | AddDimensionsTransform
  | WrapWithAssetProviderTransform
  | ReplaceHardcodedPathTransform;

export interface ReplaceImageSrcTransform {
  type: 'replace-image-src';
  selector: string;           // CSS selector or JSX path
  oldSrc: string;            // Original src value
  assetId: string;           // Asset ID to reference
  assetRef: AssetReference;  // Resolved reference
}

export interface AddImportTransform {
  type: 'add-import';
  importStatement: string;
  module: string;
  isDefault?: boolean;
  namedImports?: string[];
}

export interface InsertAssetHookTransform {
  type: 'insert-asset-hook';
  hookName: string;
  assetIds: string[];
}

export interface AddAltTextTransform {
  type: 'add-alt-text';
  selector: string;
  alt: string;
}

export interface AddDimensionsTransform {
  type: 'add-dimensions';
  selector: string;
  width: number;
  height: number;
}

export interface WrapWithAssetProviderTransform {
  type: 'wrap-asset-provider';
  componentName: string;
}

export interface ReplaceHardcodedPathTransform {
  type: 'replace-hardcoded-path';
  oldPath: string;
  assetId: string;
}

/**
 * Transform result
 */
export interface TransformResult {
  success: boolean;
  code?: string;
  transforms: AppliedTransform[];
  errors: TransformError[];
  warnings: TransformWarning[];
}

export interface AppliedTransform {
  operation: TransformOperation;
  location?: {
    line: number;
    column: number;
  };
  before?: string;
  after?: string;
}

export interface TransformError {
  message: string;
  location?: {
    line: number;
    column: number;
  };
  recoverable: boolean;
}

export interface TransformWarning {
  message: string;
  suggestion?: string;
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  syntaxErrors: SyntaxErrorInfo[];
  typeErrors: TypeErrorInfo[];
  errors: string[];
  renderTestPassed?: boolean;
}

interface SyntaxErrorInfo {
  message: string;
  line: number;
  column: number;
}

interface TypeErrorInfo {
  message: string;
  line: number;
  column: number;
}

/**
 * AI Placement Intent (from Lane C)
 */
export interface AIPlacementResponse {
  placements: Array<{
    assetId: string;
    slotId: string;
    fit: 'contain' | 'cover' | 'fill' | 'none' | 'scale-down';
    position?: 'center' | 'top' | 'bottom' | 'left' | 'right' | 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'background' | 'inline';
  }>;
  canvasSize?: {
    width: number;
    height: number;
  };
  codeEdits?: Array<{
    intent: string;
    targetSelector?: string;
    assetId?: string;
  }>;
}

/**
 * Transform pipeline options
 */
export interface TransformPipelineOptions {
  validateAfter?: boolean;
  fallbackToPatch?: boolean;
  preserveFormatting?: boolean;
  addMissingImports?: boolean;
  insertAssetHook?: boolean;
}
