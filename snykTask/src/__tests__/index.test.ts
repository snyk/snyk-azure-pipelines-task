import * as fs from 'fs';
import * as path from 'path';
import * as ttm from 'azure-pipelines-task-lib/mock-test';
import * as tmrm from 'azure-pipelines-task-lib/mock-run';

function loadSnykToken(): string {
  const envFile = path.join(__dirname, '.env');
  if (fs.existsSync(envFile)) {
    const match = fs.readFileSync(envFile, 'utf8').match(/^SNYK_TOKEN=(.+)$/m);
    if (match) return match[1].trim();
  }
  if (process.env.SNYK_TOKEN) return process.env.SNYK_TOKEN;
  throw new Error(
    'Snyk token not found. Set SNYK_TOKEN env var or create snykTask/src/__tests__/.env with SNYK_TOKEN=<token>',
  );
}

describe('Snyk Scan Task', () => {
  it('sets SNYK_API when service connection has a URL configured', async () => {
    const snykToken = loadSnykToken();

    const taskPath = path.join(__dirname, '..', '..', 'dist', 'index.js');
    const tmr = new tmrm.TaskMockRunner(taskPath);
    tmr.setInput('serviceConnectionEndpoint', 'SnykConnection');
    tmr.setInput('failOnIssues', 'true');
    tmr.setInput('monitorWhen', 'never');
    tmr.setInput('debug', 'true');

    process.env['AGENT_TEMPDIRECTORY'] = '/tmp';
    process.env['ENDPOINT_URL_SnykConnection'] = 'https://api.snyk.io';//'https://api.eu.snyk.io';
    process.env['ENDPOINT_AUTH_SnykConnection'] = JSON.stringify({
      parameters: { apitoken: snykToken },
      scheme: 'Token',
    });

    tmr.setAnswers({
      cwd: { cwd: process.cwd() },
      getPlatform: { getPlatform: 1 }, // Platform.MacOS
    });

    await tmr.run();
    const task = require(taskPath);
    await task.runPromise;

    expect(true).toBe(true); // TODO
  }, 30000);
});
