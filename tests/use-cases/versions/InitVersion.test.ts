/**
 * Use Case Test: InitVersion
 * Tests version initialization with AlreadyExists error handling (T041)
 */

import { describe, test, expect } from 'bun:test';
import { InitVersion } from '../../../src/use-cases/versions/InitVersion';
import { AcceleratorStorageAdapter } from '../../../src/adapters/storage/AcceleratorStorageAdapter';
import { ConfigurationError } from '../../../src/domain/types';

describe('InitVersion Use Case', () => {
  test('should create new version configuration', async () => {
    const storage = new AcceleratorStorageAdapter();
    const initVersion = new InitVersion(storage);

    const result = await initVersion.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      versionNumber: '1.0.0',
      dependencies: [{ type: 'database', name: 'postgres', version: '14' }],
      metadata: {
        description: 'Initial version',
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.versionNumber.toString()).toBe('1.0.0');
      expect(result.value.dependencies).toHaveLength(1);
      expect(result.value.metadata?.description).toBe('Initial version');
    }
  });

  test('should prevent overwrite of existing version (FR-013)', async () => {
    const storage = new AcceleratorStorageAdapter();
    const initVersion = new InitVersion(storage);

    const params = {
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      versionNumber: '1.0.0',
    };

    // First creation should succeed
    const firstResult = await initVersion.execute(params);
    expect(firstResult.success).toBe(true);

    // Second creation should fail with AlreadyExists
    const secondResult = await initVersion.execute(params);
    expect(secondResult.success).toBe(false);
    if (!secondResult.success) {
      expect(secondResult.error).toBe(ConfigurationError.AlreadyExists);
    }
  });

  test('should reject invalid version number format', async () => {
    const storage = new AcceleratorStorageAdapter();
    const initVersion = new InitVersion(storage);

    const result = await initVersion.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      versionNumber: 'invalid-version',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(ConfigurationError.ValidationFailed);
    }
  });

  test('should reject invalid storage path parameters', async () => {
    const storage = new AcceleratorStorageAdapter();
    const initVersion = new InitVersion(storage);

    const result = await initVersion.execute({
      account: '', // Invalid: empty
      team: 'platform',
      moniker: 'my-app',
      versionNumber: '1.0.0',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(ConfigurationError.ValidationFailed);
    }
  });

  test('should create version with prerelease tag', async () => {
    const storage = new AcceleratorStorageAdapter();
    const initVersion = new InitVersion(storage);

    const result = await initVersion.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      versionNumber: '1.0.0-alpha.1',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.versionNumber.toString()).toBe('1.0.0-alpha.1');
      expect(result.value.versionNumber.prerelease).toBe('alpha.1');
    }
  });

  test('should create version with empty dependencies list', async () => {
    const storage = new AcceleratorStorageAdapter();
    const initVersion = new InitVersion(storage);

    const result = await initVersion.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      versionNumber: '1.0.0',
      dependencies: [],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.dependencies).toEqual([]);
    }
  });

  test('should create version without metadata', async () => {
    const storage = new AcceleratorStorageAdapter();
    const initVersion = new InitVersion(storage);

    const result = await initVersion.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      versionNumber: '1.0.0',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.metadata).toBeUndefined();
    }
  });
});
