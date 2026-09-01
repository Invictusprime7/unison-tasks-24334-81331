/**
 * Unison Experience Layer — canonical 3D/immersive primitives.
 *
 * These modules are emitted into the generated VFS by the canonical pipeline
 * (never authored by Lane B) and live under `/src/unison/experience`. They are
 * the ONLY sanctioned way a generated page may reach React Three Fiber:
 * Lane B composes them, Stage 4b themes them through CSS material tokens, and
 * the experience preflight gate budgets them.
 */

export const EXPERIENCE_FOUNDATION_VERSION = '1.0' as const;

export const EXPERIENCE_IMPORT_ROOT = '@/unison/experience' as const;

/** The 8 premium experience primitives Lane B may compose. */
export const EXPERIENCE_PRIMITIVES = [
  'ImmersiveHero',
  'ProductStage',
  'FloatingMedia',
  'ParticleField',
  'DepthGallery',
  'ModelViewer',
  'SceneBackground',
  'LightRig',
] as const;

export type ExperiencePrimitive = (typeof EXPERIENCE_PRIMITIVES)[number];

/** Primitives that mount their own WebGL context (budgeted by the gate). */
export const EXPERIENCE_HEAVY_PRIMITIVES: ReadonlySet<ExperiencePrimitive> = new Set([
  'ImmersiveHero',
  'ProductStage',
  'DepthGallery',
  'ModelViewer',
  'SceneBackground',
]);

export const EXPERIENCE_BARREL_EXPORTS: ReadonlySet<string> = new Set([
  ...EXPERIENCE_PRIMITIVES,
  'ExperienceCanvas',
  'useExperienceMaterial',
  'useExperienceEnabled',
]);

export const EXPERIENCE_FOUNDATION_PATHS = [
  '/src/unison/experience/index.ts',
  '/src/unison/experience/canvas.tsx',
  '/src/unison/experience/tokens.ts',
  '/src/unison/experience/scene.tsx',
  '/src/unison/experience/media.tsx',
  '/src/unison/experience/stage.tsx',
] as const;

export const EXPERIENCE_IMPORT_PATHS = [
  '@/unison/experience',
  '@/unison/experience/canvas',
  '@/unison/experience/tokens',
  '@/unison/experience/scene',
  '@/unison/experience/media',
  '@/unison/experience/stage',
] as const;

/** npm packages the experience layer is allowed to reach (foundation only). */
export const EXPERIENCE_RUNTIME_PACKAGES = [
  'three',
  '@react-three/fiber',
  '@react-three/drei',
] as const;

export const EXPERIENCE_VOCABULARY_DIRECTIVE = [
  '── EXPERIENCE VOCABULARY (3D / immersive — optional, budgeted) ──',
  'Immersive WebGL is available ONLY through "@/unison/experience". Never import "three", "@react-three/fiber", or "@react-three/drei" directly in a page — those imports are rejected by the experience preflight gate.',
  '  - <ImmersiveHero eyebrow? title lead? actions? intensity="subtle|balanced|cinematic"> — full-bleed hero band with a themed 3D backdrop; DOM copy stays selectable and accessible.',
  '  - <ProductStage src? alt? caption? spin?={boolean}> — centred product/object stage with soft studio lighting and contact shadow.',
  '  - <FloatingMedia src alt caption?> — a single image plane with gentle parallax float.',
  '  - <DepthGallery items={[{ src, alt, caption? }]}> — depth-staggered media wall.',
  '  - <ModelViewer src="/models/thing.glb" alt spin?={boolean}> — GLTF viewer with orbit + bounds. Only use when a real .glb asset exists.',
  '  - <ParticleField density="low|medium|high" /> and <SceneBackground variant="aurora|starfield|mesh" /> — ambient background layers; place at most one per page band.',
  '  - <LightRig preset="studio|soft|dramatic" /> — lighting preset, only inside a <ProductStage>/<ModelViewer> children slot.',
  'Budget: at most ONE heavy experience primitive (ImmersiveHero, ProductStage, DepthGallery, ModelViewer, SceneBackground) per page band and at most TWO per page. Every experience primitive already ships a non-WebGL fallback, respects prefers-reduced-motion, and takes its colours from Stage 4b material tokens — never pass colour or size literals to them.',
].join('\n');

