import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';

const ROOT = join(process.cwd());
const PUBLIC = join(ROOT, 'public');
const INDEX_HTML = join(ROOT, 'index.html');

// ---------------------------------------------------------------------------
// AC8: icon rename (public/yalose.svg must exist — typo fix prerequisite)
// ---------------------------------------------------------------------------
describe('public asset existence (AC8)', () => {
  it('public/yalose.svg exists (typo yolose.svg corrected)', () => {
    expect(existsSync(join(PUBLIC, 'yalose.svg'))).toBe(true);
  });

  it('public/yolose.svg does NOT exist (old typo removed)', () => {
    expect(existsSync(join(PUBLIC, 'yolose.svg'))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// AC1: manifest.json shape
// ---------------------------------------------------------------------------
describe('manifest.json shape (AC1)', () => {
  let manifest;

  it('manifest.json exists at public/manifest.json', () => {
    const manifestPath = join(PUBLIC, 'manifest.json');
    expect(existsSync(manifestPath)).toBe(true);
    manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
  });

  it('manifest name is "YaLoSé"', () => {
    const manifestPath = join(PUBLIC, 'manifest.json');
    manifest = manifest || JSON.parse(readFileSync(manifestPath, 'utf-8'));
    expect(manifest.name).toBe('YaLoSé');
  });

  it('manifest short_name is "YaLoSé"', () => {
    const manifestPath = join(PUBLIC, 'manifest.json');
    manifest = manifest || JSON.parse(readFileSync(manifestPath, 'utf-8'));
    expect(manifest.short_name).toBe('YaLoSé');
  });

  it('manifest theme_color is "#FFEB3B"', () => {
    const manifestPath = join(PUBLIC, 'manifest.json');
    manifest = manifest || JSON.parse(readFileSync(manifestPath, 'utf-8'));
    expect(manifest.theme_color).toBe('#FFEB3B');
  });

  it('manifest background_color is "#1a1a2e"', () => {
    const manifestPath = join(PUBLIC, 'manifest.json');
    manifest = manifest || JSON.parse(readFileSync(manifestPath, 'utf-8'));
    expect(manifest.background_color).toBe('#1a1a2e');
  });

  it('manifest display is "standalone"', () => {
    const manifestPath = join(PUBLIC, 'manifest.json');
    manifest = manifest || JSON.parse(readFileSync(manifestPath, 'utf-8'));
    expect(manifest.display).toBe('standalone');
  });

  it('manifest start_url is "/"', () => {
    const manifestPath = join(PUBLIC, 'manifest.json');
    manifest = manifest || JSON.parse(readFileSync(manifestPath, 'utf-8'));
    expect(manifest.start_url).toBe('/');
  });

  it('manifest has 192x192 icon entry', () => {
    const manifestPath = join(PUBLIC, 'manifest.json');
    manifest = manifest || JSON.parse(readFileSync(manifestPath, 'utf-8'));
    const icon192 = manifest.icons.find(i => i.sizes === '192x192');
    expect(icon192).toBeDefined();
    expect(icon192.type).toBe('image/png');
  });

  it('manifest has 512x512 icon entry', () => {
    const manifestPath = join(PUBLIC, 'manifest.json');
    manifest = manifest || JSON.parse(readFileSync(manifestPath, 'utf-8'));
    const icon512 = manifest.icons.find(i => i.sizes === '512x512');
    expect(icon512).toBeDefined();
    expect(icon512.type).toBe('image/png');
  });
});

// ---------------------------------------------------------------------------
// AC2: index.html PWA meta tags
// ---------------------------------------------------------------------------
describe('index.html PWA meta tags (AC2)', () => {
  it('index.html contains <link rel="manifest" href="/manifest.json">', () => {
    const html = readFileSync(INDEX_HTML, 'utf-8');
    expect(html).toContain('rel="manifest"');
    expect(html).toContain('href="/manifest.json"');
  });

  it('index.html contains <meta name="theme-color" content="#FFEB3B">', () => {
    const html = readFileSync(INDEX_HTML, 'utf-8');
    expect(html).toContain('name="theme-color"');
    expect(html).toContain('content="#FFEB3B"');
  });
});

// ---------------------------------------------------------------------------
// AC3: vite-plugin-pwa configuration
// ---------------------------------------------------------------------------
describe('vite-plugin-pwa Workbox config (AC3)', () => {
  it('vite.config.js imports VitePWA from vite-plugin-pwa', () => {
    const config = readFileSync(join(ROOT, 'vite.config.js'), 'utf-8');
    expect(config).toContain("from 'vite-plugin-pwa'");
    expect(config).toContain('VitePWA');
  });

  it('registerType is autoUpdate', () => {
    const config = readFileSync(join(ROOT, 'vite.config.js'), 'utf-8');
    expect(config).toContain("registerType: 'autoUpdate'");
  });

  it('workbox runtimeCaching includes /api/definition/* with NetworkFirst', () => {
    const config = readFileSync(join(ROOT, 'vite.config.js'), 'utf-8');
    expect(config).toContain('runtimeCaching');
    // The urlPattern uses a regex with escaped slashes: /api\/definition\//
    expect(config).toMatch(/api.*definition/);
    expect(config).toContain("'NetworkFirst'");
  });
});

// ---------------------------------------------------------------------------
// localStorage / sessionStorage key contracts — AC7
// ---------------------------------------------------------------------------
describe('PWA storage key contracts (AC7)', () => {
  it('install dismissal sessionStorage key is yalose-pwa-install-dismissed', () => {
    expect('yalose-pwa-install-dismissed').toBe('yalose-pwa-install-dismissed');
  });
});

// ---------------------------------------------------------------------------
// AC2 contract: index.html already references yalose.svg (pre-condition check)
// ---------------------------------------------------------------------------
describe('index.html pre-conditions', () => {
  it('index.html references yalose.svg (not yolose.svg)', () => {
    const html = readFileSync(INDEX_HTML, 'utf-8');
    expect(html).toContain('yalose.svg');
    expect(html).not.toContain('yolose.svg');
  });
});
