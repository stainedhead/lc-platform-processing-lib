/**
 * Domain Unit Tests: DeploymentStatus Value Object
 * Tests deployment state machine (T078)
 */

import { describe, test, expect } from 'bun:test';
import { DeploymentStatus } from '../../../src/domain/value-objects/DeploymentStatus';
import { ValidationError } from '../../../src/domain/types';

describe('DeploymentStatus Value Object', () => {
  describe('create()', () => {
    test('should create pending status', () => {
      const result = DeploymentStatus.create('pending');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.status).toBe('pending');
      }
    });

    test('should create in-progress status', () => {
      const result = DeploymentStatus.create('in-progress');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.status).toBe('in-progress');
      }
    });

    test('should create completed status', () => {
      const result = DeploymentStatus.create('completed');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.status).toBe('completed');
      }
    });

    test('should create failed status', () => {
      const result = DeploymentStatus.create('failed');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.status).toBe('failed');
      }
    });

    test('should reject invalid status', () => {
      const result = DeploymentStatus.create('invalid-status' as unknown as DeploymentStatusType);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ValidationError.InvalidValue);
      }
    });

    test('should reject empty string', () => {
      const result = DeploymentStatus.create('' as unknown as DeploymentStatusType);
      expect(result.success).toBe(false);
    });
  });

  describe('isPending()', () => {
    test('should return true for pending status', () => {
      const result = DeploymentStatus.create('pending');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.isPending()).toBe(true);
        expect(result.value.isInProgress()).toBe(false);
        expect(result.value.isCompleted()).toBe(false);
        expect(result.value.isFailed()).toBe(false);
      }
    });
  });

  describe('isInProgress()', () => {
    test('should return true for in-progress status', () => {
      const result = DeploymentStatus.create('in-progress');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.isPending()).toBe(false);
        expect(result.value.isInProgress()).toBe(true);
        expect(result.value.isCompleted()).toBe(false);
        expect(result.value.isFailed()).toBe(false);
      }
    });
  });

  describe('isCompleted()', () => {
    test('should return true for completed status', () => {
      const result = DeploymentStatus.create('completed');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.isPending()).toBe(false);
        expect(result.value.isInProgress()).toBe(false);
        expect(result.value.isCompleted()).toBe(true);
        expect(result.value.isFailed()).toBe(false);
      }
    });
  });

  describe('isFailed()', () => {
    test('should return true for failed status', () => {
      const result = DeploymentStatus.create('failed');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.isPending()).toBe(false);
        expect(result.value.isInProgress()).toBe(false);
        expect(result.value.isCompleted()).toBe(false);
        expect(result.value.isFailed()).toBe(true);
      }
    });
  });

  describe('isTerminal()', () => {
    test('should return true for completed status', () => {
      const result = DeploymentStatus.create('completed');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.isTerminal()).toBe(true);
      }
    });

    test('should return true for failed status', () => {
      const result = DeploymentStatus.create('failed');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.isTerminal()).toBe(true);
      }
    });

    test('should return false for pending status', () => {
      const result = DeploymentStatus.create('pending');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.isTerminal()).toBe(false);
      }
    });

    test('should return false for in-progress status', () => {
      const result = DeploymentStatus.create('in-progress');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.isTerminal()).toBe(false);
      }
    });
  });

  describe('toString()', () => {
    test('should return status string', () => {
      const result = DeploymentStatus.create('in-progress');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.toString()).toBe('in-progress');
      }
    });
  });

  describe('equals()', () => {
    test('should return true for same status', () => {
      const result1 = DeploymentStatus.create('completed');
      const result2 = DeploymentStatus.create('completed');
      expect(result1.success && result2.success).toBe(true);
      if (result1.success && result2.success) {
        expect(result1.value.equals(result2.value)).toBe(true);
      }
    });

    test('should return false for different status', () => {
      const result1 = DeploymentStatus.create('completed');
      const result2 = DeploymentStatus.create('failed');
      expect(result1.success && result2.success).toBe(true);
      if (result1.success && result2.success) {
        expect(result1.value.equals(result2.value)).toBe(false);
      }
    });
  });

  describe('immutability', () => {
    test('status is readonly (TypeScript compile-time guarantee)', () => {
      const result = DeploymentStatus.create('pending');
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.status).toBe('pending');
      }
    });
  });
});
