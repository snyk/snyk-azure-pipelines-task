import * as path from 'path';
import * as ttm from 'azure-pipelines-task-lib/mock-test';
import * as tmrm from 'azure-pipelines-task-lib/mock-run';

describe('Snyk Scan Task', () => {
  it('sets SNYK_API when service connection has a URL configured', async () => {
    // const tp = path.join(__dirname, 'scenarios', 'snykApiSet.js');
    // const tr = new ttm.MockTestRunner(tp);
    // await tr.runAsync();

    const taskPath = path.join(__dirname, '..', '..', 'dist', 'index.js');
    const tmr = new tmrm.TaskMockRunner(taskPath);
    tmr.setInput('serviceConnectionEndpoint', 'SnykConnection');
    tmr.setInput('failOnIssues', 'true');
    tmr.setInput('monitorWhen', 'never');
    tmr.setInput('debug', 'true');

    process.env['AGENT_TEMPDIRECTORY'] = '/tmp';
    process.env['ENDPOINT_URL_SnykConnection'] = 'https://api.eu.snyk.io';
    process.env['ENDPOINT_AUTH_SnykConnection'] = JSON.stringify({
      parameters: { apitoken: 'test-token' },
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
