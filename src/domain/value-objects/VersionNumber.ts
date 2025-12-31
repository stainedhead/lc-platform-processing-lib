/**
 * VersionNumber Value Object
 * Semantic version identifier (major.minor.patch[-prerelease])
 */

import { Result, ValidationError } from '../types';

export class VersionNumber {
  private static readonly VERSION_PATTERN =
    /^(\d+)\.(\d+)\.(\d+)(?:-([0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*))?$/;

  private constructor(
    public readonly major: number,
    public readonly minor: number,
    public readonly patch: number,
    public readonly prerelease?: string
  ) {}

  static parse(version: string): Result<VersionNumber, ValidationError> {
    const match = version.match(VersionNumber.VERSION_PATTERN);
    if (!match) {
      return { success: false, error: ValidationError.InvalidFormat };
    }

    const [, major, minor, patch, prerelease] = match;
    return {
      success: true,
      value: new VersionNumber(
        parseInt(major, 10),
        parseInt(minor, 10),
        parseInt(patch, 10),
        prerelease
      ),
    };
  }

  static create(
    major: number,
    minor: number,
    patch: number,
    prerelease?: string
  ): Result<VersionNumber, ValidationError> {
    if (major < 0 || minor < 0 || patch < 0) {
      return { success: false, error: ValidationError.InvalidValue };
    }

    if (prerelease && !/^[0-9A-Za-z-]+(\.[0-9A-Za-z-]+)*$/.test(prerelease)) {
      return { success: false, error: ValidationError.InvalidFormat };
    }

    return { success: true, value: new VersionNumber(major, minor, patch, prerelease) };
  }

  toString(): string {
    let version = `${this.major}.${this.minor}.${this.patch}`;
    if (this.prerelease) {
      version += `-${this.prerelease}`;
    }
    return version;
  }

  compareTo(other: VersionNumber): number {
    if (this.major !== other.major) return this.major - other.major;
    if (this.minor !== other.minor) return this.minor - other.minor;
    if (this.patch !== other.patch) return this.patch - other.patch;

    // Handle prerelease comparison
    if (!this.prerelease && !other.prerelease) return 0;
    if (!this.prerelease) return 1; // Release > prerelease
    if (!other.prerelease) return -1;
    return this.prerelease.localeCompare(other.prerelease);
  }

  isGreaterThan(other: VersionNumber): boolean {
    return this.compareTo(other) > 0;
  }

  isCompatibleWith(other: VersionNumber): boolean {
    // For 0.x.x versions, both major and minor must match (unstable API)
    if (this.major === 0 || other.major === 0) {
      return this.major === other.major && this.minor === other.minor;
    }
    // For 1.x.x+, only major needs to match (caret compatibility)
    return this.major === other.major;
  }
}
