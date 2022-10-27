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

test('test JsonFileUpdater', () => {
  const deployModule = require('../deploy');

  const mockFs = require('mock-fs');
  mockFs({
    'mock-json-file.json': `{
            "name": "test-name",
            "otherField": "test-otherField"
        }`,
  });

  const updates = {
    name: 'new-name',
    version: {
      Major: 0,
      Minor: 0,
      Patch: 20,
    },
  };

  deployModule.JsonFileUpdater.build()
    .setJsonFile('mock-json-file.json')
    .withUpdates(updates)
    .updateFile();

  const fs = require('fs');

  const jsonObjAfterUpdate = JSON.parse(
    fs.readFileSync('mock-json-file.json', 'utf8'),
  );
  expect(jsonObjAfterUpdate.name).toBe('new-name');
  expect(jsonObjAfterUpdate.otherField).toBe('test-otherField');
});

test("JsonFileUpdater doesn't write the file out unless there are updates", () => {
  const mockFn = jest.fn().mockReturnValue(`{
      "name": "test-name-x",
      "otherField": "test-otherField"
    }`);

  const mockFsWriteFileSync = jest.fn(); // no-op implementation

  jest.doMock('fs', () => {
    return {
      readFileSync: mockFn,
      writeFileSync: mockFsWriteFileSync,
    };
  });

  const deployModule = require('../deploy');

  deployModule.JsonFileUpdater.build()
    .setJsonFile('mock-json-file.json')
    // no updates
    .updateFile();

  expect(mockFsWriteFileSync).toHaveBeenCalledTimes(0);
});
