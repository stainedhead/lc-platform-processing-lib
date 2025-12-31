/**
 * Domain Unit Test: TeamMoniker Value Object
 *
 * Tests for TeamMoniker value object (team+moniker composition, validation)
 * Pure unit test with NO external dependencies
 */

import { describe, test, expect } from 'bun:test';
import { TeamMoniker } from '../../../src/domain/value-objects/TeamMoniker';

describe('TeamMoniker Value Object', () => {
  describe('create()', () => {
    test('should create valid TeamMoniker from team and moniker', () => {
      const result = TeamMoniker.create('alpha', 'api-service');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.team).toBe('alpha');
        expect(result.value.moniker).toBe('api-service');
      }
    });

    test('should accept lowercase alphanumeric with hyphens', () => {
      const result = TeamMoniker.create('team-123', 'app-name-456');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.team).toBe('team-123');
        expect(result.value.moniker).toBe('app-name-456');
      }
    });

    test('should reject empty team', () => {
      const result = TeamMoniker.create('', 'api-service');

      expect(result.success).toBe(false);
    });

    test('should reject empty moniker', () => {
      const result = TeamMoniker.create('alpha', '');

      expect(result.success).toBe(false);
    });

    test('should reject team with uppercase letters', () => {
      const result = TeamMoniker.create('Alpha', 'api-service');

      expect(result.success).toBe(false);
    });

    test('should reject moniker with uppercase letters', () => {
      const result = TeamMoniker.create('alpha', 'API-Service');

      expect(result.success).toBe(false);
    });

    test('should reject team with special characters', () => {
      const result = TeamMoniker.create('alpha_team', 'api-service');

      expect(result.success).toBe(false);
    });

    test('should reject moniker with spaces', () => {
      const result = TeamMoniker.create('alpha', 'api service');

      expect(result.success).toBe(false);
    });

    test('should reject team starting with hyphen', () => {
      const result = TeamMoniker.create('-alpha', 'api-service');

      expect(result.success).toBe(false);
    });

    test('should reject moniker ending with hyphen', () => {
      const result = TeamMoniker.create('alpha', 'api-service-');

      expect(result.success).toBe(false);
    });

    test('should reject single character team', () => {
      const result = TeamMoniker.create('a', 'api-service');

      expect(result.success).toBe(false);
    });
  });

  describe('equality', () => {
    test('should consider two TeamMonikers with same team and moniker as equal', () => {
      const result1 = TeamMoniker.create('alpha', 'api-service');
      const result2 = TeamMoniker.create('alpha', 'api-service');

      expect(result1.success && result2.success).toBe(true);
      if (result1.success && result2.success) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });

    test('should consider TeamMonikers with different teams as not equal', () => {
      const result1 = TeamMoniker.create('alpha', 'api-service');
      const result2 = TeamMoniker.create('beta', 'api-service');

      expect(result1.success && result2.success).toBe(true);
      if (result1.success && result2.success) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });

    test('should consider TeamMonikers with different monikers as not equal', () => {
      const result1 = TeamMoniker.create('alpha', 'api-service');
      const result2 = TeamMoniker.create('alpha', 'web-service');

      expect(result1.success && result2.success).toBe(true);
      if (result1.success && result2.success) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });
  });

  describe('toString()', () => {
    test('should return team/moniker format', () => {
      const result = TeamMoniker.create('alpha', 'api-service');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.toString()).toBe('alpha/api-service');
      }
    });
  });

  describe('immutability', () => {
    test('team and moniker are readonly (TypeScript compile-time guarantee)', () => {
      const result = TeamMoniker.create('alpha', 'api-service');

      expect(result.success).toBe(true);
      if (result.success) {
        // TypeScript prevents modification at compile time
        expect(result.value.team).toBe('alpha');
        expect(result.value.moniker).toBe('api-service');
      }
    });
  });
});
