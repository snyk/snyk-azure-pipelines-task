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

/*
  Tread carefully
  ===============

  snyk-report.ts is importing (global) Azure dependencies that don't exists in this project
  thus TS compilation may fail on them, making it impossible for Jest to mock them
*/

import { generateReportTitle } from '../generate-report-title';

describe('SnykReportTab UI', () => {
  describe('generateReportTitle', () => {
    test('handling of single project without vulns', () => {
      const jsonResults = {
        packageManager: 'nuget',
        uniqueCount: 0,
      };
      const title = generateReportTitle(
        jsonResults,
        'report-2021-04-27T13-44-14.json',
      );
      expect(title).toEqual(
        'Snyk Test for nuget (report-2021-04-27 13:44:14) | No issues found',
      );
    });

    test('handling of single project with vulns', () => {
      const jsonResults = {
        packageManager: 'npm',
        uniqueCount: 3,
      };
      const title = generateReportTitle(
        jsonResults,
        'report-2021-04-27T13-44-14.json',
      );
      expect(title).toEqual(
        'Snyk Test for npm (report-2021-04-27 13:44:14) | Found 3 issues',
      );
    });

    test('handling of multiple projects with vulns', () => {
      const jsonResults = [
        {
          packageManager: 'npm',
          uniqueCount: 3,
        },
        {
          packageManager: 'npm',
          uniqueCount: 2,
        },
      ];
      const title = generateReportTitle(
        jsonResults,
        'report-2021-04-27T13-44-14.json',
      );
      expect(title).toEqual('Tested 2 npm projects | Found 5 issues');
    });

    test('handling of multiple projects with vulns', () => {
      const jsonResults = [
        {
          packageManager: 'ruby',
          uniqueCount: 3,
        },
        {
          packageManager: 'ruby',
          uniqueCount: 1,
        },
        {
          packageManager: 'yarn',
          uniqueCount: 0,
        },
        {
          packageManager: 'python',
          uniqueCount: 0,
        },
      ];
      const title = generateReportTitle(
        jsonResults,
        'report-2021-04-27T13-44-14.json',
      );
      expect(title).toEqual(
        'Tested 4 ruby/yarn/python projects | Found 4 issues',
      );
    });
  });
});
