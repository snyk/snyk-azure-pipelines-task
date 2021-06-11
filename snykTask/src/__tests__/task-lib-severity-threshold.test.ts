import { isNotValidThreshold, Severity } from '../task-lib';

describe('isNotValidThreshold', () => {
  const validSeverityThresholds = [
    Severity.CRITICAL,
    Severity.HIGH,
    Severity.MEDIUM,
    Severity.LOW,
  ];
  test('returns true if invalid severity threshold', () => {
    const isInvalid = isNotValidThreshold('hey');
    expect(isInvalid).toBe(true);
  });

  describe.each(validSeverityThresholds)('isNotValidThreshold(%s)', (level) => {
    test(`returns false for ${level}`, () => {
      expect(isNotValidThreshold(level)).toBe(false);
    });
  });
});
