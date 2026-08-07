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

import { PollOptions, pollUntilReady, ProbeResult } from '../lib/poll';

const ready: ProbeResult = { status: 'ready', detail: 'all good' };
const pending: ProbeResult = { status: 'pending', detail: 'not yet' };
const failed: ProbeResult = { status: 'failed', detail: 'rejected' };

/**
 * Options with a clock that only moves when the poller sleeps, so tests can
 * exercise the timeout without waiting for real time to pass.
 */
function testOptions(overrides: Partial<PollOptions> = {}): PollOptions {
  let clock = 0;
  return {
    intervalMs: 20000,
    timeoutMs: 300000,
    now: () => clock,
    sleep: async (milliseconds) => {
      clock += milliseconds;
    },
    log: () => undefined,
    ...overrides,
  };
}

test('returns as soon as the probe is ready', async () => {
  const probe = jest.fn().mockResolvedValue(ready);

  await pollUntilReady('check', probe, testOptions());

  expect(probe).toHaveBeenCalledTimes(1);
});

test('keeps polling while the probe is pending', async () => {
  const probe = jest
    .fn()
    .mockResolvedValueOnce(pending)
    .mockResolvedValueOnce(pending)
    .mockResolvedValue(ready);
  const sleep = jest.fn().mockResolvedValue(undefined);

  await pollUntilReady('check', probe, testOptions({ sleep }));

  expect(probe).toHaveBeenCalledTimes(3);
  expect(sleep).toHaveBeenCalledTimes(2);
  expect(sleep).toHaveBeenCalledWith(20000);
});

test('stops immediately when the probe reports a failure', async () => {
  const probe = jest.fn().mockResolvedValue(failed);
  const sleep = jest.fn().mockResolvedValue(undefined);

  await expect(
    pollUntilReady('check', probe, testOptions({ sleep })),
  ).rejects.toThrow('check failed: rejected');

  expect(probe).toHaveBeenCalledTimes(1);
  expect(sleep).not.toHaveBeenCalled();
});

test('gives up once the timeout has elapsed', async () => {
  const probe = jest.fn().mockResolvedValue(pending);

  await expect(
    pollUntilReady('check', probe, testOptions({ timeoutMs: 60000 })),
  ).rejects.toThrow('check timed out after 60000ms. Last status: not yet');

  // one probe per 20s interval, plus the final probe that trips the deadline
  expect(probe).toHaveBeenCalledTimes(4);
});
