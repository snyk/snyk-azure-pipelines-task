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

import { asyncSleep } from './sleep';

export type ProbeStatus = 'ready' | 'pending' | 'failed';

export interface ProbeResult {
  status: ProbeStatus;
  detail: string;
}

export interface PollOptions {
  intervalMs: number;
  timeoutMs: number;
  sleep?: (milliseconds: number) => Promise<void>;
  now?: () => number;
  log?: (message: string) => void;
}

/**
 * Repeatedly runs `probe` until it reports `ready`. A `failed` probe stops
 * immediately rather than burning the whole timeout on something that will
 * never become ready.
 */
export async function pollUntilReady(
  description: string,
  probe: () => Promise<ProbeResult>,
  options: PollOptions,
): Promise<void> {
  const sleep = options.sleep || asyncSleep;
  const now = options.now || Date.now;
  const log = options.log || console.log;

  const deadline = now() + options.timeoutMs;

  for (;;) {
    const result = await probe();

    if (result.status === 'ready') {
      log(`${description}: ${result.detail}`);
      return;
    }

    if (result.status === 'failed') {
      throw new Error(`${description} failed: ${result.detail}`);
    }

    if (now() >= deadline) {
      throw new Error(
        `${description} timed out after ${options.timeoutMs}ms. Last status: ${result.detail}`,
      );
    }

    log(
      `${description}: ${result.detail}. Checking again in ${options.intervalMs}ms...`,
    );
    await sleep(options.intervalMs);
  }
}
