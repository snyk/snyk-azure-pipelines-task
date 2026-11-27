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

import { ProbeResult } from '../poll';

/**
 * The agent downloads every task a job references while initializing the job,
 * so this line shows the task version a pipeline would really run.
 */
export function resolvedTaskVersion(
  logLines: string[],
  taskName: string,
): string | undefined {
  const marker = `Downloading task: ${taskName} (`;

  for (const line of logLines) {
    const start = line.indexOf(marker);
    if (start !== -1) {
      const versionStart = start + marker.length;
      return line.slice(versionStart, line.indexOf(')', versionStart));
    }
  }

  return undefined;
}

export function probeBuildTaskVersionStatus(
  build: BuildInterfaces.Build,
  logLines: string[],
  taskName: string,
  expectedVersion: string,
): ProbeResult {
  const result = build.result || BuildInterfaces.BuildResult.None;

  if (result !== BuildInterfaces.BuildResult.Succeeded) {
    return {
      status: 'pending',
      detail: `probe build ${build.id} finished with result ${BuildInterfaces.BuildResult[result]}`,
    };
  }

  const resolvedVersion = resolvedTaskVersion(logLines, taskName);

  if (resolvedVersion === undefined) {
    return {
      status: 'pending',
      detail: `probe build ${build.id} logs do not show which ${taskName} version was downloaded`,
    };
  }

  if (resolvedVersion !== expectedVersion) {
    return {
      status: 'pending',
      detail: `probe build ${build.id} downloaded ${taskName} ${resolvedVersion}, waiting for ${expectedVersion}`,
    };
  }

  return {
    status: 'ready',
    detail: `probe build ${build.id} downloaded ${taskName} ${expectedVersion}`,
  };
}
