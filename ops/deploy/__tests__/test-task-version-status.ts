/*
 * Copyright 2026 Snyk Ltd.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

import * as BuildInterfaces from 'azure-devops-node-api/interfaces/BuildInterfaces';

import {
  probeBuildTaskVersionStatus,
  resolvedTaskVersion,
} from '../lib/azure-devops/task-version-status';

function completedBuild(
  result: BuildInterfaces.BuildResult,
): BuildInterfaces.Build {
  return {
    id: 1880,
    status: BuildInterfaces.BuildStatus.Completed,
    result,
  };
}

const succeeded = completedBuild(BuildInterfaces.BuildResult.Succeeded);

const initializeJobLog = [
  '2026-11-26T10:00:00.1000000Z ##[section]Starting: Initialize job',
  '2026-11-26T10:00:00.2000000Z Downloading task: OtherTask (1.0.0)',
  '2026-11-26T10:00:00.3000000Z Downloading task: DevSnykSecurityScan (0.0.425)',
  '2026-11-26T10:00:00.4000000Z ##[section]Finishing: Initialize job',
];

describe('resolvedTaskVersion', () => {
  test('reads the version the agent downloaded for the named task', () => {
    expect(resolvedTaskVersion(initializeJobLog, 'DevSnykSecurityScan')).toBe(
      '0.0.425',
    );
  });

  test('is undefined when no line names the task', () => {
    expect(resolvedTaskVersion(initializeJobLog, 'SnykSecurityScan')).toBe(
      undefined,
    );
  });
});

describe('probeBuildTaskVersionStatus', () => {
  test('is ready when the probe build downloaded the expected version', () => {
    const result = probeBuildTaskVersionStatus(
      succeeded,
      initializeJobLog,
      'DevSnykSecurityScan',
      '0.0.425',
    );

    expect(result.status).toBe('ready');
  });

  test('is pending while the probe build still downloads an older version', () => {
    const result = probeBuildTaskVersionStatus(
      succeeded,
      initializeJobLog,
      'DevSnykSecurityScan',
      '0.0.426',
    );

    expect(result.status).toBe('pending');
    expect(result.detail).toContain(
      'downloaded DevSnykSecurityScan 0.0.425, waiting for 0.0.426',
    );
  });

  test('is pending when the probe build logs do not name the task', () => {
    const result = probeBuildTaskVersionStatus(
      succeeded,
      ['2026-11-26T10:00:00.1000000Z ##[section]Starting: Initialize job'],
      'DevSnykSecurityScan',
      '0.0.425',
    );

    expect(result.status).toBe('pending');
    expect(result.detail).toContain(
      'probe build 1880 logs do not show which DevSnykSecurityScan version was downloaded',
    );
  });

  test('is pending when the probe build did not succeed', () => {
    const result = probeBuildTaskVersionStatus(
      completedBuild(BuildInterfaces.BuildResult.Failed),
      initializeJobLog,
      'DevSnykSecurityScan',
      '0.0.425',
    );

    expect(result.status).toBe('pending');
    expect(result.detail).toContain(
      'probe build 1880 finished with result Failed',
    );
  });
});
