/*
 * Copyright 2025 Snyk Ltd.
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

const fs = require('fs');

console.log('Replacing version snykTask/task.json file...');
// Get version from argument
const version = process.argv[2];

const taskId = process.env.PREVIEW_AZ_TASK_ID;
const taskName = process.env.AZ_TASK_NAME;
const taskFriendlyName = process.env.AZ_TASK_FRIENDLY_NAME;

if (!version.match(/^\d{4}\.\d{1,2}\.\d{1,2}\d{4}$/)) {
  console.log('Invalid version: ', version);
  process.exitCode = 1;
  process.exit();
}

// Break version and create the JSON to be replaced
const metaVersion = version.split('.');
const taskVersion = {
  Major: metaVersion[0],
  Minor: metaVersion[1],
  Patch: metaVersion[2],
};

console.log('taskVersion: ', taskVersion);

// Replace version in the snykTask/task.json file
const filePath = './snykTask/task.json';
const taskJSON_File = JSON.parse(fs.readFileSync(filePath, 'utf8'));

taskJSON_File['id'] = taskId;
taskJSON_File['name'] = taskName;
taskJSON_File['friendlyName'] = taskFriendlyName;
taskJSON_File['version'] = taskVersion;

fs.writeFileSync(filePath, JSON.stringify(taskJSON_File, null, 2), 'utf8');

console.log(
  'Version replaced in snykTask/task.json file with: ',
  taskJSON_File['version'],
);
