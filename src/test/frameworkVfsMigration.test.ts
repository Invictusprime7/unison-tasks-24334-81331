import { describe, expect, it } from 'vitest';
import { FRAMEWORK_VFS_MIGRATION_VERSION, migrateFrameworkVfs } from '@/services/frameworkVfsMigration';

const legacyHero = `<section data-ut-variant="hero:centered" style={{ paddingTop: '8rem' }} />`;
const legacyFullBleedHero = `<section data-ut-variant="hero:full-bleed" style={{ paddingTop: '10rem' }} />`;

describe('migrateFrameworkVfs', () => {
  it('upgrades known generated hero spacing in the VFS and embedded snapshot', () => {
    const result = migrateFrameworkVfs({
      vfsFiles: {
        '/src/components/Hero.tsx': legacyHero,
        '/.unison/site-bundle-snapshot.json': JSON.stringify({
          vfsFiles: { '/src/components/Hero.tsx': legacyFullBleedHero },
        }),
      },
      metadata: {
        siteBundleSnapshot: { vfsFiles: { '/src/components/Hero.tsx': legacyHero } },
      },
    });

    expect(result.changed).toBe(true);
    expect(result.appliedVersions).toEqual([FRAMEWORK_VFS_MIGRATION_VERSION]);
    expect(result.vfsFiles['/src/components/Hero.tsx']).toContain("paddingTop: 'clamp(5.5rem, 8vw, 6.5rem)'");
    expect(result.vfsFiles['/.unison/site-bundle-snapshot.json']).toContain("paddingTop: 'clamp(5.5rem, 8vw, 6.5rem)'");
    expect(JSON.stringify(result.metadata.siteBundleSnapshot)).toContain("paddingTop: 'clamp(5.5rem, 8vw, 6.5rem)'");
    expect(result.metadata.frameworkVfsMigrationVersion).toBe(FRAMEWORK_VFS_MIGRATION_VERSION);
  });

  it('does not modify user-authored files without a generated hero marker', () => {
    const result = migrateFrameworkVfs({
      vfsFiles: { '/src/pages/Home.tsx': "const offset = { paddingTop: '8rem' };" },
    });

    expect(result.vfsFiles['/src/pages/Home.tsx']).toContain("paddingTop: '8rem'");
  });

  it('is idempotent after the framework migration version is recorded', () => {
    const result = migrateFrameworkVfs({
      vfsFiles: { '/src/components/Hero.tsx': legacyHero },
      metadata: { frameworkVfsMigrationVersion: FRAMEWORK_VFS_MIGRATION_VERSION },
    });

    expect(result.changed).toBe(false);
    expect(result.appliedVersions).toEqual([]);
    expect(result.vfsFiles['/src/components/Hero.tsx']).toBe(legacyHero);
  });
});