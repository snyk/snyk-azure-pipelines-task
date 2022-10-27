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

import { parseInputParameters, Command, DeployTarget } from '../cli-args';

class FakeExitError extends Error {
  constructor(message?: string) {
    super(message);
  }
}

let mockProcessExit;

beforeEach(() => {
  //@ts-ignore
  mockProcessExit = jest
    .spyOn(process, 'exit')
    .mockImplementation((exitCode) => {
      throw new FakeExitError('fake exit');
    });
});

afterEach(() => {
  mockProcessExit.mockRestore();
});

test('fail if no command (version-check/command) is set', () => {
  expect(() => {
    const inputArgs = [];
    parseInputParameters(inputArgs);
  }).toThrow(FakeExitError);
});

test('version-check arg parsing works', () => {
  const inputArgs = ['version-check'];
  const parsedArgs = parseInputParameters(inputArgs);
  expect(parsedArgs.command).toBe(Command.VersionCheck);
});

test('deploy to dev arg parsing works', () => {
  const inputArgs = ['deploy', '--target', 'dev'];
  const parsedArgs = parseInputParameters(inputArgs);
  expect(parsedArgs.command).toBe(Command.Deploy);
  expect(parsedArgs.target).toBe(DeployTarget.Dev);
});

test('deploy to prod arg parsing works', () => {
  const inputArgs = ['deploy', '--target', 'prod'];
  const parsedArgs = parseInputParameters(inputArgs);
  expect(parsedArgs.command).toBe(Command.Deploy);
  expect(parsedArgs.target).toBe(DeployTarget.Prod);
});

test('deploy to custom target fails if --config-file not set', () => {
  expect(() => {
    const inputArgs = ['deploy', '--target', 'custom'];
    parseInputParameters(inputArgs);
  }).toThrow(FakeExitError);
});

test('deploy to custom target works if --config-file is set', () => {
  const inputArgs = [
    'deploy',
    '--target',
    'custom',
    '--config-file',
    'myconfig.json',
  ];
  const parsedArgs = parseInputParameters(inputArgs);
  expect(parsedArgs.command).toBe(Command.Deploy);
  expect(parsedArgs.target).toBe(DeployTarget.Custom);
});

test('deploy to custom target works if --config-file is set and --new-version is set', () => {
  const inputArgs = [
    'deploy',
    '--target',
    'custom',
    '--config-file',
    'myconfig.json',
    '--new-version',
    '1.2.3',
  ];
  const parsedArgs = parseInputParameters(inputArgs);
  expect(parsedArgs.command).toBe(Command.Deploy);
  expect(parsedArgs.target).toBe(DeployTarget.Custom);
  expect(parsedArgs.newVersion).toBe('1.2.3');
});

test('fail if --config-file is set and target is not custom', () => {
  {
    expect(() => {
      const inputArgs = [
        'deploy',
        '--target',
        'dev',
        '--config-file',
        'myconfig.json',
      ];
      parseInputParameters(inputArgs);
    }).toThrow(FakeExitError);
  }

  {
    expect(() => {
      const inputArgs = [
        'deploy',
        '--target',
        'prod',
        '--config-file',
        'myconfig.json',
      ];
      parseInputParameters(inputArgs);
    }).toThrow(FakeExitError);
  }
});

test('fail if --new-version is set and target is not custom', () => {
  {
    expect(() => {
      const inputArgs = ['deploy', '--target', 'dev', '--new-version', '1.2.3'];
      parseInputParameters(inputArgs);
    }).toThrow(FakeExitError);
  }

  {
    expect(() => {
      const inputArgs = [
        'deploy',
        '--target',
        'prod',
        '--new-version',
        '1.2.3',
      ];
      parseInputParameters(inputArgs);
    }).toThrow(FakeExitError);
  }
});