const heavyList = [...EXPERIENCE_HEAVY_PRIMITIVES].join(', ');

/** Emits the experience foundation module set for the generated VFS. */
export function buildExperienceFoundationFiles(marker: string): Record<string, string> {
  return {
    '/src/unison/experience/tokens.ts': `${marker}
import * as React from 'react';

/**
 * Reads Stage 4b material tokens off the document root so every 3D surface
 * inherits the selected style card instead of hardcoding colours.
 */
export interface ExperienceMaterial {
  primary: string;
  accent: string;
  surface: string;
  background: string;
}

const FALLBACK: ExperienceMaterial = {
  primary: '#6366f1',
  accent: '#22d3ee',
  surface: '#1f2937',
  background: '#0b0f19',
};

function readToken(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  if (!raw) return fallback;
  // Tokens are stored as bare HSL triplets (e.g. "222 47% 11%").
  return /^[\\d.]+\\s+[\\d.]+%\\s+[\\d.]+%$/.test(raw) ? \`hsl(\${raw})\` : raw;
}

export function useExperienceMaterial(): ExperienceMaterial {
  const [material, setMaterial] = React.useState<ExperienceMaterial>(FALLBACK);
  React.useEffect(() => {
    setMaterial({
      primary: readToken('--primary', FALLBACK.primary),
      accent: readToken('--accent', FALLBACK.accent),
      surface: readToken('--card', FALLBACK.surface),
      background: readToken('--background', FALLBACK.background),
    });
  }, []);
  return material;
}

/** WebGL availability + reduced-motion gate shared by every primitive. */
export function useExperienceEnabled(): boolean {
  const [enabled, setEnabled] = React.useState(false);
  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setEnabled(false);
      return;
    }
    try {
      const probe = document.createElement('canvas');
      const gl = probe.getContext('webgl2') || probe.getContext('webgl');
      setEnabled(Boolean(gl));
    } catch {
      setEnabled(false);
    }
  }, []);
  return enabled;
}
`,

    '/src/unison/experience/canvas.tsx': `${marker}
import * as React from 'react';
import { Canvas } from '@react-three/fiber';
import { cn } from '@/unison/ui';
import { useExperienceEnabled } from './tokens';

export interface ExperienceCanvasProps {
  children: React.ReactNode;
  /** Rendered whenever WebGL is unavailable or motion is reduced. */
  fallback?: React.ReactNode;
  className?: string;
  camera?: { position?: [number, number, number]; fov?: number };
  /** Keeps ambient layers cheap; interactive stages opt into 'always'. */
  frameloop?: 'always' | 'demand';
}

/**
 * The single WebGL entry point of the generated runtime: caps device pixel
 * ratio, suspends on assets, and degrades to a DOM fallback rather than
 * leaving a blank canvas.
 */
export function ExperienceCanvas({
  children,
  fallback = null,
  className,
  camera = { position: [0, 0, 6], fov: 50 },
  frameloop = 'always',
}: ExperienceCanvasProps) {
  const enabled = useExperienceEnabled();
  if (!enabled) {
    return <div className={cn('absolute inset-0', className)} aria-hidden="true">{fallback}</div>;
  }
  return (
    <div className={cn('absolute inset-0', className)} aria-hidden="true">
      <Canvas
        dpr={[1, 2]}
        frameloop={frameloop}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        camera={camera}
      >
        <React.Suspense fallback={null}>{children}</React.Suspense>
      </Canvas>
    </div>
  );
}
`,

    '/src/unison/experience/scene.tsx': `${marker}
import * as React from 'react';
import { useFrame } from '@react-three/fiber';
import { Float, Points, PointMaterial } from '@react-three/drei';
import type * as THREE from 'three';
import { cn } from '@/unison/ui';
import { ExperienceCanvas } from './canvas';
import { useExperienceMaterial } from './tokens';

export type LightRigPreset = 'studio' | 'soft' | 'dramatic';

/** Lighting preset — composed inside a stage/viewer children slot. */
export function LightRig({ preset = 'studio' }: { preset?: LightRigPreset }) {
  const material = useExperienceMaterial();
  if (preset === 'dramatic') {
    return (
      <>
        <ambientLight intensity={0.15} />
        <spotLight position={[4, 6, 4]} angle={0.4} penumbra={0.9} intensity={2.4} color={material.accent} />
        <pointLight position={[-5, -2, -4]} intensity={1.2} color={material.primary} />
      </>
    );
  }
  if (preset === 'soft') {
    return (
      <>
        <ambientLight intensity={0.8} />
        <directionalLight position={[3, 5, 4]} intensity={0.9} />
      </>
    );
  }
  return (
    <>
      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 6, 5]} intensity={1.4} />
      <directionalLight position={[-4, -2, -6]} intensity={0.5} color={material.accent} />
    </>
  );
}

function DriftingShape({ intensity }: { intensity: number }) {
  const mesh = React.useRef<THREE.Mesh>(null);
  const material = useExperienceMaterial();
  useFrame((_state, delta) => {
    if (!mesh.current) return;
    mesh.current.rotation.y += delta * 0.12 * intensity;
    mesh.current.rotation.x += delta * 0.05 * intensity;
  });
  return (
    <Float speed={intensity} rotationIntensity={0.4 * intensity} floatIntensity={0.6 * intensity}>
      <mesh ref={mesh} position={[1.6, 0, 0]}>
        <icosahedronGeometry args={[2.1, 3]} />
        <meshStandardMaterial color={material.primary} roughness={0.25} metalness={0.6} />
      </mesh>
    </Float>
  );
}

export type ExperienceIntensity = 'subtle' | 'balanced' | 'cinematic';

const INTENSITY: Record<ExperienceIntensity, number> = {
  subtle: 0.5,
  balanced: 1,
  cinematic: 1.6,
};

export interface ImmersiveHeroProps {
  children?: React.ReactNode;
  intensity?: ExperienceIntensity;
  className?: string;
}

/** Full-bleed hero band with a themed 3D backdrop behind selectable DOM copy. */
export function ImmersiveHero({ children, intensity = 'balanced', className }: ImmersiveHeroProps) {
  return (
    <div
      className={cn(
        'relative isolate overflow-hidden rounded-[var(--ut-media-radius)] bg-background min-h-[var(--ut-hero-block)]',
        className,
      )}
    >
      <ExperienceCanvas
        fallback={<div className="size-full bg-gradient-to-br from-primary/25 via-background to-accent/20" />}
      >
        <LightRig preset="studio" />
        <DriftingShape intensity={INTENSITY[intensity]} />
      </ExperienceCanvas>
      <div className="relative z-10 flex size-full flex-col justify-center">{children}</div>
    </div>
  );
}

function ParticleCloud({ count }: { count: number }) {
  const material = useExperienceMaterial();
  const positions = React.useMemo(() => {
    const buffer = new Float32Array(count * 3);
    for (let index = 0; index < count * 3; index += 1) {
      buffer[index] = (Math.random() - 0.5) * 14;
    }
    return buffer;
  }, [count]);
  const points = React.useRef<THREE.Points>(null);
  useFrame((_state, delta) => {
    if (points.current) points.current.rotation.y += delta * 0.03;
  });
  return (
    <Points ref={points} positions={positions} stride={3} frustumCulled>
      <PointMaterial transparent size={0.045} sizeAttenuation depthWrite={false} color={material.accent} />
    </Points>
  );
}

export type ParticleDensity = 'low' | 'medium' | 'high';

const DENSITY: Record<ParticleDensity, number> = { low: 600, medium: 1600, high: 3200 };

/** Ambient particle layer. Cheap, decorative, never interactive. */
export function ParticleField({ density = 'medium', className }: { density?: ParticleDensity; className?: string }) {
  return (
    <div className={cn('pointer-events-none absolute inset-0', className)}>
      <ExperienceCanvas frameloop="always" fallback={null}>
        <ParticleCloud count={DENSITY[density]} />
      </ExperienceCanvas>
    </div>
  );
}

export type SceneBackgroundVariant = 'aurora' | 'starfield' | 'mesh';

/** Page-band background layer; place at most one per band. */
export function SceneBackground({
  variant = 'aurora',
  className,
}: { variant?: SceneBackgroundVariant; className?: string }) {
  const material = useExperienceMaterial();
  return (
    <div className={cn('pointer-events-none absolute inset-0 -z-10 overflow-hidden', className)}>
      <ExperienceCanvas
        fallback={<div className="size-full bg-gradient-to-b from-background via-primary/10 to-background" />}
      >
        <LightRig preset="soft" />
        {variant === 'starfield' ? (
          <ParticleCloud count={2400} />
        ) : (
          <Float speed={variant === 'mesh' ? 0.8 : 1.4} floatIntensity={1.2}>
            <mesh scale={variant === 'mesh' ? 5 : 6}>
              <sphereGeometry args={[1, 48, 48]} />
              <meshStandardMaterial
                color={variant === 'mesh' ? material.surface : material.primary}
                wireframe={variant === 'mesh'}
                roughness={0.4}
                metalness={0.35}
                transparent
                opacity={0.55}
              />
            </mesh>
          </Float>
        )}
      </ExperienceCanvas>
    </div>
  );
}
`,

    '/src/unison/experience/media.tsx': `${marker}
import * as React from 'react';
import { Float, Image as DreiImage, ScrollControls, Scroll } from '@react-three/drei';
import { cn } from '@/unison/ui';
import { ExperienceCanvas } from './canvas';
import { LightRig } from './scene';

export interface FloatingMediaProps {
  src: string;
  alt: string;
  caption?: string;
  className?: string;
}

/** Single image plane with gentle parallax float and a DOM image fallback. */
export function FloatingMedia({ src, alt, caption, className }: FloatingMediaProps) {
  return (
    <figure className={cn('relative overflow-hidden rounded-[var(--ut-media-radius)]', className)}>
      <div className="relative min-h-[var(--ut-media-block)]">
        <ExperienceCanvas
          camera={{ position: [0, 0, 5], fov: 45 }}
          fallback={<img src={src} alt={alt} loading="lazy" className="size-full object-cover" />}
        >
          <LightRig preset="soft" />
          <Float speed={1.1} rotationIntensity={0.25} floatIntensity={0.9}>
            <DreiImage url={src} scale={3.2} transparent />
          </Float>
        </ExperienceCanvas>
        <span className="sr-only">{alt}</span>
      </div>
      {caption ? <figcaption className="mt-3 text-sm text-muted-foreground">{caption}</figcaption> : null}
    </figure>
  );
}

export interface DepthGalleryItem {
  src: string;
  alt: string;
  caption?: string;
}

/** Depth-staggered media wall. Falls back to a responsive image grid. */
export function DepthGallery({ items, className }: { items: DepthGalleryItem[]; className?: string }) {
  const planes = items.slice(0, 8);
  return (
    <div className={cn('relative overflow-hidden rounded-[var(--ut-media-radius)]', className)}>
      <div className="relative min-h-[var(--ut-media-block-lg)]">
        <ExperienceCanvas
          camera={{ position: [0, 0, 7], fov: 50 }}
          fallback={
            <div className="grid size-full grid-cols-2 gap-3 md:grid-cols-3">
              {planes.map((item) => (
                <img key={item.src} src={item.src} alt={item.alt} loading="lazy" className="size-full object-cover" />
              ))}
            </div>
          }
        >
          <LightRig preset="soft" />
          <ScrollControls horizontal pages={Math.max(1, planes.length / 3)} damping={0.2}>
            <Scroll>
              {planes.map((item, index) => (
                <Float key={item.src} speed={0.9} floatIntensity={0.5}>
                  <DreiImage
                    url={item.src}
                    scale={2.4}
                    transparent
                    position={[index * 2.8 - 2, index % 2 === 0 ? 0.4 : -0.4, -index * 0.35]}
                  />
                </Float>
              ))}
            </Scroll>
          </ScrollControls>
        </ExperienceCanvas>
      </div>
      <ul className="sr-only">
        {planes.map((item) => (
          <li key={item.src}>{item.caption || item.alt}</li>
        ))}
      </ul>
    </div>
  );
}
`,

    '/src/unison/experience/stage.tsx': `${marker}
import * as React from 'react';
import { useFrame } from '@react-three/fiber';
import { Bounds, ContactShadows, OrbitControls, useGLTF } from '@react-three/drei';
import type * as THREE from 'three';
import { cn } from '@/unison/ui';
import { ExperienceCanvas } from './canvas';
import { LightRig } from './scene';
import { useExperienceMaterial } from './tokens';

function Spinner({ spin, children }: { spin: boolean; children: React.ReactNode }) {
  const group = React.useRef<THREE.Group>(null);
  useFrame((_state, delta) => {
    if (spin && group.current) group.current.rotation.y += delta * 0.35;
  });
  return <group ref={group}>{children}</group>;
}

function PlaceholderObject() {
  const material = useExperienceMaterial();
  return (
    <mesh castShadow>
      <torusKnotGeometry args={[1, 0.34, 160, 24]} />
      <meshStandardMaterial color={material.primary} roughness={0.2} metalness={0.75} />
    </mesh>
  );
}

function GltfObject({ src }: { src: string }) {
  const { scene } = useGLTF(src);
  return <primitive object={scene} />;
}

export interface ProductStageProps {
  /** Optional .glb model. Without one the stage renders a themed object. */
  src?: string;
  alt: string;
  caption?: string;
  spin?: boolean;
  className?: string;
}

/** Centred product/object stage with studio lighting and a contact shadow. */
export function ProductStage({ src, alt, caption, spin = true, className }: ProductStageProps) {
  return (
    <figure className={cn('relative overflow-hidden rounded-[var(--ut-media-radius)] bg-card', className)}>
      <div className="relative min-h-[var(--ut-media-block-lg)]">
        <ExperienceCanvas
          camera={{ position: [0, 0.6, 5], fov: 45 }}
          fallback={<div className="size-full bg-gradient-to-b from-card to-muted" />}
        >
          <LightRig preset="studio" />
          <Bounds fit clip observe margin={1.2}>
            <Spinner spin={spin}>{src ? <GltfObject src={src} /> : <PlaceholderObject />}</Spinner>
          </Bounds>
          <ContactShadows position={[0, -1.6, 0]} opacity={0.4} blur={2.6} far={4} />
        </ExperienceCanvas>
        <span className="sr-only">{alt}</span>
      </div>
      {caption ? <figcaption className="mt-3 text-sm text-muted-foreground">{caption}</figcaption> : null}
    </figure>
  );
}

export interface ModelViewerProps {
  src: string;
  alt: string;
  spin?: boolean;
  className?: string;
}

/** Orbitable GLTF viewer. Only use with a real .glb asset in the project. */
export function ModelViewer({ src, alt, spin = false, className }: ModelViewerProps) {
  return (
    <div
      className={cn('relative overflow-hidden rounded-[var(--ut-media-radius)] bg-card', className)}
      role="img"
      aria-label={alt}
    >
      <div className="relative min-h-[var(--ut-media-block-lg)]">
        <ExperienceCanvas
          camera={{ position: [0, 0.5, 4.5], fov: 45 }}
          fallback={<div className="size-full bg-gradient-to-b from-card to-muted" />}
        >
          <LightRig preset="studio" />
          <Bounds fit clip observe margin={1.25}>
            <Spinner spin={spin}>
              <GltfObject src={src} />
            </Spinner>
          </Bounds>
          <ContactShadows position={[0, -1.5, 0]} opacity={0.35} blur={2.4} far={4} />
          <OrbitControls makeDefault enablePan={false} enableZoom={false} minPolarAngle={0.8} maxPolarAngle={2.1} />
        </ExperienceCanvas>
      </div>
    </div>
  );
}
`,

    '/src/unison/experience/index.ts': `${marker}
// Experience layer barrel — the ONLY sanctioned WebGL surface for generated
// pages. Heavy primitives (${heavyList}) are budgeted by the preflight gate.
export { ExperienceCanvas, type ExperienceCanvasProps } from './canvas';
export { useExperienceMaterial, useExperienceEnabled, type ExperienceMaterial } from './tokens';
export {
  ImmersiveHero,
  ParticleField,
  SceneBackground,
  LightRig,
  type ImmersiveHeroProps,
  type ExperienceIntensity,
  type ParticleDensity,
  type SceneBackgroundVariant,
  type LightRigPreset,
} from './scene';
export { FloatingMedia, DepthGallery, type FloatingMediaProps, type DepthGalleryItem } from './media';
export { ProductStage, ModelViewer, type ProductStageProps, type ModelViewerProps } from './stage';
`,
  };
}
