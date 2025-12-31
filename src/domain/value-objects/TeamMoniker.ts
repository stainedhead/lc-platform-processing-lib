/**
 * TeamMoniker Value Object
 *
 * Composite identifier combining team and application moniker
 * Immutable value object with validation
 */

import { Result, ValidationError } from '../types';

/**
 * TeamMoniker Value Object
 * Represents team + moniker combination (unique within account)
 */
export class TeamMoniker {
  /** Pattern for valid team and moniker (lowercase alphanumeric with hyphens, 2+ chars) */
  private static readonly VALID_PATTERN = /^[a-z0-9][a-z0-9-]*[a-z0-9]$/;

  /** Private constructor - use factory methods */
  private constructor(
    public readonly team: string,
    public readonly moniker: string
  ) {}

  /**
   * Create TeamMoniker from team and moniker strings
   * Validates format and constraints
   */
  public static create(team: string, moniker: string): Result<TeamMoniker, ValidationError> {
    // Validate team
    if (!team || team.length === 0) {
      return {
        success: false,
        error: ValidationError.MissingRequired,
      };
    }

    if (team.length < 2) {
      return {
        success: false,
        error: ValidationError.InvalidFormat,
      };
    }

    if (!TeamMoniker.VALID_PATTERN.test(team)) {
      return {
        success: false,
        error: ValidationError.InvalidFormat,
      };
    }

    // Validate moniker
    if (!moniker || moniker.length === 0) {
      return {
        success: false,
        error: ValidationError.MissingRequired,
      };
    }

    if (moniker.length < 2) {
      return {
        success: false,
        error: ValidationError.InvalidFormat,
      };
    }

    if (!TeamMoniker.VALID_PATTERN.test(moniker)) {
      return {
        success: false,
        error: ValidationError.InvalidFormat,
      };
    }

    return {
      success: true,
      value: new TeamMoniker(team, moniker),
    };
  }

  /**
   * Check equality with another TeamMoniker
   */
  public equals(other: TeamMoniker): boolean {
    return this.team === other.team && this.moniker === other.moniker;
  }

  /**
   * Convert to string (team/moniker format)
   */
  public toString(): string {
    return `${this.team}/${this.moniker}`;
  }
}
