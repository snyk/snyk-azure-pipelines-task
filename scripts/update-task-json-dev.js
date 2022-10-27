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

const fs = require('fs');
const { exit } = require('process');

console.log('Replacing version snykTask/task.json file...');
// Get version from argument
const version = process.argv[2];
if (!version.match(/[0-9]+\.[0-9]+\.[0-9]+/)) {
  console.log('Invalid version: ', version);
  process.exitCode = 1;
  process.exit();
}

const taskId = process.env.DEV_AZ_TASK_ID; // don't use the production GUID for dev/test deploys
const taskName = process.env.DEV_AZ_TASK_NAME;
const taskFriendlyName = process.env.DEV_AZ_TASK_FRIENDLY_NAME;

if (!taskId) {
  console.log(`taskId not set! failing`);
  process.exit(1);
}

if (!taskName) {
  console.log(`taskName not set! failing`);
  process.exit(1);
}

if (!taskFriendlyName) {
  console.log(`taskFriendlyName not set! failing`);
  process.exit(1);
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
const fileBakPath = './snykTask/task.json.bak';
const taskJsonFileObj = JSON.parse(fs.readFileSync(filePath, 'utf8'));
fs.writeFileSync(fileBakPath, JSON.stringify(taskJsonFileObj, null, 2), 'utf8');

// update information
taskJsonFileObj['version'] = taskVersion;
taskJsonFileObj['id'] = taskId;
taskJsonFileObj['name'] = taskName;
taskJsonFileObj['friendlyName'] = taskFriendlyName;
fs.writeFileSync(filePath, JSON.stringify(taskJsonFileObj, null, 2), 'utf8');

console.log('Version replaced in snykTask/task.json file');
