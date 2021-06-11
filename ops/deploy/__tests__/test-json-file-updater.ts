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
