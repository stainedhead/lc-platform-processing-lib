/**
 * Use Case Test: UpdateVersion
 * Tests version update with last-write-wins (T045, FR-014, FR-015)
 */

import { describe, test, expect } from 'bun:test';
import { UpdateVersion } from '../../../src/use-cases/versions/UpdateVersion';
import { InitVersion } from '../../../src/use-cases/versions/InitVersion';
import { AcceleratorStorageAdapter } from '../../../src/adapters/storage/AcceleratorStorageAdapter';
import { ConfigurationError } from '../../../src/domain/types';

describe('UpdateVersion Use Case', () => {
  const createVersion = async (storage: AcceleratorStorageAdapter) => {
    const initVersion = new InitVersion(storage);
    return await initVersion.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      versionNumber: '1.0.0',
      dependencies: [{ type: 'database', name: 'postgres', version: '14' }],
      metadata: {
        description: 'Original version',
      },
    });
  };

  test('should update version dependencies (FR-014)', async () => {
    const storage = new AcceleratorStorageAdapter();
    await createVersion(storage);

    const updateVersion = new UpdateVersion(storage);
    const result = await updateVersion.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      version: '1.0.0',
      dependencies: [
        { type: 'database', name: 'mysql', version: '8.0' },
        { type: 'queue', name: 'rabbitmq', version: '3.11' },
      ],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.dependencies).toHaveLength(2);
      expect(result.value.dependencies[0].name).toBe('mysql');
      expect(result.value.dependencies[1].name).toBe('rabbitmq');
    }
  });

  test('should update version metadata (FR-014)', async () => {
    const storage = new AcceleratorStorageAdapter();
    await createVersion(storage);

    const updateVersion = new UpdateVersion(storage);
    const result = await updateVersion.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      version: '1.0.0',
      metadata: {
        description: 'Updated version',
        releaseNotes: 'Fixed critical bug',
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.metadata?.description).toBe('Updated version');
      expect(result.value.metadata?.releaseNotes).toBe('Fixed critical bug');
    }
  });

  test('should return NotFound error for non-existent version (FR-015)', async () => {
    const storage = new AcceleratorStorageAdapter();
    const updateVersion = new UpdateVersion(storage);

    const result = await updateVersion.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'non-existent-app',
      version: '1.0.0',
      metadata: {
        description: 'Updated',
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(ConfigurationError.NotFound);
    }
  });

  test('should update updatedAt timestamp', async () => {
    const storage = new AcceleratorStorageAdapter();
    const initResult = await createVersion(storage);
    expect(initResult.success).toBe(true);
    if (!initResult.success) return;

    const originalUpdatedAt = initResult.value.updatedAt;

    const updateVersion = new UpdateVersion(storage);
    const result = await updateVersion.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      version: '1.0.0',
      metadata: {
        description: 'Updated',
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.updatedAt.getTime()).toBeGreaterThanOrEqual(originalUpdatedAt.getTime());
    }
  });

  test('should persist changes to storage', async () => {
    const storage = new AcceleratorStorageAdapter();
    await createVersion(storage);

    const updateVersion = new UpdateVersion(storage);
    await updateVersion.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      version: '1.0.0',
      metadata: {
        description: 'Updated',
      },
    });

    // Read from storage to verify persistence
    const storagePath = 'lcp-123456789012-platform-my-app/versions/1.0.0/appversion.config';
    const readResult = await storage.read(storagePath);
    expect(readResult.success).toBe(true);
    if (readResult.success) {
      const versionData = readResult.value as Record<string, unknown>;
      expect((versionData.metadata as Record<string, unknown>).description).toBe('Updated');
    }
  });

  test('should allow updating with empty dependencies list', async () => {
    const storage = new AcceleratorStorageAdapter();
    await createVersion(storage);

    const updateVersion = new UpdateVersion(storage);
    const result = await updateVersion.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      version: '1.0.0',
      dependencies: [],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.dependencies).toEqual([]);
    }
  });
});
