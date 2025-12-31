/**
 * Use Case Test: DeleteVersion
 * Tests version deletion with force/cascade modes (T046, FR-016, FR-016a, FR-016b)
 */

import { describe, test, expect } from 'bun:test';
import { DeleteVersion } from '../../../src/use-cases/versions/DeleteVersion';
import { InitVersion } from '../../../src/use-cases/versions/InitVersion';
import { ReadVersion } from '../../../src/use-cases/versions/ReadVersion';
import { AcceleratorStorageAdapter } from '../../../src/adapters/storage/AcceleratorStorageAdapter';
import { ConfigurationError } from '../../../src/domain/types';

describe('DeleteVersion Use Case', () => {
  const createVersion = async (
    storage: AcceleratorStorageAdapter,
    versionNumber: string = '1.0.0'
  ) => {
    const initVersion = new InitVersion(storage);
    return await initVersion.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      versionNumber,
    });
  };

  test('should delete version configuration (FR-016)', async () => {
    const storage = new AcceleratorStorageAdapter();
    await createVersion(storage);

    const deleteVersion = new DeleteVersion(storage);
    const result = await deleteVersion.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      version: '1.0.0',
    });

    expect(result.success).toBe(true);

    // Verify version is deleted
    const readVersion = new ReadVersion(storage);
    const readResult = await readVersion.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      version: '1.0.0',
    });
    expect(readResult.success).toBe(false);
    if (!readResult.success) {
      expect(readResult.error).toBe(ConfigurationError.NotFound);
    }
  });

  test('should return NotFound error for non-existent version', async () => {
    const storage = new AcceleratorStorageAdapter();
    const deleteVersion = new DeleteVersion(storage);

    const result = await deleteVersion.execute({
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

  test('should delete version from storage', async () => {
    const storage = new AcceleratorStorageAdapter();
    await createVersion(storage);

    const deleteVersion = new DeleteVersion(storage);
    await deleteVersion.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      version: '1.0.0',
    });

    // Verify storage is deleted
    const storagePath = 'lcp-123456789012-platform-my-app/versions/1.0.0/appversion.config';
    const readResult = await storage.read(storagePath);
    expect(readResult.success).toBe(false);
  });

  test('should reject invalid storage path parameters', async () => {
    const storage = new AcceleratorStorageAdapter();
    const deleteVersion = new DeleteVersion(storage);

    const result = await deleteVersion.execute({
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
});
