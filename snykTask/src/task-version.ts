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

import * as fs from 'fs';

export function getTaskVersion(taskJsonPath: string): string {
  const taskJsonFile = fs.readFileSync(taskJsonPath, 'utf8');
  const taskObj = JSON.parse(taskJsonFile);
  const versionObj = taskObj.version;

  const versionString = `${versionObj.Major}.${versionObj.Minor}.${versionObj.Patch}`;
  return versionString;
}
