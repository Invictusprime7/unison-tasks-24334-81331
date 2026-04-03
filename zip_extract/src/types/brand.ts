/**
 * Brand Colors and Types
 * 
 * Shared brand-related types and constants used across the application.
 */

/** Brand colors used for styling */
export interface BrandColors {
  primary: string;
  secondary: string;
  accent: string;
  background: string;
  foreground: string;
}

/** Default brand colors */
export const defaultBrand: BrandColors = {
  primary: "#3B82F6",
  secondary: "#10B981",
  accent: "#F59E0B",
  background: "#FFFFFF",
  foreground: "#1E293B",
};
