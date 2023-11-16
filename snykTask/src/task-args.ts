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

import * as tl from 'azure-pipelines-task-lib';
import { Severity, TestType, testTypeSeverityThreshold } from './task-lib';
export type MonitorWhen = 'never' | 'noIssuesFound' | 'always';
class TaskArgs {
  testType: string | undefined = '';

  targetFile: string | undefined = '';

  dockerImageName: string | undefined = '';
  dockerfilePath: string | undefined = '';

  severityThreshold: string | undefined = '';
  failOnThreshold: string = Severity.LOW;
  organization: string | undefined = '';
  monitorWhen: MonitorWhen = 'always';
  failOnIssues: boolean = true;
  projectName: string | undefined = '';

  testDirectory: string | undefined = '';
  additionalArguments: string = '';
  ignoreUnknownCA: boolean = false;
  // Snyk Code severity with its own pickList (no critical)
  codeSeverityThreshold: string | undefined = '';

  delayAfterReportGenerationSeconds: number = 0;

  // the params here are the ones which are mandatory
  constructor(params: { failOnIssues: boolean }) {
    this.failOnIssues = params.failOnIssues;
  }

  public setMonitorWhen(rawInput?: string) {
    if (rawInput) {
      const lowerCaseInput = rawInput.toLowerCase();
      if (this.testType == TestType.CODE) {
        console.log('Snyk Code publishes results using --report workflow');
        this.monitorWhen = 'never';
      } else if (lowerCaseInput === 'never' || lowerCaseInput === 'always') {
        this.monitorWhen = lowerCaseInput;
      } else if (lowerCaseInput === 'noissuesfound') {
        this.monitorWhen = 'noIssuesFound';
      } else {
        console.log(
          `Invalid value for monitorWhen: '${rawInput}'. Ignoring this parameter.`,
        );
      }
    }
  }

  // disallow snyk code monitor which follows --report workflow
  public shouldRunMonitor(snykTestSuccess: boolean): boolean {
    if (this.testType == TestType.CODE) {
      return false;
    } else if (this.monitorWhen === 'always') {
      return true;
    } else if (this.monitorWhen === 'never') {
      return false;
    } else {
      // noIssuesFound
      return snykTestSuccess;
    }
  }

  getFileParameter() {
    if (this.targetFile && !this.dockerImageName) {
      return this.targetFile;
    }

    if (this.dockerImageName && this.dockerfilePath) {
      return this.dockerfilePath;
    }

    if (
      this.dockerImageName &&
      !this.dockerfilePath &&
      this.targetFile &&
      this.targetFile.toLowerCase().includes('dockerfile')
    ) {
      return this.targetFile;
    } else {
      return '';
    }
  }

  getProjectNameParameter() {
    if (!this.projectName) {
      return undefined;
    }

    if (this.projectName.indexOf(' ') >= 0) {
      console.log('project name contains space');
      return `"${this.projectName}"`;
    }

    return this.projectName;
  }

  // validate based on testTypeSeverityThreshold applicable thresholds
  public validate() {
    const taskTestType = this.testType || TestType.APPLICATION;
    const validTestTypes: any = Object.values(TestType);
    const taskTestTypeThreshold =
      testTypeSeverityThreshold.get(taskTestType) ??
      testTypeSeverityThreshold.get(TestType.APPLICATION);

    if (!validTestTypes.includes(taskTestType)) {
      const warningMsgTestType = `Invalid testType specified. Defaulted to 'app'`;
      console.log(warningMsgTestType);
    }

    if (this.failOnThreshold) {
      if (
        !taskTestTypeThreshold?.includes(this.failOnThreshold.toLowerCase())
      ) {
        const errorMsg = `If set, failOnThreshold must be one from [${taskTestTypeThreshold}] (case insensitive). If not set, the default is '${Severity.LOW}'.`;
        throw new Error(errorMsg);
      }
    }

    if (
      taskTestType != TestType.CODE &&
      this.severityThreshold &&
      !taskTestTypeThreshold?.includes(this.severityThreshold.toLowerCase())
    ) {
      const errorMsg = `If set, severityThreshold must be one from [${taskTestTypeThreshold}] (case insensitive). If not set, the default is '${Severity.LOW}'.`;
      throw new Error(errorMsg);
    }

    if (
      taskTestType == TestType.CODE &&
      this.codeSeverityThreshold &&
      !taskTestTypeThreshold?.includes(this.codeSeverityThreshold.toLowerCase())
    ) {
      const errorMsg = `If set, codeSeverityThreshold must be one from [${taskTestTypeThreshold}] (case insensitive). If not set, the default is '${Severity.LOW}'.`;
      throw new Error(errorMsg);
    }
  }
}

export function getAuthToken() {
  const serviceConnectionEndpoint = tl.getInput(
    'serviceConnectionEndpoint',
    false,
  );

  const authToken = tl.getInput('authToken', false);

  if (authToken && !serviceConnectionEndpoint) {
    return authToken;
  } else {
    // pull token from the service connection and fail if it is not set
    if (serviceConnectionEndpoint) {
      const endpointAuthorization = tl.getEndpointAuthorization(
        serviceConnectionEndpoint,
        false,
      );

      if (endpointAuthorization) {
        const authTokenFromServiceConnection =
          endpointAuthorization.parameters['apitoken'];
        return authTokenFromServiceConnection;
      }
    }
  }
  return '';
}

export { TaskArgs };
