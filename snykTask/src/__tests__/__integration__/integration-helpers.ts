import * as fs from 'fs';
import * as path from 'path';

/**
 * Copy integration artifacts (JSON, HTML, downloaded binaries) after each test.
 * Use the following code to copy artifacts to a directory next to this test file:
 * const INTEGRATION_ARTIFACTS_OUTPUT_DIR = path.join(
 *   __dirname,
 *   'integration-artifacts',
 * );
 */
const INTEGRATION_ARTIFACTS_OUTPUT_DIR = '';

const SNYK_TASK_ROOT = path.resolve(__dirname, '../../..');
export const COMPILED_TASK_JS = path.join(SNYK_TASK_ROOT, 'dist', 'index.js');
export const REPO_ROOT_FOR_SNYK_TEST = path.resolve(SNYK_TASK_ROOT, '..');

export function assertSnykTestJsonReport(
  parsed: Record<string, unknown>,
  expectedProjectRoot: string,
): void {
  expect(parsed.ok).toBe(true);
  expect(Array.isArray(parsed.vulnerabilities)).toBe(true);

  expect(typeof parsed.org).toBe('string');
  expect((parsed.org as string).length).toBeGreaterThan(0);

  expect(parsed.packageManager).toBe('npm');

  const pkgPath = path.join(expectedProjectRoot, 'package.json');
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as { name?: string };
  expect(typeof pkg.name).toBe('string');
  expect(parsed.projectName).toBe(pkg.name);

  expect(parsed.displayTargetFile).toBe('package-lock.json');

  expect(typeof parsed.dependencyCount).toBe('number');
  expect(parsed.dependencyCount as number).toBeGreaterThanOrEqual(0);

  expect(typeof parsed.path).toBe('string');
  expect(path.normalize(parsed.path as string)).toBe(
    path.normalize(expectedProjectRoot),
  );

  expect(typeof parsed.summary).toBe('string');
  expect((parsed.summary as string).length).toBeGreaterThan(0);
}

export function assertSnykTestHtmlReport(
  html: string,
  expectedProjectRoot: string,
  expectedProjectName: string,
): void {
  expect(html).toMatch(/<!DOCTYPE html>/i);
  expect(html).toContain('<title>Snyk test report</title>');
  expect(html).toContain(
    '<h1 class="project__header__title">Snyk test report</h1>',
  );
  expect(html).toContain('Package Manager</th>');
  expect(html).toContain('<td class="meta-row-value">npm</td>');
  expect(html).toContain(expectedProjectName);
  expect(html).toContain(path.normalize(expectedProjectRoot));
}

function trimArtifactsPath(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

/** Relative paths resolve against the monorepo root (same anchor as this test's Snyk project), not process.cwd(). */
function normalizeArtifactsRoot(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  return path.isAbsolute(t)
    ? path.normalize(t)
    : path.resolve(REPO_ROOT_FOR_SNYK_TEST, t);
}

function resolveIntegrationArtifactsRoot(): string | undefined {
  const fromFile = trimArtifactsPath(INTEGRATION_ARTIFACTS_OUTPUT_DIR);
  if (fromFile) {
    return normalizeArtifactsRoot(fromFile);
  }
  const fromEnv = trimArtifactsPath(process.env.SNYK_INTEGRATION_ARTIFACTS_DIR);
  if (fromEnv) {
    return normalizeArtifactsRoot(fromEnv);
  }
  return undefined;
}

function ensureArtifactsDirectoryExists(resolvedRoot: string): void {
  if (fs.existsSync(resolvedRoot)) {
    const st = fs.statSync(resolvedRoot);
    if (!st.isDirectory()) {
      throw new Error(
        `Integration artifacts path must be a directory, not a file: ${resolvedRoot}`,
      );
    }
    return;
  }
  fs.mkdirSync(resolvedRoot, { recursive: true });
}

export function maybeCopyArtifactsThenRemoveTempDir(dir: string): void {
  if (!dir || !fs.existsSync(dir)) return;

  const copyDestRoot = resolveIntegrationArtifactsRoot();
  if (copyDestRoot) {
    ensureArtifactsDirectoryExists(copyDestRoot);
    const dest = path.join(
      copyDestRoot,
      `run-${new Date().toISOString().replace(/[:.]/g, '-')}`,
    );
    fs.mkdirSync(dest, { recursive: true });
    fs.cpSync(dir, dest, { recursive: true });
    console.log(
      `Integration test: copied artifacts to ${dest} (from INTEGRATION_ARTIFACTS_OUTPUT_DIR or SNYK_INTEGRATION_ARTIFACTS_DIR)`,
    );
  }

  fs.rmSync(dir, { recursive: true, force: true });
}

export function loadSnykToken(): string {
  if (process.env.TEST_SNYK_TOKEN?.trim()) return process.env.TEST_SNYK_TOKEN.trim();

  throw new Error(
    `No credentials for integration test. Set TEST_SNYK_TOKEN before running the test.`,
  );
}
