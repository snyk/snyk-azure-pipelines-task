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

import * as GalleryInterfaces from 'azure-devops-node-api/interfaces/GalleryInterfaces';

import { getExtensionInfo } from './lib/azure-devops';
import { asyncSleep } from './lib/sleep';

const TIMEOUT_MS = parseInt(process.env.VALIDATION_TIMEOUT_MS || '600000', 10);
const POLL_MS = parseInt(process.env.VALIDATION_POLL_MS || '15000', 10);

function getHttpStatus(err: unknown): number | undefined {
  if (err && typeof err === 'object' && 'statusCode' in err) {
    const code = (err as { statusCode?: number }).statusCode;
    if (typeof code === 'number' && Number.isFinite(code)) {
      return code;
    }
  }
  return undefined;
}

const RETRYABLE_STATUS_CODES = new Set([404, 408, 429]);

function isRetryableError(statusCode: number): boolean {
  return statusCode >= 500 || RETRYABLE_STATUS_CODES.has(statusCode);
}

type ValidationResult =
  | { status: 'validated' }
  | { status: 'pending' }
  | { status: 'error'; message: string };

async function checkValidation(
  azToken: string,
  publisher: string,
  extensionId: string,
  version: string,
): Promise<ValidationResult> {
  const extensionDetails = await getExtensionInfo(
    azToken,
    publisher,
    extensionId,
  );

  if (!extensionDetails || !extensionDetails.versions) {
    return { status: 'pending' };
  }

  const matchingVersion = (
    extensionDetails.versions as GalleryInterfaces.ExtensionVersion[]
  ).find((v) => v.version === version);

  if (!matchingVersion) {
    return {
      status: 'pending',
    };
  }

  if (
    matchingVersion.flags !== undefined &&
    (matchingVersion.flags &
      GalleryInterfaces.ExtensionVersionFlags.Validated) !==
      0
  ) {
    return { status: 'validated' };
  }

  if (matchingVersion.validationResultMessage) {
    return {
      status: 'error',
      message: matchingVersion.validationResultMessage,
    };
  }

  return { status: 'pending' };
}

async function main() {
  const publisher = process.argv[2];
  const extensionId = process.argv[3];
  const version = process.argv[4];
  const azToken = process.env.AZURE_DEVOPS_EXT_PAT || '';

  if (!publisher || !extensionId || !version) {
    console.error(
      'Usage: wait-extension-valid <publisher> <extensionId> <version>',
    );
    process.exit(1);
  }

  if (!azToken) {
    console.error('AZURE_DEVOPS_EXT_PAT environment variable is not set.');
    process.exit(1);
  }

  console.log(
    `Waiting for Marketplace validation of ${publisher}.${extensionId}@${version} (timeout: ${
      TIMEOUT_MS / 1000
    }s, poll: ${POLL_MS / 1000}s)...`,
  );

  const deadline = Date.now() + TIMEOUT_MS;

  while (Date.now() < deadline) {
    try {
      const result = await checkValidation(
        azToken,
        publisher,
        extensionId,
        version,
      );

      if (result.status === 'validated') {
        console.log('Extension validated successfully.');
        process.exit(0);
      }

      if (result.status === 'error') {
        console.error(`Marketplace validation failed: ${result.message}`);
        process.exit(1);
      }

      const elapsed = Math.round((TIMEOUT_MS - (deadline - Date.now())) / 1000);
      console.log(
        `  Validation pending... (${elapsed}s / ${TIMEOUT_MS / 1000}s)`,
      );
    } catch (err) {
      const status = getHttpStatus(err);
      if (status !== undefined && !isRetryableError(status)) {
        console.error(
          `Gallery API error (HTTP ${status}); not retrying: ${err}`,
        );
        process.exit(1);
      }
      const label =
        status !== undefined ? `HTTP ${status} (transient)` : 'unknown error';
      console.warn(`  ${label}: ${err}; retrying...`);
    }

    await asyncSleep(POLL_MS);
  }

  console.error(
    `Timed out after ${TIMEOUT_MS / 1000}s waiting for validation.`,
  );
  process.exit(1);
}

if (require.main === module) {
  main();
}
