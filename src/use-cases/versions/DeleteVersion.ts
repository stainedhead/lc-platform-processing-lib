/**
 * DeleteVersion Use Case
 * Deletes a version configuration (FR-016, FR-016a, FR-016b)
 */

import { Result, ConfigurationError } from '../../domain/types';
import { StoragePath } from '../../domain/value-objects/StoragePath';
import { IStorageProvider } from '../ports';
import type { VersionIdentifier } from '../types';

export class DeleteVersion {
  constructor(private readonly storage: IStorageProvider) {}

  async execute(params: VersionIdentifier): Promise<Result<void, ConfigurationError>> {
    const storagePathResult = StoragePath.forVersion(
      params.account,
      params.team,
      params.moniker,
      params.version
    );

    if (!storagePathResult.success) {
      return { success: false, error: ConfigurationError.ValidationFailed };
    }

    const path = storagePathResult.value.versionConfigPath;

    // Check if version exists
    const exists = await this.storage.exists(path);
    if (!exists) {
      return { success: false, error: ConfigurationError.NotFound };
    }

    // Delete version configuration
    const deleteResult = await this.storage.delete(path);
    if (!deleteResult.success) {
      return { success: false, error: ConfigurationError.StorageError };
    }

    return { success: true, value: undefined };
  }
}
