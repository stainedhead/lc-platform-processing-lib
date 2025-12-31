/**
 * Domain Unit Test: AppId Value Object
 *
 * Tests for AppId value object (format validation, immutability)
 * Pure unit test with NO external dependencies
 */

import { describe, test, expect } from 'bun:test';
import { AppId } from '../../../src/domain/value-objects/AppId';

describe('AppId Value Object', () => {
  describe('generate()', () => {
    test('should generate a new UUID-format AppId', () => {
      const result = AppId.generate();
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value).toBeDefined();
        expect(result.value.value).toMatch(
          /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
        );
      }
    });

    test('should generate unique AppIds', () => {
      const result1 = AppId.generate();
      const result2 = AppId.generate();
      expect(result1.success && result2.success).toBe(true);
      if (result1.success && result2.success) {
        expect(result1.value.value).not.toBe(result2.value.value);
      }
    });
  });

  describe('fromString()', () => {
    test('should create AppId from valid UUID string', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const result = AppId.fromString(uuid);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.value).toBe(uuid);
      }
    });

    test('should reject empty string', () => {
      const result = AppId.fromString('');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    test('should reject invalid UUID format', () => {
      const result = AppId.fromString('not-a-uuid');

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBeDefined();
      }
    });

    test('should reject malformed UUID', () => {
      const result = AppId.fromString('123e4567-e89b-12d3-a456-42661417400'); // Missing digit

      expect(result.success).toBe(false);
    });
  });

  describe('equality', () => {
    test('should consider two AppIds with same value as equal', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const result1 = AppId.fromString(uuid);
      const result2 = AppId.fromString(uuid);

      expect(result1.success && result2.success).toBe(true);
      if (result1.success && result2.success) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });

    test('should consider two AppIds with different values as not equal', () => {
      const uuid1 = '123e4567-e89b-12d3-a456-426614174000';
      const uuid2 = '223e4567-e89b-12d3-a456-426614174001';
      const result1 = AppId.fromString(uuid1);
      const result2 = AppId.fromString(uuid2);

      expect(result1.success && result2.success).toBe(true);
      if (result1.success && result2.success) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });
  });

  describe('immutability', () => {
    test('value is readonly (TypeScript compile-time guarantee)', () => {
      const result = AppId.generate();
      expect(result.success).toBe(true);
      if (result.success) {
        // TypeScript prevents modification at compile time
        // Runtime immutability is enforced through readonly keyword
        expect(result.value.value).toBeDefined();
      }
    });
  });

  describe('toString()', () => {
    test('should return the UUID string', () => {
      const uuid = '123e4567-e89b-12d3-a456-426614174000';
      const result = AppId.fromString(uuid);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.toString()).toBe(uuid);
      }
    });
  });
});
