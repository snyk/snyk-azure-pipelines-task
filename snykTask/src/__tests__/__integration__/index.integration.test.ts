import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { TaskMockRunner } from 'azure-pipelines-task-lib/mock-run';

/**
 * Copy integration artifacts (JSON, HTML, downloaded binaries) after each test.
 * Use the following code to copy artifacts to a directory next to this test file:
 * const INTEGRATION_ARTIFACTS_OUTPUT_DIR = path.join(
 *   __dirname,
 *   'integration-artifacts',
 * );
 */
const INTEGRATION_ARTIFACTS_OUTPUT_DIR = '';

/** Shape checks for `snyk test` JSON output */
function assertSnykTestJsonReport(
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

describe('Snyk Task E2E', () => {
  let tempDir: string;
  const savedEnv: Record<string, string | undefined> = {};
  const envKeysToRestore: string[] = [];

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'snyk-integration-'));

    const keysToSave = [
      'AGENT_TEMPDIRECTORY',
      ...Object.keys(process.env).filter(
        (k) =>
          k.startsWith('INPUT_') ||
          k.startsWith('ENDPOINT_') ||
          k.startsWith('SECRET_'),
      ),
    ];
    for (const key of keysToSave) {
      savedEnv[key] = process.env[key];
      envKeysToRestore.push(key);
    }

    process.env['AGENT_TEMPDIRECTORY'] = tempDir;
  });

  afterEach(() => {
    for (const key of envKeysToRestore) {
      if (savedEnv[key] === undefined) delete process.env[key];
      else process.env[key] = savedEnv[key];
    }
    envKeysToRestore.length = 0;

    maybeCopyArtifactsThenRemoveTempDir(tempDir);

    Object.keys(require.cache)
      .filter(
        (k) =>
          k.includes('dist/index') || k.includes('azure-pipelines-task-lib'),
      )
      .forEach((k) => delete require.cache[k]);
  });

  /**
   * End-to-end: real task lib, CLI download, `snyk test`, JSON report on disk.
   * Service connection URL → SNYK_API is not echoed in the report; that is covered by unit tests.
   */
  it('generates a JSON report file with expected shape', async () => {
    const snykToken = loadSnykToken();
    const taskPath = path.join(__dirname, '..', '..', '..', 'dist', 'index.js');
    const projectRoot = process.cwd();

    const tmr = new TaskMockRunner(taskPath);
    tmr.setInput('serviceConnectionEndpoint', 'SnykConnection');
    tmr.setInput('failOnIssues', 'true');
    tmr.setInput('monitorWhen', 'never');

    process.env['ENDPOINT_URL_SnykConnection'] = 'https://api.snyk.io';
    process.env['ENDPOINT_AUTH_SnykConnection'] = JSON.stringify({
      parameters: { apitoken: snykToken },
      scheme: 'Token',
    });

    tmr.run(true);
    const task = require(taskPath);
    await task.runPromise;

    const files = fs.readdirSync(tempDir);
    const jsonReport = files.find(
      (f) => f.startsWith('report-') && f.endsWith('.json'),
    );
    expect(jsonReport).toBeDefined();
    const content = fs.readFileSync(
      path.join(tempDir, jsonReport as string),
      'utf8',
    );
    const parsed = JSON.parse(content) as Record<string, unknown>;
    assertSnykTestJsonReport(parsed, projectRoot);

    // TODO: assert HTML report exists (requires snyk-to-html binary compatible with platform)
    // TODO: assert tl.setResult was called with Succeeded
  }, 120_000);

  // TODO: test with a custom CLI path via SNYK_CLI_PATH env var
});

function trimArtifactsPath(value: unknown): string {
  if (typeof value !== 'string') return '';
  return value.trim();
}

function normalizeArtifactsRoot(raw: string): string {
  const t = raw.trim();
  if (!t) return '';
  return path.isAbsolute(t)
    ? path.normalize(t)
    : path.resolve(process.cwd(), t);
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

function maybeCopyArtifactsThenRemoveTempDir(dir: string): void {
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

function loadSnykToken(): string {
  const envFile = path.join(__dirname, '..', '.env');
  if (fs.existsSync(envFile)) {
    const match = fs.readFileSync(envFile, 'utf8').match(/^SNYK_TOKEN=(.+)$/m);
    if (match) return match[1].trim();
  }
  if (process.env.SNYK_TOKEN) return process.env.SNYK_TOKEN;
  throw new Error(
    'SNYK_TOKEN not found. Set SNYK_TOKEN env var or create snykTask/src/__tests__/.env with SNYK_TOKEN=<token>',
  );
}
