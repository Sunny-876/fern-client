import { describe, it, expect } from 'vitest';
import { FernError, FernErrorCode } from '../launcher/src/core/errors';

describe('FernError & Error Handling', () => {
  it('creates structured FernError with code and actionable hint', () => {
    const error = new FernError(
      FernErrorCode.JAVA_INCOMPATIBLE,
      'Java 8 is incompatible with Minecraft 1.21.',
      'Install Java 21 from Settings.'
    );

    expect(error.name).toBe('FernError');
    expect(error.code).toBe(FernErrorCode.JAVA_INCOMPATIBLE);
    expect(error.message).toBe('Java 8 is incompatible with Minecraft 1.21.');
    expect(error.actionableHint).toBe('Install Java 21 from Settings.');

    const serialized = error.toJSON();
    expect(serialized.code).toBe(FernErrorCode.JAVA_INCOMPATIBLE);
    expect(serialized.actionableHint).toBe('Install Java 21 from Settings.');
  });

  it('normalizes generic errors into FernError instances', () => {
    const generic = new Error('Disk full');
    const normalized = FernError.from(generic, FernErrorCode.FILE_SYSTEM_ERROR);

    expect(normalized).toBeInstanceOf(FernError);
    expect(normalized.code).toBe(FernErrorCode.FILE_SYSTEM_ERROR);
    expect(normalized.message).toBe('Disk full');
  });

  it('preserves existing FernError instances when normalizing', () => {
    const original = new FernError(FernErrorCode.ACCOUNT_NOT_FOUND, 'No profile');
    const normalized = FernError.from(original);

    expect(normalized).toBe(original);
    expect(normalized.code).toBe(FernErrorCode.ACCOUNT_NOT_FOUND);
  });
});
