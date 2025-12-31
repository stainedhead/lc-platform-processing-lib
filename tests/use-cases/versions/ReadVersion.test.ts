/**
 * Use Case Test: ReadVersion
 * Tests reading version configuration from storage (T044)
 */

import { describe, test, expect } from 'bun:test';
import { ReadVersion } from '../../../src/use-cases/versions/ReadVersion';
import { InitVersion } from '../../../src/use-cases/versions/InitVersion';
import { AcceleratorStorageAdapter } from '../../../src/adapters/storage/AcceleratorStorageAdapter';
import { ConfigurationError } from '../../../src/domain/types';

describe('ReadVersion Use Case', () => {
  test('should read existing version configuration', async () => {
    const storage = new AcceleratorStorageAdapter();
    const initVersion = new InitVersion(storage);
    const readVersion = new ReadVersion(storage);

    // Create version first
    await initVersion.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      versionNumber: '1.0.0',
      dependencies: [{ type: 'database', name: 'postgres', version: '14' }],
      metadata: {
        description: 'Test version',
      },
    });

    // Read it back
    const result = await readVersion.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      version: '1.0.0',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.versionNumber.toString()).toBe('1.0.0');
      expect(result.value.dependencies).toHaveLength(1);
      expect(result.value.dependencies[0].name).toBe('postgres');
      expect(result.value.metadata?.description).toBe('Test version');
    }
  });

  test('should return NotFound error for non-existent version', async () => {
    const storage = new AcceleratorStorageAdapter();
    const readVersion = new ReadVersion(storage);

    const result = await readVersion.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'non-existent-app',
      version: '1.0.0',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(ConfigurationError.NotFound);
    }
  });

  test('should reject invalid storage path parameters', async () => {
    const storage = new AcceleratorStorageAdapter();
    const readVersion = new ReadVersion(storage);

    const result = await readVersion.execute({
      account: '', // Invalid: empty
      team: 'platform',
      moniker: 'my-app',
      version: '1.0.0',
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(ConfigurationError.ValidationFailed);
    }
  });

  test('should read version with prerelease tag', async () => {
    const storage = new AcceleratorStorageAdapter();
    const initVersion = new InitVersion(storage);
    const readVersion = new ReadVersion(storage);

    await initVersion.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      versionNumber: '2.0.0-beta.1',
    });

    const result = await readVersion.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      version: '2.0.0-beta.1',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.versionNumber.toString()).toBe('2.0.0-beta.1');
      expect(result.value.versionNumber.prerelease).toBe('beta.1');
    }
  });

  test('should read version with empty dependencies', async () => {
    const storage = new AcceleratorStorageAdapter();
    const initVersion = new InitVersion(storage);
    const readVersion = new ReadVersion(storage);

    await initVersion.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      versionNumber: '1.0.0',
      dependencies: [],
    });

    const result = await readVersion.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      version: '1.0.0',
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.dependencies).toEqual([]);
    }
  });
});
