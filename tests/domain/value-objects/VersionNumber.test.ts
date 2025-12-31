/**
 * Domain Unit Tests: VersionNumber Value Object
 * Tests semantic versioning validation (T040)
 */

import { describe, test, expect } from 'bun:test';
import { VersionNumber } from '../../../src/domain/value-objects/VersionNumber';
import { ValidationError } from '../../../src/domain/types';

describe('VersionNumber Value Object', () => {
  describe('parse()', () => {
    test('should parse valid semantic version (major.minor.patch)', () => {
      const result = VersionNumber.parse('1.2.3');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.major).toBe(1);
        expect(result.value.minor).toBe(2);
        expect(result.value.patch).toBe(3);
        expect(result.value.prerelease).toBeUndefined();
      }
    });

    test('should parse version with prerelease tag', () => {
      const result = VersionNumber.parse('1.0.0-alpha.1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.major).toBe(1);
        expect(result.value.minor).toBe(0);
        expect(result.value.patch).toBe(0);
        expect(result.value.prerelease).toBe('alpha.1');
      }
    });

    test('should parse version with beta prerelease', () => {
      const result = VersionNumber.parse('2.1.0-beta');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.prerelease).toBe('beta');
      }
    });

    test('should reject invalid format (missing patch)', () => {
      const result = VersionNumber.parse('1.2');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ValidationError.InvalidFormat);
      }
    });

    test('should reject invalid format (non-numeric)', () => {
      const result = VersionNumber.parse('1.x.3');
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ValidationError.InvalidFormat);
      }
    });

    test('should reject negative version numbers', () => {
      const result = VersionNumber.parse('-1.0.0');
      expect(result.success).toBe(false);
    });

    test('should reject empty string', () => {
      const result = VersionNumber.parse('');
      expect(result.success).toBe(false);
    });
  });

  describe('toString()', () => {
    test('should format version without prerelease', () => {
      const result = VersionNumber.parse('1.2.3');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.toString()).toBe('1.2.3');
      }
    });

    test('should format version with prerelease', () => {
      const result = VersionNumber.parse('1.0.0-alpha.1');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.toString()).toBe('1.0.0-alpha.1');
      }
    });
  });

  describe('compareTo()', () => {
    test('should compare major versions', () => {
      const v1 = VersionNumber.parse('2.0.0');
      const v2 = VersionNumber.parse('1.9.9');
      expect(v1.success && v2.success).toBe(true);
      if (v1.success && v2.success) {
        expect(v1.value.compareTo(v2.value)).toBeGreaterThan(0);
        expect(v2.value.compareTo(v1.value)).toBeLessThan(0);
      }
    });

    test('should compare minor versions when major is equal', () => {
      const v1 = VersionNumber.parse('1.5.0');
      const v2 = VersionNumber.parse('1.3.9');
      expect(v1.success && v2.success).toBe(true);
      if (v1.success && v2.success) {
        expect(v1.value.compareTo(v2.value)).toBeGreaterThan(0);
      }
    });

    test('should compare patch versions when major and minor are equal', () => {
      const v1 = VersionNumber.parse('1.0.5');
      const v2 = VersionNumber.parse('1.0.3');
      expect(v1.success && v2.success).toBe(true);
      if (v1.success && v2.success) {
        expect(v1.value.compareTo(v2.value)).toBeGreaterThan(0);
      }
    });

    test('should return 0 for equal versions', () => {
      const v1 = VersionNumber.parse('1.2.3');
      const v2 = VersionNumber.parse('1.2.3');
      expect(v1.success && v2.success).toBe(true);
      if (v1.success && v2.success) {
        expect(v1.value.compareTo(v2.value)).toBe(0);
      }
    });

    test('should treat prerelease as lower than release', () => {
      const v1 = VersionNumber.parse('1.0.0');
      const v2 = VersionNumber.parse('1.0.0-alpha');
      expect(v1.success && v2.success).toBe(true);
      if (v1.success && v2.success) {
        expect(v1.value.compareTo(v2.value)).toBeGreaterThan(0);
        expect(v2.value.compareTo(v1.value)).toBeLessThan(0);
      }
    });
  });

  describe('isGreaterThan()', () => {
    test('should return true when version is greater', () => {
      const v1 = VersionNumber.parse('2.0.0');
      const v2 = VersionNumber.parse('1.9.9');
      expect(v1.success && v2.success).toBe(true);
      if (v1.success && v2.success) {
        expect(v1.value.isGreaterThan(v2.value)).toBe(true);
        expect(v2.value.isGreaterThan(v1.value)).toBe(false);
      }
    });

    test('should return false for equal versions', () => {
      const v1 = VersionNumber.parse('1.0.0');
      const v2 = VersionNumber.parse('1.0.0');
      expect(v1.success && v2.success).toBe(true);
      if (v1.success && v2.success) {
        expect(v1.value.isGreaterThan(v2.value)).toBe(false);
      }
    });
  });

  describe('isCompatibleWith()', () => {
    test('should return true for same major version (caret compatibility)', () => {
      const v1 = VersionNumber.parse('1.5.2');
      const v2 = VersionNumber.parse('1.0.0');
      expect(v1.success && v2.success).toBe(true);
      if (v1.success && v2.success) {
        expect(v1.value.isCompatibleWith(v2.value)).toBe(true);
      }
    });

    test('should return false for different major version', () => {
      const v1 = VersionNumber.parse('2.0.0');
      const v2 = VersionNumber.parse('1.9.9');
      expect(v1.success && v2.success).toBe(true);
      if (v1.success && v2.success) {
        expect(v1.value.isCompatibleWith(v2.value)).toBe(false);
      }
    });

    test('should handle 0.x.x as special case (patch-level compatibility)', () => {
      const v1 = VersionNumber.parse('0.1.5');
      const v2 = VersionNumber.parse('0.1.0');
      expect(v1.success && v2.success).toBe(true);
      if (v1.success && v2.success) {
        expect(v1.value.isCompatibleWith(v2.value)).toBe(true);
      }
    });

    test('should return false for 0.x.x with different minor', () => {
      const v1 = VersionNumber.parse('0.2.0');
      const v2 = VersionNumber.parse('0.1.9');
      expect(v1.success && v2.success).toBe(true);
      if (v1.success && v2.success) {
        expect(v1.value.isCompatibleWith(v2.value)).toBe(false);
      }
    });
  });

  describe('immutability', () => {
    test('properties are readonly (TypeScript compile-time guarantee)', () => {
      const result = VersionNumber.parse('1.2.3');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.major).toBe(1);
        expect(result.value.minor).toBe(2);
        expect(result.value.patch).toBe(3);
      }
    });
  });
});
