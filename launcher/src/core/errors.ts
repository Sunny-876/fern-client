export enum FernErrorCode {
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  FILE_SYSTEM_ERROR = 'FILE_SYSTEM_ERROR',
  NETWORK_ERROR = 'NETWORK_ERROR',
  DOWNLOAD_FAILED = 'DOWNLOAD_FAILED',
  DOWNLOAD_CHECKSUM_MISMATCH = 'DOWNLOAD_CHECKSUM_MISMATCH',
  JAVA_NOT_FOUND = 'JAVA_NOT_FOUND',
  JAVA_INCOMPATIBLE = 'JAVA_INCOMPATIBLE',
  ACCOUNT_NOT_FOUND = 'ACCOUNT_NOT_FOUND',
  ACCOUNT_AUTH_FAILED = 'ACCOUNT_AUTH_FAILED',
  ACCOUNT_INVALID_USERNAME = 'ACCOUNT_INVALID_USERNAME',
  INSTALLATION_NOT_FOUND = 'INSTALLATION_NOT_FOUND',
  PROFILE_NOT_FOUND = 'PROFILE_NOT_FOUND',
  LAUNCH_FAILED = 'LAUNCH_FAILED',
  SETTINGS_MIGRATION_ERROR = 'SETTINGS_MIGRATION_ERROR',
  RESOURCE_NOT_FOUND = 'RESOURCE_NOT_FOUND',
  SECURITY_VIOLATION = 'SECURITY_VIOLATION',
}

export interface FernErrorSerialized {
  name: string;
  code: FernErrorCode;
  message: string;
  actionableHint?: string;
  details?: unknown;
}

export class FernError extends Error {
  public readonly code: FernErrorCode;
  public readonly actionableHint?: string;
  public readonly details?: unknown;

  constructor(
    code: FernErrorCode,
    message: string,
    actionableHint?: string,
    details?: unknown
  ) {
    super(message);
    this.name = 'FernError';
    this.code = code;
    this.actionableHint = actionableHint;
    this.details = details;
    Object.setPrototypeOf(this, FernError.prototype);
  }

  public toJSON(): FernErrorSerialized {
    return {
      name: this.name,
      code: this.code,
      message: this.message,
      actionableHint: this.actionableHint,
      details: this.details,
    };
  }

  public static from(err: unknown, defaultCode: FernErrorCode = FernErrorCode.UNKNOWN_ERROR): FernError {
    if (err instanceof FernError) {
      return err;
    }
    if (err instanceof Error) {
      return new FernError(defaultCode, err.message, undefined, { originalStack: err.stack });
    }
    return new FernError(defaultCode, String(err));
  }
}
