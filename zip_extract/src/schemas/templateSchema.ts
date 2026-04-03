import { z } from 'zod';

// Color schema with defaults
const colorSchema = z.string().default('#000000').transform((val) => {
  if (!val || val === '') return '#000000';
  if (!/^#[0-9A-Fa-f]{6}$/.test(val)) return '#000000';
  return val;
});

// Filter schema with safe defaults
const filterSchema = z.object({
  type: z.enum(['brightness', 'contrast', 'saturation', 'blur', 'grayscale', 'sepia']).default('brightness'),
  value: z.number().min(0).max(200).default(100),
}).default({ type: 'brightness', value: 100 });

// Gradient schema
const gradientSchema = z.object({
  type: z.enum(['linear', 'radial']).default('linear'),
  angle: z.number().min(0).max(360).default(0),
  colors: z.array(colorSchema).min(2).default(['#000000', '#ffffff']),
}).optional();

// Base layer schema
const baseLayerSchema = z.object({
  id: z.string().optional(), // Will be generated if missing
  type: z.enum(['text', 'image', 'shape', 'group']),
  x: z.number().default(0),
  y: z.number().default(0),
  width: z.number().min(1).default(100),
  height: z.number().min(1).default(100),
  rotation: z.number().min(0).max(360).default(0),
  opacity: z.number().min(0).max(1).default(1),
  visible: z.boolean().default(true),
  locked: z.boolean().default(false),
});

// Text layer schema
const textLayerSchema = baseLayerSchema.extend({
  type: z.literal('text'),
  content: z.string().default('Text'),
  fontFamily: z.string().default('Inter'),
  fontSize: z.number().min(8).max(500).default(16),
  fontWeight: z.enum(['normal', 'bold', '100', '200', '300', '400', '500', '600', '700', '800', '900']).default('normal'),
  fontStyle: z.enum(['normal', 'italic']).default('normal'),
  textAlign: z.enum(['left', 'center', 'right', 'justify']).default('left'),
  color: colorSchema,
  lineHeight: z.number().min(0.5).max(3).default(1.2),
  letterSpacing: z.number().min(-5).max(20).default(0),
});

// Image layer schema
const imageLayerSchema = baseLayerSchema.extend({
  type: z.literal('image'),
  src: z.string().url().or(z.string().startsWith('data:')),
  fit: z.enum(['cover', 'contain', 'fill', 'scale-down']).default('cover'),
  filters: z.array(filterSchema).default([]),
  borderRadius: z.number().min(0).max(500).default(0),
});

// Shape layer schema
const shapeLayerSchema = baseLayerSchema.extend({
  type: z.literal('shape'),
  shape: z.enum(['rectangle', 'circle', 'ellipse', 'triangle', 'line']).default('rectangle'),
  fill: colorSchema,
  stroke: colorSchema.optional(),
  strokeWidth: z.number().min(0).max(50).default(0),
  borderRadius: z.number().min(0).max(500).default(0),
  gradient: gradientSchema,
});

// Group layer schema (recursive)
const groupLayerSchema = baseLayerSchema.extend({
  type: z.literal('group'),
  layers: z.lazy(() => z.array(layerSchema)).default([]),
});

// Union of all layer types
export const layerSchema: z.ZodType<any> = z.union([
  textLayerSchema,
  imageLayerSchema,
  shapeLayerSchema,
  groupLayerSchema,
]);

// Frame schema (represents a page/artboard)
export const frameSchema = z.object({
  id: z.string().optional(),
  name: z.string().default('Frame'),
  width: z.number().min(1).max(10000).default(1080),
  height: z.number().min(1).max(10000).default(1080),
  background: colorSchema,
  layers: z.array(layerSchema).default([]),
  layout: z.enum(['free', 'flex-column', 'flex-row', 'grid']).default('free'),
  gap: z.number().min(0).max(200).default(0),
  padding: z.number().min(0).max(200).default(0),
});

// Template schema
export const templateSchema = z.object({
  id: z.string().optional(),
  name: z.string().default('Untitled Template'),
  description: z.string().default(''),
  category: z.string().default('general'),
  frames: z.array(frameSchema).min(1).default([{
    name: 'Frame 1',
    width: 1080,
    height: 1080,
    background: '#ffffff',
    layers: [],
    layout: 'free',
    gap: 0,
    padding: 0,
  }]),
  version: z.string().default('1.0.0'),
});

export type Template = z.infer<typeof templateSchema>;
export type Frame = z.infer<typeof frameSchema>;
export type Layer = z.infer<typeof layerSchema>;
export type TextLayer = z.infer<typeof textLayerSchema>;
export type ImageLayer = z.infer<typeof imageLayerSchema>;
export type ShapeLayer = z.infer<typeof shapeLayerSchema>;
