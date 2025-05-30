/*
 * Copyright 2022 Snyk Ltd.
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

import { TaskArgs } from './task-args';
import * as tr from 'azure-pipelines-task-lib/toolrunner';
import * as tl from 'azure-pipelines-task-lib/task';
import stream = require('stream');
import * as fs from 'fs';
import * as path from 'path';

export const JSON_ATTACHMENT_TYPE = 'JSON_ATTACHMENT_TYPE';
export const HTML_ATTACHMENT_TYPE = 'HTML_ATTACHMENT_TYPE';

export const getOptionsToExecuteCmd = (taskArgs: TaskArgs): tr.IExecOptions => {
  return {
    cwd: taskArgs.testDirectory,
    failOnStdErr: false,
    ignoreReturnCode: true,
  } as tr.IExecOptions;
};

export const getOptionsToExecuteSnykCLICommand = (
  taskArgs: TaskArgs,
  taskNameForAnalytics: string,
  taskVersion: string,
  snykToken: string,
): tr.IExecOptions => {
  const options = {
    cwd: taskArgs.testDirectory,
    failOnStdErr: false,
    ignoreReturnCode: true,
    env: {
      ...process.env,
      SNYK_INTEGRATION_NAME: taskNameForAnalytics,
      SNYK_INTEGRATION_VERSION: taskVersion,
      SNYK_TOKEN: snykToken,
    } as tr.IExecOptions['env'],
  } as tr.IExecOptions;
  return options;
};

export const getOptionsForSnykToHtml = (
  htmlOutputFileFullPath: string,
  taskArgs: TaskArgs,
): tr.IExecOptions => {
  const writableString: stream.Writable = fs.createWriteStream(
    htmlOutputFileFullPath,
  );

  return {
    cwd: taskArgs.testDirectory,
    failOnStdErr: false,
    ignoreReturnCode: true,
    outStream: writableString,
  } as tr.IExecOptions;
};

export function formatDate(d: Date): string {
  return d.toISOString().split('.')[0].replace(/:/g, '-');
}

export function attachReport(filePath: string, attachmentType: string) {
  if (fs.existsSync(filePath)) {
    const filename = path.basename(filePath);
    console.log(`${filePath} exists... attaching file`);
    tl.addAttachment(attachmentType, filename, filePath);
  } else {
    console.log(`${filePath} does not exist... cannot attach`);
  }
}

export function removeRegexFromFile(
  fileFullPath: string,
  regex: RegExp,
  debug = false,
) {
  if (fs.existsSync(fileFullPath)) {
    try {
      const data = fs.readFileSync(fileFullPath, {
        encoding: 'utf8',
        flag: 'r',
      });
      const result = data.replace(regex, '');
      fs.writeFileSync(fileFullPath, result);
    } catch (err) {
      if (debug) {
        console.log(`Removing ${regex} from ${fileFullPath} failed.`);
      }
    }
  }
}

export enum Severity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
}

export enum TestType {
  APPLICATION = 'app',
  CODE = 'code',
  CONTAINER_IMAGE = 'container',
}

export const testTypeSeverityThreshold = new Map<string, Array<string>>([
  [
    TestType.APPLICATION,
    [Severity.CRITICAL, Severity.HIGH, Severity.MEDIUM, Severity.LOW],
  ],
  [TestType.CODE, [Severity.HIGH, Severity.MEDIUM, Severity.LOW]],
  [
    TestType.CONTAINER_IMAGE,
    [Severity.CRITICAL, Severity.HIGH, Severity.MEDIUM, Severity.LOW],
  ],
]);

export function getSeverityOrdinal(severity: string): number {
  switch (severity) {
    case Severity.CRITICAL:
      return 3;
    case Severity.HIGH:
      return 2;
    case Severity.MEDIUM:
      return 1;
    case Severity.LOW:
      return 0;
  }
  throw new Error(`Cannot get severity ordinal for ${severity} severity`);
}

const codeSeverityMap = {
  error: Severity.HIGH,
  warning: Severity.MEDIUM,
  info: Severity.LOW,
  note: Severity.LOW,
  none: Severity.LOW,
};

export function doVulnerabilitiesExistForFailureThreshold(
  filePath: string,
  threshold: string,
): boolean {
  if (!fs.existsSync(filePath)) {
    console.log(
      `${filePath} does not exist...cannot use it to search for vulnerabilities, defaulting to detected`,
    );
    return true;
  }

  const file = fs.readFileSync(filePath, 'utf8');
  const json = JSON.parse(file);
  const thresholdOrdinal = getSeverityOrdinal(threshold);

  if (isSnykCodeOutput(json)) {
    return hasMatchingCodeIssues(json['runs'][0]['results'], thresholdOrdinal);
  }

  if (Array.isArray(json)) {
    return json.some((project) =>
      hasMatchingVulnerabilities(project, threshold),
    );
  }

  return (
    hasMatchingVulnerabilities(json, threshold) ||
    hasMatchingApplicationVulnerabilities(json, threshold)
  );
}

function hasMatchingApplicationVulnerabilities(
  project: any,
  threshold: string,
) {
  const applications = project['applications'];
  if (Array.isArray(applications) && applications.length > 0) {
    for (const proj of applications) {
      if (hasMatchingVulnerabilities(proj, threshold)) {
        return true;
      }
    }
  }

  return false;
}

function hasMatchingVulnerabilities(project: any, threshold: string) {
  for (const vulnerability of project['vulnerabilities']) {
    if (
      getSeverityOrdinal(vulnerability['severity']) >=
      getSeverityOrdinal(threshold)
    ) {
      return true;
    }
  }

  return false;
}

// finds code issues levels mapping to severity of matching or higher than threshold
function hasMatchingCodeIssues(results: any, thresholdOrdinal: number) {
  for (const issue of results) {
    if (
      getSeverityOrdinal(codeSeverityMap[issue['level']]) >= thresholdOrdinal
    ) {
      return true;
    }
  }
  return false;
}

// tests whether json content is a Snyk code cli output json
function isSnykCodeOutput(jsonContent: any) {
  return jsonContent['$schema'];
}
