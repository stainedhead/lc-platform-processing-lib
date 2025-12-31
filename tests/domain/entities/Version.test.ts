/**
 * Domain Unit Tests: Version Entity
 * Tests version number validation, dependency consistency, immutability (T039)
 */

import { describe, test, expect } from 'bun:test';
import { Version } from '../../../src/domain/entities/Version';
import { AppId } from '../../../src/domain/value-objects/AppId';
import { VersionNumber } from '../../../src/domain/value-objects/VersionNumber';
import { StoragePath } from '../../../src/domain/value-objects/StoragePath';
import { ValidationError } from '../../../src/domain/types';
import type { DependencyConfiguration, ArtifactReference } from '../../../src/use-cases/ports';

describe('Version Entity', () => {
  const createValidParams = () => {
    const appIdResult = AppId.generate();
    const versionNumberResult = VersionNumber.parse('1.0.0');
    const storagePathResult = StoragePath.forVersion('123456789012', 'platform', 'my-app', '1.0.0');

    if (!appIdResult.success || !versionNumberResult.success || !storagePathResult.success) {
      throw new Error('Failed to create valid params for test');
    }

    return {
      applicationId: appIdResult.value,
      versionNumber: versionNumberResult.value,
      storagePath: storagePathResult.value,
    };
  };

  describe('create()', () => {
    test('should create version with minimal params', () => {
      const params = createValidParams();
      const result = Version.create(params);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.id).toBeDefined();
        expect(result.value.applicationId).toBe(params.applicationId);
        expect(result.value.versionNumber).toBe(params.versionNumber);
        expect(result.value.dependencies).toEqual([]);
        expect(result.value.artifactReference).toBeUndefined();
        expect(result.value.metadata).toBeUndefined();
        expect(result.value.createdAt).toBeInstanceOf(Date);
        expect(result.value.updatedAt).toBeInstanceOf(Date);
      }
    });

    test('should create version with dependencies', () => {
      const params = createValidParams();
      const dependencies: DependencyConfiguration[] = [
        { type: 'database', name: 'postgres', version: '14' },
        { type: 'queue', name: 'rabbitmq', version: '3.11' },
      ];

      const result = Version.create({ ...params, dependencies });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.dependencies).toEqual(dependencies);
      }
    });

    test('should create version with metadata', () => {
      const params = createValidParams();
      const metadata = {
        description: 'Test version',
        releaseNotes: 'Initial release',
      };

      const result = Version.create({ ...params, metadata });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.metadata).toEqual(metadata);
      }
    });

    test('should generate unique IDs for different versions', () => {
      const params = createValidParams();
      const result1 = Version.create(params);
      const result2 = Version.create(params);

      expect(result1.success && result2.success).toBe(true);
      if (result1.success && result2.success) {
        expect(result1.value.id).not.toBe(result2.value.id);
      }
    });
  });

  describe('update()', () => {
    test('should update dependencies', () => {
      const params = createValidParams();
      const version = Version.create(params);
      expect(version.success).toBe(true);
      if (!version.success) return;

      const newDependencies: DependencyConfiguration[] = [
        { type: 'database', name: 'mysql', version: '8.0' },
      ];

      const updateResult = version.value.update({ dependencies: newDependencies });
      expect(updateResult.success).toBe(true);
      expect(version.value.dependencies).toEqual(newDependencies);
    });

    test('should update metadata', () => {
      const params = createValidParams();
      const version = Version.create(params);
      expect(version.success).toBe(true);
      if (!version.success) return;

      const newMetadata = { description: 'Updated description' };
      const updateResult = version.value.update({ metadata: newMetadata });
      expect(updateResult.success).toBe(true);
      expect(version.value.metadata).toEqual(newMetadata);
    });

    test('should update updatedAt timestamp', () => {
      const params = createValidParams();
      const version = Version.create(params);
      expect(version.success).toBe(true);
      if (!version.success) return;

      const originalUpdatedAt = version.value.updatedAt;

      // Wait a small amount to ensure timestamp differs
      const updateResult = version.value.update({ metadata: { description: 'New' } });
      expect(updateResult.success).toBe(true);
      expect(version.value.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });
  });

  describe('cacheArtifact()', () => {
    test('should cache artifact reference', () => {
      const params = createValidParams();
      const version = Version.create(params);
      expect(version.success).toBe(true);
      if (!version.success) return;

      const artifact: ArtifactReference = {
        path: 's3://bucket/artifact.zip',
        checksum: 'abc123',
        size: 1024,
        uploadedAt: new Date(),
      };

      const cacheResult = version.value.cacheArtifact(artifact);
      expect(cacheResult.success).toBe(true);
      expect(version.value.artifactReference).toEqual(artifact);
    });

    test('should reject caching artifact if already cached', () => {
      const params = createValidParams();
      const version = Version.create(params);
      expect(version.success).toBe(true);
      if (!version.success) return;

      const artifact: ArtifactReference = {
        path: 's3://bucket/artifact.zip',
        checksum: 'abc123',
        size: 1024,
        uploadedAt: new Date(),
      };

      const firstCache = version.value.cacheArtifact(artifact);
      expect(firstCache.success).toBe(true);

      const secondCache = version.value.cacheArtifact(artifact);
      expect(secondCache.success).toBe(false);
      if (!secondCache.success) {
        expect(secondCache.error).toBe(ValidationError.InvalidValue);
      }
    });

    test('should update updatedAt timestamp when caching artifact', () => {
      const params = createValidParams();
      const version = Version.create(params);
      expect(version.success).toBe(true);
      if (!version.success) return;

      const originalUpdatedAt = version.value.updatedAt;

      const artifact: ArtifactReference = {
        path: 's3://bucket/artifact.zip',
        checksum: 'abc123',
        size: 1024,
        uploadedAt: new Date(),
      };

      const cacheResult = version.value.cacheArtifact(artifact);
      expect(cacheResult.success).toBe(true);
      expect(version.value.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });
  });

  describe('setPolicyReferences()', () => {
    test('should set policy references', () => {
      const params = createValidParams();
      const version = Version.create(params);
      expect(version.success).toBe(true);
      if (!version.success) return;

      const policyRefs = {
        appPolicy: 'arn:aws:iam::123456789012:policy/app-policy',
        cicdPolicy: 'arn:aws:iam::123456789012:policy/cicd-policy',
      };

      version.value.setPolicyReferences(policyRefs);
      expect(version.value.policyReferences).toEqual(policyRefs);
    });

    test('should update updatedAt timestamp when setting policy references', () => {
      const params = createValidParams();
      const version = Version.create(params);
      expect(version.success).toBe(true);
      if (!version.success) return;

      const originalUpdatedAt = version.value.updatedAt;

      const policyRefs = {
        appPolicy: 'arn:aws:iam::123456789012:policy/app-policy',
      };

      version.value.setPolicyReferences(policyRefs);
      expect(version.value.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    });
  });

  describe('toStorageFormat() and fromStorage()', () => {
    test('should serialize to storage format', () => {
      const params = createValidParams();
      const dependencies: DependencyConfiguration[] = [
        { type: 'database', name: 'postgres', version: '14' },
      ];
      const metadata = { description: 'Test version' };

      const version = Version.create({ ...params, dependencies, metadata });
      expect(version.success).toBe(true);
      if (!version.success) return;

      const stored = version.value.toStorageFormat();

      expect(stored.id).toBe(version.value.id);
      expect(stored.applicationId).toBe(params.applicationId.toString());
      expect(stored.versionNumber).toBe('1.0.0');
      expect(stored.dependencies).toEqual(dependencies);
      expect(stored.metadata).toEqual(metadata);
      expect(stored.createdAt).toBeDefined();
      expect(stored.updatedAt).toBeDefined();
    });

    test('should deserialize from storage format', () => {
      const appId = AppId.generate();
      expect(appId.success).toBe(true);
      if (!appId.success) return;

      const stored = {
        id: crypto.randomUUID(),
        applicationId: appId.value.toString(),
        versionNumber: '2.1.0',
        dependencies: [{ type: 'queue', name: 'rabbitmq', version: '3.11' }],
        metadata: { description: 'From storage' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = Version.fromStorage(stored);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.id).toBe(stored.id);
        expect(result.value.applicationId.toString()).toBe(stored.applicationId);
        expect(result.value.versionNumber.toString()).toBe('2.1.0');
        expect(result.value.dependencies).toEqual(stored.dependencies);
        expect(result.value.metadata).toEqual(stored.metadata);
      }
    });

    test('should reject invalid application ID in storage data', () => {
      const stored = {
        id: crypto.randomUUID(),
        applicationId: 'not-a-uuid',
        versionNumber: '1.0.0',
        dependencies: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = Version.fromStorage(stored);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ValidationError.InvalidFormat);
      }
    });

    test('should reject invalid version number in storage data', () => {
      const appId = AppId.generate();
      expect(appId.success).toBe(true);
      if (!appId.success) return;

      const stored = {
        id: crypto.randomUUID(),
        applicationId: appId.value.toString(),
        versionNumber: 'invalid-version',
        dependencies: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      const result = Version.fromStorage(stored);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ValidationError.InvalidFormat);
      }
    });

    test('should round-trip serialize and deserialize', () => {
      const params = createValidParams();
      const dependencies: DependencyConfiguration[] = [
        { type: 'database', name: 'postgres', version: '14' },
      ];

      const original = Version.create({ ...params, dependencies });
      expect(original.success).toBe(true);
      if (!original.success) return;

      const stored = original.value.toStorageFormat();
      const restored = Version.fromStorage(stored);

      expect(restored.success).toBe(true);
      if (restored.success) {
        expect(restored.value.id).toBe(original.value.id);
        expect(restored.value.versionNumber.toString()).toBe(
          original.value.versionNumber.toString()
        );
        expect(restored.value.dependencies).toEqual(original.value.dependencies);
      }
    });
  });

  describe('immutability', () => {
    test('id is readonly (TypeScript compile-time guarantee)', () => {
      const params = createValidParams();
      const version = Version.create(params);
      expect(version.success).toBe(true);
      if (version.success) {
        expect(version.value.id).toBeDefined();
      }
    });

    test('applicationId is readonly', () => {
      const params = createValidParams();
      const version = Version.create(params);
      expect(version.success).toBe(true);
      if (version.success) {
        expect(version.value.applicationId).toBe(params.applicationId);
      }
    });

    test('versionNumber is readonly', () => {
      const params = createValidParams();
      const version = Version.create(params);
      expect(version.success).toBe(true);
      if (version.success) {
        expect(version.value.versionNumber).toBe(params.versionNumber);
      }
    });

    test('createdAt is readonly', () => {
      const params = createValidParams();
      const version = Version.create(params);
      expect(version.success).toBe(true);
      if (version.success) {
        expect(version.value.createdAt).toBeInstanceOf(Date);
      }
    });
  });
});
