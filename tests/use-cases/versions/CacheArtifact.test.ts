/**
 * Use Case Test: CacheArtifact
 * Tests artifact caching with cleanup on failure (T042, FR-021, FR-021a)
 */

import { describe, test, expect } from 'bun:test';
import { CacheArtifact } from '../../../src/use-cases/versions/CacheArtifact';
import { InitVersion } from '../../../src/use-cases/versions/InitVersion';
import { AcceleratorStorageAdapter } from '../../../src/adapters/storage/AcceleratorStorageAdapter';
import { ConfigurationError } from '../../../src/domain/types';
import { Readable } from 'stream';

describe('CacheArtifact Use Case', () => {
  const createVersion = async (storage: AcceleratorStorageAdapter) => {
    const initVersion = new InitVersion(storage);
    const result = await initVersion.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      versionNumber: '1.0.0',
    });
    expect(result.success).toBe(true);
    return result;
  };

  test('should cache artifact for version (FR-021)', async () => {
    const storage = new AcceleratorStorageAdapter();
    await createVersion(storage);

    const cacheArtifact = new CacheArtifact(storage);
    const stream = Readable.from(Buffer.from('artifact-data'));

    const result = await cacheArtifact.execute({
      identifier: {
        account: '123456789012',
        team: 'platform',
        moniker: 'my-app',
        version: '1.0.0',
      },
      stream,
      metadata: {
        contentType: 'application/zip',
        size: 100,
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.path).toBeDefined();
      expect(result.value.checksum).toBeDefined();
      expect(result.value.size).toBeGreaterThan(0);
      expect(result.value.uploadedAt).toBeInstanceOf(Date);
    }
  });

  test('should reject caching if version not found', async () => {
    const storage = new AcceleratorStorageAdapter();
    const cacheArtifact = new CacheArtifact(storage);
    const stream = Readable.from(Buffer.from('artifact-data'));

    const result = await cacheArtifact.execute({
      identifier: {
        account: '123456789012',
        team: 'platform',
        moniker: 'non-existent-app',
        version: '1.0.0',
      },
      stream,
      metadata: {
        contentType: 'application/zip',
        size: 100,
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(ConfigurationError.NotFound);
    }
  });

  test('should reject caching if artifact already cached', async () => {
    const storage = new AcceleratorStorageAdapter();
    await createVersion(storage);

    const cacheArtifact = new CacheArtifact(storage);
    const params = {
      identifier: {
        account: '123456789012',
        team: 'platform',
        moniker: 'my-app',
        version: '1.0.0',
      },
      stream: Readable.from(Buffer.from('artifact-data')),
      metadata: {
        contentType: 'application/zip',
        size: 100,
      },
    };

    // First cache should succeed
    const firstResult = await cacheArtifact.execute(params);
    expect(firstResult.success).toBe(true);

    // Second cache should fail with AlreadyExists
    const secondResult = await cacheArtifact.execute({
      ...params,
      stream: Readable.from(Buffer.from('artifact-data')),
    });
    expect(secondResult.success).toBe(false);
    if (!secondResult.success) {
      expect(secondResult.error).toBe(ConfigurationError.AlreadyExists);
    }
  });

  test('should update version metadata after caching artifact', async () => {
    const storage = new AcceleratorStorageAdapter();
    await createVersion(storage);

    const cacheArtifact = new CacheArtifact(storage);
    const stream = Readable.from(Buffer.from('artifact-data'));

    const result = await cacheArtifact.execute({
      identifier: {
        account: '123456789012',
        team: 'platform',
        moniker: 'my-app',
        version: '1.0.0',
      },
      stream,
      metadata: {
        contentType: 'application/zip',
        size: 100,
      },
    });

    expect(result.success).toBe(true);

    // Verify version was updated in storage
    const storagePath = 'lcp-123456789012-platform-my-app/versions/1.0.0/appversion.config';
    const readResult = await storage.read(storagePath);
    expect(readResult.success).toBe(true);
    if (readResult.success) {
      const versionData = readResult.value as Record<string, unknown>;
      expect(versionData.artifactReference).toBeDefined();
      expect((versionData.artifactReference as Record<string, unknown>).path).toBeDefined();
    }
  });

  test('should reject invalid storage path parameters', async () => {
    const storage = new AcceleratorStorageAdapter();
    const cacheArtifact = new CacheArtifact(storage);
    const stream = Readable.from(Buffer.from('artifact-data'));

    const result = await cacheArtifact.execute({
      identifier: {
        account: '', // Invalid: empty
        team: 'platform',
        moniker: 'my-app',
        version: '1.0.0',
      },
      stream,
      metadata: {
        contentType: 'application/zip',
        size: 100,
      },
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(ConfigurationError.ValidationFailed);
    }
  });
});
