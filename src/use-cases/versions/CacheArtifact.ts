/**
 * CacheArtifact Use Case
 * Uploads and caches deployment artifacts (FR-021)
 */

import { Result, ConfigurationError, StorageError } from '../../domain/types';
import { StoragePath } from '../../domain/value-objects/StoragePath';
import { IStorageProvider, ArtifactReference } from '../ports';
import type { CacheArtifactParams } from '../types';
import { ReadVersion } from './ReadVersion';

export class CacheArtifact {
  private readonly readVersion: ReadVersion;

  constructor(private readonly storage: IStorageProvider) {
    this.readVersion = new ReadVersion(storage);
  }

  async execute(
    params: CacheArtifactParams
  ): Promise<Result<ArtifactReference, ConfigurationError | StorageError>> {
    const versionResult = await this.readVersion.execute(params.identifier);
    if (!versionResult.success) return versionResult;

    const version = versionResult.value;
    if (version.artifactReference) {
      return { success: false, error: ConfigurationError.AlreadyExists };
    }

    const storagePathResult = StoragePath.forVersion(
      params.identifier.account,
      params.identifier.team,
      params.identifier.moniker,
      params.identifier.version
    );
    if (!storagePathResult.success) {
      return { success: false, error: ConfigurationError.ValidationFailed };
    }

    const artifactPath = storagePathResult.value.artifactPath;
    const uploadResult = await this.storage.uploadArtifact(
      artifactPath,
      params.stream,
      params.metadata
    );

    if (!uploadResult.success) {
      // Cleanup on failure (FR-021a)
      await this.storage.deleteArtifact(artifactPath);
      return uploadResult;
    }

    // Update version with artifact reference
    const cacheResult = version.cacheArtifact(uploadResult.value);
    if (!cacheResult.success) {
      await this.storage.deleteArtifact(artifactPath);
      return { success: false, error: ConfigurationError.ValidationFailed };
    }

    // Persist updated version
    const writeResult = await this.storage.write(
      storagePathResult.value.versionConfigPath,
      version.toStorageFormat()
    );
    if (!writeResult.success) {
      await this.storage.deleteArtifact(artifactPath);
      return { success: false, error: ConfigurationError.StorageError };
    }

    return { success: true, value: uploadResult.value };
  }
}
