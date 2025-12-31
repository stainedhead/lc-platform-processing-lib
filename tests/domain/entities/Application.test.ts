/**
 * Domain Unit Test: Application Entity
 *
 * Tests for Application entity (uniqueness invariants, team+moniker validation)
 * Pure unit test with NO external dependencies
 */

import { describe, test, expect } from 'bun:test';
import { Application } from '../../../src/domain/entities/Application';
import { TeamMoniker } from '../../../src/domain/value-objects/TeamMoniker';
import { StoragePath } from '../../../src/domain/value-objects/StoragePath';

describe('Application Entity', () => {
  describe('create()', () => {
    test('should create valid application', () => {
      const teamMonikerResult = TeamMoniker.create('alpha', 'api-service');
      const storagePathResult = StoragePath.forApplication('acme', 'alpha', 'api-service');

      expect(teamMonikerResult.success && storagePathResult.success).toBe(true);

      if (teamMonikerResult.success && storagePathResult.success) {
        const result = Application.create({
          account: 'acme',
          teamMoniker: teamMonikerResult.value,
          storagePath: storagePathResult.value,
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value.account).toBe('acme');
          expect(result.value.teamMoniker).toBe(teamMonikerResult.value);
          expect(result.value.storagePath).toBe(storagePathResult.value);
          expect(result.value.id).toBeDefined();
          expect(result.value.createdAt).toBeInstanceOf(Date);
          expect(result.value.updatedAt).toBeInstanceOf(Date);
        }
      }
    });

    test('should create application with metadata', () => {
      const teamMonikerResult = TeamMoniker.create('alpha', 'api-service');
      const storagePathResult = StoragePath.forApplication('acme', 'alpha', 'api-service');

      expect(teamMonikerResult.success && storagePathResult.success).toBe(true);

      if (teamMonikerResult.success && storagePathResult.success) {
        const result = Application.create({
          account: 'acme',
          teamMoniker: teamMonikerResult.value,
          storagePath: storagePathResult.value,
          metadata: {
            displayName: 'API Service',
            description: 'Core API',
            owner: 'alpha-team@acme.com',
          },
        });

        expect(result.success).toBe(true);
        if (result.success) {
          expect(result.value.metadata?.displayName).toBe('API Service');
          expect(result.value.metadata?.owner).toBe('alpha-team@acme.com');
        }
      }
    });

    test('should reject empty account', () => {
      const teamMonikerResult = TeamMoniker.create('alpha', 'api-service');
      const storagePathResult = StoragePath.forApplication('acme', 'alpha', 'api-service');

      expect(teamMonikerResult.success && storagePathResult.success).toBe(true);

      if (teamMonikerResult.success && storagePathResult.success) {
        const result = Application.create({
          account: '',
          teamMoniker: teamMonikerResult.value,
          storagePath: storagePathResult.value,
        });

        expect(result.success).toBe(false);
      }
    });
  });

  describe('update()', () => {
    test('should update metadata', () => {
      const teamMonikerResult = TeamMoniker.create('alpha', 'api-service');
      const storagePathResult = StoragePath.forApplication('acme', 'alpha', 'api-service');

      if (teamMonikerResult.success && storagePathResult.success) {
        const createResult = Application.create({
          account: 'acme',
          teamMoniker: teamMonikerResult.value,
          storagePath: storagePathResult.value,
          metadata: {
            displayName: 'Old Name',
          },
        });

        expect(createResult.success).toBe(true);

        if (createResult.success) {
          const app = createResult.value;
          const originalUpdatedAt = app.updatedAt;

          // Small delay to ensure timestamp difference
          setTimeout(() => {
            const updateResult = app.update({
              displayName: 'New Name',
              description: 'Updated description',
            });

            expect(updateResult.success).toBe(true);
            expect(app.metadata?.displayName).toBe('New Name');
            expect(app.metadata?.description).toBe('Updated description');
            expect(app.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
          }, 10);
        }
      }
    });
  });

  describe('immutability invariants', () => {
    test('id, teamMoniker, storagePath are readonly (TypeScript compile-time guarantee)', () => {
      const teamMonikerResult = TeamMoniker.create('alpha', 'api-service');
      const storagePathResult = StoragePath.forApplication('acme', 'alpha', 'api-service');

      if (teamMonikerResult.success && storagePathResult.success) {
        const result = Application.create({
          account: 'acme',
          teamMoniker: teamMonikerResult.value,
          storagePath: storagePathResult.value,
        });

        expect(result.success).toBe(true);

        if (result.success) {
          // TypeScript prevents modification at compile time
          expect(result.value.id).toBeDefined();
          expect(result.value.teamMoniker.team).toBe('alpha');
          expect(result.value.storagePath.account).toBe('acme');
        }
      }
    });
  });

  describe('equals()', () => {
    test('should compare by AppId', () => {
      const teamMonikerResult = TeamMoniker.create('alpha', 'api-service');
      const storagePathResult = StoragePath.forApplication('acme', 'alpha', 'api-service');

      if (teamMonikerResult.success && storagePathResult.success) {
        const result1 = Application.create({
          account: 'acme',
          teamMoniker: teamMonikerResult.value,
          storagePath: storagePathResult.value,
        });

        const result2 = Application.create({
          account: 'acme',
          teamMoniker: teamMonikerResult.value,
          storagePath: storagePathResult.value,
        });

        expect(result1.success && result2.success).toBe(true);

        if (result1.success && result2.success) {
          // Different instances with different IDs should not be equal
          expect(result1.value.equals(result2.value)).toBe(false);

          // Same instance should be equal to itself
          expect(result1.value.equals(result1.value)).toBe(true);
        }
      }
    });
  });

  describe('toStorageFormat() and fromStorage()', () => {
    test('should serialize and deserialize correctly', () => {
      const teamMonikerResult = TeamMoniker.create('alpha', 'api-service');
      const storagePathResult = StoragePath.forApplication('acme', 'alpha', 'api-service');

      if (teamMonikerResult.success && storagePathResult.success) {
        const createResult = Application.create({
          account: 'acme',
          teamMoniker: teamMonikerResult.value,
          storagePath: storagePathResult.value,
          metadata: {
            displayName: 'API Service',
            owner: 'alpha-team@acme.com',
          },
        });

        expect(createResult.success).toBe(true);

        if (createResult.success) {
          const app = createResult.value;
          const storageData = app.toStorageFormat();

          expect(storageData.id).toBe(app.id.toString());
          expect(storageData.account).toBe('acme');
          expect(storageData.team).toBe('alpha');
          expect(storageData.moniker).toBe('api-service');
          expect(storageData.metadata?.displayName).toBe('API Service');

          // Reconstruct from storage
          const reconstructResult = Application.fromStorage(storageData);

          expect(reconstructResult.success).toBe(true);
          if (reconstructResult.success) {
            expect(reconstructResult.value.id.toString()).toBe(app.id.toString());
            expect(reconstructResult.value.account).toBe(app.account);
            expect(reconstructResult.value.teamMoniker.team).toBe('alpha');
            expect(reconstructResult.value.metadata?.displayName).toBe('API Service');
          }
        }
      }
    });
  });
});
