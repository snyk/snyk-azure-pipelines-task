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

import deploy, {
  ExtensionPublishArgs,
  getEnvValueOrPanic,
  VSSExtensionOverrideJson,
  getAzUrl,
  errorIfNewVersionAndTargetNotCustom,
} from '../deploy';
import { DeployTarget } from '../cli-args';

test('test getEnvValueOrPanic works', () => {
  process.env = Object.assign(process.env, { EXTENSION_ID: 'test-value' });
  const x = getEnvValueOrPanic('EXTENSION_ID');
  expect(x).toBe('test-value');

  delete process.env.EXTENSION_ID;

  expect(() => {
    getEnvValueOrPanic('EXTENSION_ID');
  }).toThrow(Error);
});

test('verify we can get the input args from env vars', () => {
  process.env = Object.assign(process.env, {
    EXTENSION_ID: 'EXTENSION_ID-TEST_VALUE',
  });
  process.env = Object.assign(process.env, {
    EXTENSION_NAME: 'EXTENSION_NAME-TEST_VALUE',
  });
  process.env = Object.assign(process.env, { TASK_ID: 'TASK_ID-TEST_VALUE' });
  process.env = Object.assign(process.env, {
    TASK_NAME: 'TASK_NAME-TEST_VALUE',
  });
  process.env = Object.assign(process.env, {
    TASK_FRIENDLY_NAME: 'TASK_FRIENDLY_NAME-TEST_VALUE',
  });
  process.env = Object.assign(process.env, {
    AZURE_DEVOPS_EXT_PAT: 'AZURE_DEVOPS_EXT_PAT-TEST_VALUE',
  });
  process.env = Object.assign(process.env, {
    AZURE_DEVOPS_ORG: 'AZURE_DEVOPS_ORG-TEST_VALUE',
  });
  process.env = Object.assign(process.env, {
    VS_MARKETPLACE_PUBLISHER: 'VS_MARKETPLACE_PUBLISHER-TEST_VALUE',
  });

  const x: ExtensionPublishArgs = deploy.getExtensionPublishArgsFromEnvVars();
  expect(x.extensionId).toBe('EXTENSION_ID-TEST_VALUE');
  expect(x.extensionName).toBe('EXTENSION_NAME-TEST_VALUE');
  expect(x.taskId).toBe('TASK_ID-TEST_VALUE');
  expect(x.taskName).toBe('TASK_NAME-TEST_VALUE');
  expect(x.taskFriendlyName).toBe('TASK_FRIENDLY_NAME-TEST_VALUE');
  expect(x.azureDevopsPAT).toBe('AZURE_DEVOPS_EXT_PAT-TEST_VALUE');
  expect(x.azureOrg).toBe('AZURE_DEVOPS_ORG-TEST_VALUE');
  expect(x.vsMarketplacePublisher).toBe('VS_MARKETPLACE_PUBLISHER-TEST_VALUE');

  delete process.env.EXTENSION_ID;
  delete process.env.EXTENSION_NAME;
  delete process.env.TASK_ID;
  delete process.env.TASK_NAME;
  delete process.env.TASK_FRIENDLY_NAME;
  delete process.env.AZURE_DEVOPS_EXT_PAT;
  delete process.env.AZURE_DEVOPS_ORG;
  delete process.env.VS_MARKETPLACE_PUBLISHER;
});

test('verify we can get the input args from custom config file', () => {
  process.env = Object.assign(process.env, {
    AZURE_DEVOPS_EXT_PAT: 'AZURE_DEVOPS_EXT_PAT-TEST_VALUE',
  });

  const mockFs = require('mock-fs');
  mockFs({
    'mock-config-file.json': `{
            "EXTENSION_ID": "EXTENSION_ID-TEST_VALUE",
            "EXTENSION_NAME": "EXTENSION_NAME-TEST_VALUE",
            "TASK_ID": "TASK_ID-TEST_VALUE",
            "TASK_NAME": "TASK_NAME-TEST_VALUE",
            "TASK_FRIENDLY_NAME": "TASK_FRIENDLY_NAME-TEST_VALUE",
            "AZURE_DEVOPS_ORG": "AZURE_DEVOPS_ORG-TEST_VALUE",
            "VS_MARKETPLACE_PUBLISHER": "VS_MARKETPLACE_PUBLISHER-TEST_VALUE"
        }`,
  });

  const x: ExtensionPublishArgs = deploy.getExtensionPublishArgsFromConfigFile(
    'mock-config-file.json',
  );

  expect(x.extensionId).toBe('EXTENSION_ID-TEST_VALUE');
  expect(x.extensionName).toBe('EXTENSION_NAME-TEST_VALUE');
  expect(x.taskId).toBe('TASK_ID-TEST_VALUE');
  expect(x.taskName).toBe('TASK_NAME-TEST_VALUE');
  expect(x.taskFriendlyName).toBe('TASK_FRIENDLY_NAME-TEST_VALUE');
  expect(x.azureDevopsPAT).toBe('AZURE_DEVOPS_EXT_PAT-TEST_VALUE');
  expect(x.azureOrg).toBe('AZURE_DEVOPS_ORG-TEST_VALUE');
  expect(x.vsMarketplacePublisher).toBe('VS_MARKETPLACE_PUBLISHER-TEST_VALUE');

  delete process.env.AZURE_DEVOPS_EXT_PAT;
});

