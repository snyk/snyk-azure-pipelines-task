/*
 * Copyright 2026 Snyk Ltd.
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

import * as ExtensionManagementInterfaces from 'azure-devops-node-api/interfaces/ExtensionManagementInterfaces';
import * as GalleryInterfaces from 'azure-devops-node-api/interfaces/GalleryInterfaces';

import {
  installedVersionStatus,
  marketplaceVersionStatus,
} from '../lib/azure-devops/extension-status';

function publishedExtension(
  versions: GalleryInterfaces.ExtensionVersion[],
): GalleryInterfaces.PublishedExtension {
  return { versions } as GalleryInterfaces.PublishedExtension;
}

function installedExtension(
  version: string,
): ExtensionManagementInterfaces.InstalledExtension {
  return { version } as ExtensionManagementInterfaces.InstalledExtension;
}

const validated = GalleryInterfaces.ExtensionVersionFlags.Validated;

describe('marketplaceVersionStatus', () => {
  test('is pending when the extension has no published versions', () => {
    expect(marketplaceVersionStatus(undefined, '1.2.3').status).toBe('pending');
    expect(
      marketplaceVersionStatus(publishedExtension([]), '1.2.3').status,
    ).toBe('pending');
  });

  test('is pending when the expected version has not shown up yet', () => {
    const result = marketplaceVersionStatus(
      publishedExtension([{ version: '1.2.2', flags: validated }]),
      '1.2.3',
    );

    expect(result.status).toBe('pending');
    expect(result.detail).toContain('latest is 1.2.2');
  });

  test('is pending while the expected version is still being validated', () => {
    const result = marketplaceVersionStatus(
      publishedExtension([
        {
          version: '1.2.3',
          flags: GalleryInterfaces.ExtensionVersionFlags.None,
        },
      ]),
      '1.2.3',
    );

    expect(result.status).toBe('pending');
    expect(result.detail).toContain('still being validated');
  });

  test('fails when the Marketplace rejected the expected version', () => {
    const result = marketplaceVersionStatus(
      publishedExtension([
        { version: '1.2.3', validationResultMessage: 'malware detected' },
      ]),
      '1.2.3',
    );

    expect(result.status).toBe('failed');
    expect(result.detail).toContain('malware detected');
  });

  test('is ready once the expected version is validated', () => {
    const result = marketplaceVersionStatus(
      publishedExtension([
        { version: '1.2.3', flags: validated },
        { version: '1.2.2', flags: validated },
      ]),
      '1.2.3',
    );

    expect(result.status).toBe('ready');
  });

  test('ignores the validation state of other versions', () => {
    const result = marketplaceVersionStatus(
      publishedExtension([
        {
          version: '1.2.3',
          flags: GalleryInterfaces.ExtensionVersionFlags.None,
        },
        { version: '1.2.2', flags: validated },
      ]),
      '1.2.3',
    );

    expect(result.status).toBe('pending');
  });
});

describe('installedVersionStatus', () => {
  test('is pending when nothing is installed in the org', () => {
    expect(installedVersionStatus(undefined, '1.2.3').status).toBe('pending');
  });

  test('is pending while the org still has the previous version', () => {
    const result = installedVersionStatus(installedExtension('1.2.2'), '1.2.3');

    expect(result.status).toBe('pending');
    expect(result.detail).toContain('still has version 1.2.2');
  });

  test('is ready once the org has the expected version', () => {
    expect(
      installedVersionStatus(installedExtension('1.2.3'), '1.2.3').status,
    ).toBe('ready');
  });
});
