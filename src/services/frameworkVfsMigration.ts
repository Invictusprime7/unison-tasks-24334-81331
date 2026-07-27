export const FRAMEWORK_VFS_MIGRATION_VERSION = 1;

const SNAPSHOT_PATH = '/.unison/site-bundle-snapshot.json';
const HERO_MARKER = /data-(?:ut-)?variant="hero:/;
const COMPACT_HERO_TOP_PADDING = "'clamp(5.5rem, 8vw, 6.5rem)'";

export interface FrameworkVfsMigrationInput {
  vfsFiles?: Record<string, string> | null;
  metadata?: Record<string, unknown> | null;
}

export interface FrameworkVfsMigrationResult {
  changed: boolean;
  vfsFiles: Record<string, string>;
  metadata: Record<string, unknown>;
  appliedVersions: number[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function migrateHeroTopPadding(source: string): string {
  if (!HERO_MARKER.test(source)) return source;
  return source
    .replace(/paddingTop:\s*'10rem'/g, `paddingTop: ${COMPACT_HERO_TOP_PADDING}`)
    .replace(/paddingTop:\s*'8rem'/g, `paddingTop: ${COMPACT_HERO_TOP_PADDING}`);
}

function migrateVfsFiles(files: Record<string, string>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(files).map(([path, source]) => [path, migrateHeroTopPadding(source)]),
  );
}

function migrateSerializedSnapshot(source: string): string {
  try {
    const snapshot = JSON.parse(source) as Record<string, unknown>;
    if (!isRecord(snapshot.vfsFiles)) return source;

    const vfsFiles = Object.fromEntries(
      Object.entries(snapshot.vfsFiles).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    );
    const migrated = migrateVfsFiles(vfsFiles);
    if (JSON.stringify(migrated) === JSON.stringify(vfsFiles)) return source;
    return JSON.stringify({ ...snapshot, vfsFiles: migrated }, null, 2);
  } catch {
    return source;
  }
}

function migrateMetadataSnapshot(metadata: Record<string, unknown>): Record<string, unknown> {
  const snapshot = metadata.siteBundleSnapshot;
  if (!isRecord(snapshot) || !isRecord(snapshot.vfsFiles)) return metadata;

  const vfsFiles = Object.fromEntries(
    Object.entries(snapshot.vfsFiles).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  );
  const migrated = migrateVfsFiles(vfsFiles);
  if (JSON.stringify(migrated) === JSON.stringify(vfsFiles)) return metadata;
  return { ...metadata, siteBundleSnapshot: { ...snapshot, vfsFiles: migrated } };
}

/**
 * Applies framework-owned, backwards-compatible VFS changes without
 * regenerating pages or replacing user-authored content. A migration only
 * matches a known generated source shape, so custom layout overrides survive.
 */
export function migrateFrameworkVfs(
  input: FrameworkVfsMigrationInput,
): FrameworkVfsMigrationResult {
  const vfsFiles = { ...(input.vfsFiles ?? {}) };
  const metadata = { ...(input.metadata ?? {}) };
  const recordedVersion = Number(metadata.frameworkVfsMigrationVersion ?? 0);
  if (recordedVersion >= FRAMEWORK_VFS_MIGRATION_VERSION) {
    return { changed: false, vfsFiles, metadata, appliedVersions: [] };
  }

  const migratedVfs = migrateVfsFiles(vfsFiles);
  if (typeof migratedVfs[SNAPSHOT_PATH] === 'string') {
    migratedVfs[SNAPSHOT_PATH] = migrateSerializedSnapshot(migratedVfs[SNAPSHOT_PATH]);
  }
  const migratedMetadata = migrateMetadataSnapshot(metadata);
  migratedMetadata.frameworkVfsMigrationVersion = FRAMEWORK_VFS_MIGRATION_VERSION;

  return {
    changed: true,
    vfsFiles: migratedVfs,
    metadata: migratedMetadata,
    appliedVersions: [FRAMEWORK_VFS_MIGRATION_VERSION],
  };
}