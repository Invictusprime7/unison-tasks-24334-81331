export { getVariantsForSection, getVariantById, getDefaultVariant, hasVariants, getSectionTypesWithVariants, resolveVariantComponent, VARIANT_REGISTRY } from './registry';
export type { SectionVariant, VariantId, VariantRegistry, ActiveVariantMap, ExtractedSectionContent } from './types';
export { extractSectionContentFromJSX, findSectionBounds } from './contentExtractor';
export { heroCenteredJSX, heroSplitImageJSX, heroFullBleedJSX, ctaCenteredJSX, ctaGradientBannerJSX, ctaSplitCardJSX, navbarStandardJSX, navbarCenteredLogoJSX, navbarMinimalDarkJSX } from './jsxTemplates';
