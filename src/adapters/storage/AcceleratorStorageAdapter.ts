/**
 * AcceleratorStorageAdapter
 *
 * Implements IStorageProvider using lc-platform-dev-accelerators
 * This is a reference implementation - actual implementation depends on accelerators package
 */

import { Result, StorageError } from '../../domain/types';
import { IStorageProvider, ArtifactReference } from '../../use-cases/ports';

/**
 * Storage adapter using lc-platform-dev-accelerators
 * NOTE: Stub implementation until accelerators package is available
 */
export class AcceleratorStorageAdapter implements IStorageProvider {
  private readonly inMemoryStorage = new Map<string, unknown>();

  async exists(path: string): Promise<boolean> {
    // Stub: Check in-memory storage
    return this.inMemoryStorage.has(path);
  }

  async read<T>(path: string): Promise<Result<T, StorageError>> {
    // Stub: Read from in-memory storage
    if (!this.inMemoryStorage.has(path)) {
      return { success: false, error: StorageError.NotFound };
    }

    const data = this.inMemoryStorage.get(path) as T;
    return { success: true, value: data };
  }

  async write<T>(path: string, data: T): Promise<Result<void, StorageError>> {
    // Stub: Write to in-memory storage
    this.inMemoryStorage.set(path, data);
    return { success: true, value: undefined };
  }

  async delete(path: string): Promise<Result<void, StorageError>> {
    // Stub: Delete from in-memory storage
    this.inMemoryStorage.delete(path);
    return { success: true, value: undefined };
  }

  async uploadArtifact(
    path: string,
    _stream: ReadableStream | NodeJS.ReadableStream,
    metadata: { size: number; contentType: string }
  ): Promise<Result<ArtifactReference, StorageError>> {
    // Stub: Simulated artifact upload
    const artifactRef: ArtifactReference = {
      path,
      size: metadata.size,
      checksum: 'sha256:stub-checksum',
      uploadedAt: new Date(),
    };

    return { success: true, value: artifactRef };
  }

  async deleteArtifact(path: string): Promise<Result<void, StorageError>> {
    // Stub: Delete artifact
    return this.delete(path);
  }
}
