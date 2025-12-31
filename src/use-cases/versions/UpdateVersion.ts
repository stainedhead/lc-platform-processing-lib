/**
 * UpdateVersion Use Case
 * Updates an existing version configuration (FR-014, FR-015)
 */

import { Result, ConfigurationError } from '../../domain/types';
import { Version } from '../../domain/entities/Version';
import { StoragePath } from '../../domain/value-objects/StoragePath';
import { IStorageProvider } from '../ports';
import type { UpdateVersionParams } from '../types';
import { ReadVersion } from './ReadVersion';

export class UpdateVersion {
  private readonly readVersion: ReadVersion;

  constructor(private readonly storage: IStorageProvider) {
    this.readVersion = new ReadVersion(storage);
  }

  async execute(params: UpdateVersionParams): Promise<Result<Version, ConfigurationError>> {
    // Read existing version
    const readResult = await this.readVersion.execute(params);
    if (!readResult.success) return readResult;

    const version = readResult.value;

    // Update version with new data
    const updateResult = version.update({
      dependencies: params.dependencies,
      metadata: params.metadata,
    });

    if (!updateResult.success) {
      return { success: false, error: ConfigurationError.ValidationFailed };
    }

    // Get storage path
    const storagePathResult = StoragePath.forVersion(
      params.account,
      params.team,
      params.moniker,
      params.version
    );
    if (!storagePathResult.success) {
      return { success: false, error: ConfigurationError.ValidationFailed };
    }

    // Persist updated version
    const writeResult = await this.storage.write(
      storagePathResult.value.versionConfigPath,
      version.toStorageFormat()
    );

    if (!writeResult.success) {
      return { success: false, error: ConfigurationError.StorageError };
    }

    return { success: true, value: version };
  }
}
