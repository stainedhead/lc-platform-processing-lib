/**
 * AppId Value Object
 *
 * Unique identifier for applications (UUID format)
 * Immutable value object with validation
 */

import { Result, ValidationError } from '../types';
import { randomUUID } from 'crypto';

/**
 * Application ID Value Object
 * Wraps a UUID string with validation
 */
export class AppId {
  /** UUID validation pattern */
  private static readonly UUID_PATTERN =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

  /** Private constructor - use factory methods */
  private constructor(public readonly value: string) {}

  /**
   * Generate a new AppId with random UUID
   */
  public static generate(): Result<AppId, ValidationError> {
    return {
      success: true,
      value: new AppId(randomUUID()),
    };
  }

  /**
   * Create AppId from existing UUID string
   * Validates format
   */
  public static fromString(value: string): Result<AppId, ValidationError> {
    if (!value || value.length === 0) {
      return {
        success: false,
        error: ValidationError.MissingRequired,
      };
    }

    if (!AppId.UUID_PATTERN.test(value)) {
      return {
        success: false,
        error: ValidationError.InvalidFormat,
      };
    }

    return {
      success: true,
      value: new AppId(value),
    };
  }

  /**
   * Check equality with another AppId
   */
  public equals(other: AppId): boolean {
    return this.value === other.value;
  }

  /**
   * Convert to string (returns UUID)
   */
  public toString(): string {
    return this.value;
  }
}
