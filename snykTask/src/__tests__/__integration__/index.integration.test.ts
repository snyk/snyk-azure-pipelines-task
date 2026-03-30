import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { TaskMockRunner } from 'azure-pipelines-task-lib/mock-run';
import {
  assertSnykTestHtmlReport,
  assertSnykTestJsonReport,
  COMPILED_TASK_JS,
  loadSnykToken,
  maybeCopyArtifactsThenRemoveTempDir,
  REPO_ROOT_FOR_SNYK_TEST,
} from './integration-helpers';

// You can run this integration test locally by setting the TEST_SNYK_TOKEN environment variable.
// Example when using 1Password:
// TEST_SNYK_TOKEN="op://<Vault>/API Credentials/credential" op run -- npm run test:integration

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

  it('runs snyk test end-to-end with expected JSON and HTML reports', async () => {
    const snykToken = loadSnykToken();
    const taskPath = COMPILED_TASK_JS;
    const projectRoot = REPO_ROOT_FOR_SNYK_TEST;
    const pkg = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'),
    ) as { name?: string };
    expect(typeof pkg.name).toBe('string');

    const tmr = new TaskMockRunner(taskPath);
    tmr.setInput('serviceConnectionEndpoint', 'SnykConnection');
    tmr.setInput('failOnIssues', 'true');
    tmr.setInput('monitorWhen', 'never');

    process.env['ENDPOINT_URL_SnykConnection'] = 'https://api.snyk.io';
    process.env['ENDPOINT_AUTH_SnykConnection'] = JSON.stringify({
      parameters: { apitoken: snykToken },
      scheme: 'Token',
    });

    const apTask = await import('azure-pipelines-task-lib/task');
    const setResultSpy = jest.spyOn(apTask, 'setResult');
    try {
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

      const htmlReport = (jsonReport as string).replace(/\.json$/i, '.html');
      expect(fs.existsSync(path.join(tempDir, htmlReport))).toBe(true);
      const html = fs.readFileSync(path.join(tempDir, htmlReport), 'utf8');
      assertSnykTestHtmlReport(html);

      expect(setResultSpy).toHaveBeenCalledWith(
        apTask.TaskResult.Succeeded,
        'Snyk Scan completed',
      );
    } finally {
      setResultSpy.mockRestore();
    }
  }, 120_000);
});
