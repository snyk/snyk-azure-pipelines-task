import { TaskArgs } from './task-args';
import * as tr from 'azure-pipelines-task-lib/toolrunner';
import * as tl from 'azure-pipelines-task-lib/task';
import stream = require('stream');
import * as fs from 'fs';
const fsPromises = require('fs').promises;
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

export function isNotValidThreshold(threshold: string) {
  const severityThresholdLowerCase = threshold.toLowerCase();

  return (
    severityThresholdLowerCase !== Severity.CRITICAL &&
    severityThresholdLowerCase !== Severity.HIGH &&
    severityThresholdLowerCase !== Severity.MEDIUM &&
    severityThresholdLowerCase !== Severity.LOW
  );
}

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

export async function doVulnerabilitiesExistForFailureThreshold(filePath: string, threshold: string) : Promise<boolean> {

  const file = await fsPromises.readFile(filePath, 'utf8');
  const json = JSON.parse(file);
  const thresholdOrdinal = getSeverityOrdinal(threshold);

  for (const vulnerability of json['vulnerabilities']) {
    if (getSeverityOrdinal(vulnerability['severity']) >= thresholdOrdinal) {
      return true;
    }
  }

  return false;
}