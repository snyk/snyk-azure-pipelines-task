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

/* This test is in JS not TS because I need to be able to set args.targetFile and args.dockerFilePath to null
   to simulate the case where Azure returns null from getInput() when the corresponding input paremters
   are not set and I can't do that in TypeScript without modifying the tsconfig.js to have "strictNullChecks": false
   which I don't want to do. */

import { TaskArgs } from '../task-args';
import { Severity } from '../task-lib';

function defaultTaskArgs(): TaskArgs {
  return new TaskArgs({
    failOnIssues: true,
  });
}

// Azure's getInput() returns nulls for inputs which are not set. Make sure they don't result in NPEs in the task args parsing.
test('ensure no problems if both targetFile and docker-file-path are both not set', () => {
  const args = defaultTaskArgs();
  args.dockerImageName = 'some-docker-image';
  args.targetFile = null as any;
  args.dockerfilePath = null as any;

  const fileArg = args.getFileParameter();
  console.log(`fileArg: ${fileArg}`);
  if (fileArg == null) {
    console.log('fileArg is null');
  }

  expect(fileArg).toBe('');
});

test("if dockerImageName is specified and (dockerfilePath is not specified but targetFile is and does not contain 'Dockerfile') then return empty string", () => {
  const args = defaultTaskArgs();
  args.dockerImageName = 'some-docker-image';
  args.targetFile = 'should/not/be/set.pom';
  args.dockerfilePath = null as any;

  const fileArg = args.getFileParameter();
  console.log(`fileArg: ${fileArg}`);
  if (fileArg == null) {
    console.log('fileArg is null');
  }

  expect(fileArg).toBe('');
});

test("if dockerImageName is specified and (dockerfilePath is not specified but targetFile is and contains 'Dockerfile') then use targetFile", () => {
  const args = defaultTaskArgs();
  args.dockerImageName = 'some-docker-image';
  args.targetFile = 'my/Dockerfile';
  args.dockerfilePath = null as any;

  const fileArg = args.getFileParameter();
  console.log(`fileArg: ${fileArg}`);
  if (fileArg == null) {
    console.log('fileArg is null');
  }

  expect(fileArg).toBe('my/Dockerfile');
});

test('if dockerImageName is set and both targetFile and dockerfilePath are set, use dockerfilePath', () => {
  const args = defaultTaskArgs();
  args.dockerImageName = 'some-docker-image';
  args.targetFile = 'bad/Dockerfile';
  args.dockerfilePath = 'good/Dockerfile';

  const fileArg = args.getFileParameter();
  console.log(`fileArg: ${fileArg}`);
  if (fileArg == null) {
    console.log('fileArg is null');
  }

  expect(fileArg).toBe('good/Dockerfile');
});

test('project name is wrapped in quotes, if project name contains space', () => {
  const args = defaultTaskArgs();
  args.projectName = 'my project';

  const projectNameArg = args.getProjectNameParameter();

  expect(projectNameArg).toBe('"my project"');
});

test('ensure that ignoreUnknownCA is false by default', () => {
  const args = defaultTaskArgs();
  expect(args.ignoreUnknownCA).toBe(false);
});

describe('TaskArgs.setMonitorWhen', () => {
  const args = defaultTaskArgs();

  it('defaults to `noIssuesFound` when undefined, empty string, or invalid value', () => {
    args.setMonitorWhen(undefined);
    expect(args.monitorWhen).toBe('always');

    args.setMonitorWhen('');
    expect(args.monitorWhen).toBe('always');

    args.setMonitorWhen('invalid-option');
    expect(args.monitorWhen).toBe('always');
  });

  it('works for valid inputs', () => {
    args.setMonitorWhen('never');
    expect(args.monitorWhen).toBe('never');

    args.setMonitorWhen('noIssuesFound');
    expect(args.monitorWhen).toBe('noIssuesFound');

    args.setMonitorWhen('always');
    expect(args.monitorWhen).toBe('always');
  });
});

describe('TaskArgs.validate', () => {
  const args = defaultTaskArgs();
  const validSeverityThresholds = [
    Severity.CRITICAL,
    Severity.HIGH,
    Severity.MEDIUM,
    Severity.LOW,
  ];
  it('passes validation when correct combination of severity and fail on thresholds', () => {
    args.severityThreshold = Severity.LOW;
    args.failOnThreshold = Severity.HIGH;
    args.validate();
  });

  it('passes validation when only severity level specified', () => {
    args.severityThreshold = Severity.HIGH;
    args.validate();
  });

  it('passes validation when only fail on threshold specified', () => {
    args.failOnThreshold = Severity.HIGH;
    args.validate();
  });

  it('throws error if invalid severity threshold', () => {
    expect(() => {
      args.severityThreshold = 'hey';
      args.validate();
    }).toThrow(
      new Error(
        "If set, severityThreshold must be 'critical' or 'high' or 'medium' or 'low' (case insensitive). If not set, the default is 'low'.",
      ),
    );
  });

  it.each(validSeverityThresholds)(
    'passes validation for ${level}',
    (level) => {
      args.severityThreshold = level;
      args.validate();
    },
  );
});

const SNYK_TEST_SUCCESS_TRUE = true;
const SNYK_TEST_SUCCESS_FALSE = false;

function argsFrom(params: { monitorWhen: string }): TaskArgs {
  const args = new TaskArgs({
    failOnIssues: true,
  });
  if (params.monitorWhen) {
    args.setMonitorWhen(params.monitorWhen);
  }
  return args;
}

describe('TaskArgs.shouldRunMonitor', () => {
  describe('when `monitorWhen` is `always`', () => {
    const args = argsFrom({
      monitorWhen: 'always',
    });
    it('returns true when snykTestSuccess is false', () => {
      expect(args.shouldRunMonitor(SNYK_TEST_SUCCESS_FALSE)).toBe(true);
    });
    it('returns true when snykTestSuccess is true', () => {
      expect(args.shouldRunMonitor(SNYK_TEST_SUCCESS_TRUE)).toBe(true);
    });
  });

  describe('and `monitorWhen` is `never`', () => {
    const args = argsFrom({
      monitorWhen: 'never',
    });
    it('returns false when snykTestSuccess is false', () => {
      expect(args.shouldRunMonitor(SNYK_TEST_SUCCESS_FALSE)).toBe(false);
    });
    it('returns false when snykTestSuccess is true', () => {
      expect(args.shouldRunMonitor(SNYK_TEST_SUCCESS_TRUE)).toBe(false);
    });
  });

  describe('and `monitorWhen` is `noIssuesFound`', () => {
    const args = argsFrom({
      monitorWhen: 'noIssuesFound',
    });
    it('returns false when snykTestSuccess is false', () => {
      expect(args.shouldRunMonitor(SNYK_TEST_SUCCESS_FALSE)).toBe(false);
    });
    it('returns true when snykTestSuccess is true', () => {
      expect(args.shouldRunMonitor(SNYK_TEST_SUCCESS_TRUE)).toBe(true);
    });
  });
});
