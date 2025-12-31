/**
 * StoragePath Value Object
 *
 * Generates and validates storage paths for application and version configurations
 * Immutable value object
 */

import { Result, ValidationError } from '../types';

/**
 * StoragePath Value Object
 * Encapsulates logic for generating consistent storage paths
 */
export class StoragePath {
  /** Pattern for safe path characters (alphanumeric + hyphens + underscores) */
  private static readonly SAFE_PATH_PATTERN = /^[a-zA-Z0-9_-]+$/;

  /** Private constructor - use factory methods */
  private constructor(
    public readonly account: string,
    public readonly team: string,
    public readonly moniker: string,
    public readonly version?: string
  ) {}

  /**
   * Create storage path for application-level configuration
   */
  public static forApplication(
    account: string,
    team: string,
    moniker: string
  ): Result<StoragePath, ValidationError> {
    const validationResult = StoragePath.validateParts(account, team, moniker);
    if (!validationResult.success) {
      return validationResult;
    }

    return {
      success: true,
      value: new StoragePath(account, team, moniker),
    };
  }

  /**
   * Create storage path for version-specific configuration
   */
  public static forVersion(
    account: string,
    team: string,
    moniker: string,
    version: string
  ): Result<StoragePath, ValidationError> {
    const validationResult = StoragePath.validateParts(account, team, moniker);
    if (!validationResult.success) {
      return validationResult;
    }

    if (!version || version.length === 0) {
      return {
        success: false,
        error: ValidationError.MissingRequired,
      };
    }

    return {
      success: true,
      value: new StoragePath(account, team, moniker, version),
    };
  }

  /**
   * Validate account, team, and moniker parts
   */
  private static validateParts(
    account: string,
    team: string,
    moniker: string
  ): Result<void, ValidationError> {
    if (!account || account.length === 0) {
      return { success: false, error: ValidationError.MissingRequired };
    }

    if (!team || team.length === 0) {
      return { success: false, error: ValidationError.MissingRequired };
    }

    if (!moniker || moniker.length === 0) {
      return { success: false, error: ValidationError.MissingRequired };
    }

    if (!StoragePath.SAFE_PATH_PATTERN.test(account)) {
      return { success: false, error: ValidationError.InvalidFormat };
    }

    if (!StoragePath.SAFE_PATH_PATTERN.test(team)) {
      return { success: false, error: ValidationError.InvalidFormat };
    }

    if (!StoragePath.SAFE_PATH_PATTERN.test(moniker)) {
      return { success: false, error: ValidationError.InvalidFormat };
    }

    return { success: true, value: undefined };
  }

  /**
   * Get bucket name: lcp-{account}-{team}-{moniker}/
   */
  public get bucketName(): string {
    return `lcp-${this.account}-${this.team}-${this.moniker}/`;
  }

  /**
   * Get application config path
   */
  public get appConfigPath(): string {
    return `${this.bucketName}app.config`;
  }

  /**
   * Get version directory path (requires version)
   */
  public get versionPath(): string {
    if (!this.version) {
      throw new Error('Version not set - use forVersion() to create version-specific path');
    }
    return `${this.bucketName}versions/${this.version}/`;
  }

  /**
   * Get version config file path (requires version)
   */
  public get versionConfigPath(): string {
    return `${this.versionPath}appversion.config`;
  }

  /**
   * Get artifact path (requires version)
   */
  public get artifactPath(): string {
    return `${this.versionPath}artifact`;
  }
}
