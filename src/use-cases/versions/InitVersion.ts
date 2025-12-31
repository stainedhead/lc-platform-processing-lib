/**
 * InitVersion Use Case
 * Creates a new version configuration (FR-012, FR-013)
 */

import { Result, ConfigurationError } from '../../domain/types';
import { Version } from '../../domain/entities/Version';
import { AppId } from '../../domain/value-objects/AppId';
import { VersionNumber } from '../../domain/value-objects/VersionNumber';
import { StoragePath } from '../../domain/value-objects/StoragePath';
import { IStorageProvider } from '../ports';
import type { InitVersionParams } from '../types';

export class InitVersion {
  constructor(private readonly storage: IStorageProvider) {}

  async execute(params: InitVersionParams): Promise<Result<Version, ConfigurationError>> {
    const versionNumberResult = VersionNumber.parse(params.versionNumber);
    if (!versionNumberResult.success) {
      return { success: false, error: ConfigurationError.ValidationFailed };
    }

    const storagePathResult = StoragePath.forVersion(
      params.account,
      params.team,
      params.moniker,
      params.versionNumber
    );
    if (!storagePathResult.success) {
      return { success: false, error: ConfigurationError.ValidationFailed };
    }

    const path = storagePathResult.value.versionConfigPath;
    const exists = await this.storage.exists(path);
    if (exists) {
      return { success: false, error: ConfigurationError.AlreadyExists };
    }

    // Create app ID (would come from application lookup in real implementation)
    const appIdResult = AppId.generate();
    if (!appIdResult.success) {
      return { success: false, error: ConfigurationError.ValidationFailed };
    }

    const versionResult = Version.create({
      applicationId: appIdResult.value,
      versionNumber: versionNumberResult.value,
      storagePath: storagePathResult.value,
      dependencies: params.dependencies,
      metadata: params.metadata,
    });

    if (!versionResult.success) {
      return { success: false, error: ConfigurationError.ValidationFailed };
    }

    const writeResult = await this.storage.write(path, versionResult.value.toStorageFormat());
    if (!writeResult.success) {
      return { success: false, error: ConfigurationError.StorageError };
    }

    return { success: true, value: versionResult.value };
  }
}
