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

import { ProbeResult } from '../poll';

/**
 * Mirrors how tfx-cli itself decides whether a published version is usable:
 * a `validationResultMessage` means the Marketplace rejected the version, and
 * otherwise the `Validated` flag separates a usable version from one that is
 * still being scanned.
 */
export function marketplaceVersionStatus(
  extensionDetails: GalleryInterfaces.PublishedExtension | undefined,
  expectedVersion: string,
): ProbeResult {
  const publishedVersions = extensionDetails ? extensionDetails.versions : [];

  if (!publishedVersions || publishedVersions.length === 0) {
    return {
      status: 'pending',
      detail: 'no published versions found in the Marketplace yet',
    };
  }

  const publishedVersion = publishedVersions.find(
    (candidate) => candidate.version === expectedVersion,
  );

  if (!publishedVersion) {
    const latestVersion = publishedVersions[0].version;
    return {
      status: 'pending',
      detail: `version ${expectedVersion} is not in the Marketplace yet (latest is ${latestVersion})`,
    };
  }

  if (publishedVersion.validationResultMessage) {
    return {
      status: 'failed',
      detail: `the Marketplace rejected version ${expectedVersion}: ${publishedVersion.validationResultMessage}`,
    };
  }

  const flags =
    publishedVersion.flags || GalleryInterfaces.ExtensionVersionFlags.None;

  if ((flags & GalleryInterfaces.ExtensionVersionFlags.Validated) === 0) {
    return {
      status: 'pending',
      detail: `version ${expectedVersion} is uploaded but still being validated`,
    };
  }

  return {
    status: 'ready',
    detail: `version ${expectedVersion} passed Marketplace validation`,
  };
}

export function installedVersionStatus(
  installedExtension:
    | ExtensionManagementInterfaces.InstalledExtension
    | undefined,
  expectedVersion: string,
): ProbeResult {
  if (!installedExtension) {
    return {
      status: 'pending',
      detail: 'the extension is not installed in the org yet',
    };
  }

  if (installedExtension.version === expectedVersion) {
    return {
      status: 'ready',
      detail: `the org has version ${expectedVersion} installed`,
    };
  }

  return {
    status: 'pending',
    detail: `the org still has version ${installedExtension.version} installed, waiting for ${expectedVersion}`,
  };
}