test('test override json builder', () => {
  const jsonStr: string = VSSExtensionOverrideJson.build()
    .withExtensionName('myExtensionName')
    .getJsonString();
  const jsonObj = JSON.parse(jsonStr);
  expect(jsonObj.name).toBe('myExtensionName');
  expect(jsonObj.public).toBe(undefined);
  expect(jsonObj.version).toBe(undefined);
  expect(jsonObj.id).toBe(undefined);
  expect(jsonObj.publisher).toBe(undefined);

  const jsonStr2: string = VSSExtensionOverrideJson.build()
    .withExtensionName('myExtensionName')
    .withPublishPublic(true)
    .getJsonString();
  const jsonObj2 = JSON.parse(jsonStr2);
  expect(jsonObj2.name).toBe('myExtensionName');
  expect(jsonObj2.public).toBe(true);
  expect(jsonObj2.version).toBe(undefined);
  expect(jsonObj2.id).toBe(undefined);
  expect(jsonObj2.publisher).toBe(undefined);

  const jsonStr3: string = VSSExtensionOverrideJson.build()
    .withExtensionName('myExtensionName')
    .withPublishPublic(true)
    .withVersion('1.2.3')
    .getJsonString();
  const jsonObj3 = JSON.parse(jsonStr3);
  expect(jsonObj3.name).toBe('myExtensionName');
  expect(jsonObj3.public).toBe(true);
  expect(jsonObj3.version).toBe('1.2.3');
  expect(jsonObj3.id).toBe(undefined);
  expect(jsonObj3.publisher).toBe(undefined);

  const jsonStr4: string = VSSExtensionOverrideJson.build()
    .withExtensionName('myExtensionName')
    .withPublishPublic(true)
    .withVersion('1.2.3')
    .withExtensionId('test-extension-id')
    .getJsonString();
  const jsonObj4 = JSON.parse(jsonStr4);
  expect(jsonObj4.name).toBe('myExtensionName');
  expect(jsonObj4.public).toBe(true);
  expect(jsonObj4.version).toBe('1.2.3');
  expect(jsonObj4.id).toBe('test-extension-id');
  expect(jsonObj4.publisher).toBe(undefined);

  const jsonStr5: string = VSSExtensionOverrideJson.build()
    .withExtensionName('myExtensionName')
    .withPublishPublic(true)
    .withVersion('1.2.3')
    .withExtensionId('test-extension-id')
    .withExtensionPublisher('test-publisher')
    .getJsonString();
  const jsonObj5 = JSON.parse(jsonStr5);
  expect(jsonObj5.name).toBe('myExtensionName');
  expect(jsonObj5.public).toBe(true);
  expect(jsonObj5.version).toBe('1.2.3');
  expect(jsonObj5.id).toBe('test-extension-id');
  expect(jsonObj5.publisher).toBe('test-publisher');
});

test('test getAzUrl works', () => {
  expect(getAzUrl('test')).toBe('https://dev.azure.com/test/');
});

test('test errorIfNewVersionAndTargetNotCustom works', () => {
  errorIfNewVersionAndTargetNotCustom(DeployTarget.Custom, '0.0.1'); // should not throw error

  expect(() => {
    errorIfNewVersionAndTargetNotCustom(DeployTarget.Dev, '0.0.1');
  }).toThrow(Error);

  expect(() => {
    errorIfNewVersionAndTargetNotCustom(DeployTarget.Dev, '0.0.1');
  }).toThrow(Error);
});
