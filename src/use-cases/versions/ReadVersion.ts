/**
 * ReadVersion Use Case
 */

import { Result, ConfigurationError } from '../../domain/types';
import { Version, StoredVersionData } from '../../domain/entities/Version';
import { StoragePath } from '../../domain/value-objects/StoragePath';
import { IStorageProvider } from '../ports';
import type { VersionIdentifier } from '../types';

export class ReadVersion {
  constructor(private readonly storage: IStorageProvider) {}

  async execute(params: VersionIdentifier): Promise<Result<Version, ConfigurationError>> {
    const storagePathResult = StoragePath.forVersion(
      params.account,
      params.team,
      params.moniker,
      params.version
    );
    if (!storagePathResult.success) {
      return { success: false, error: ConfigurationError.ValidationFailed };
    }

    const readResult = await this.storage.read<StoredVersionData>(
      storagePathResult.value.versionConfigPath
    );
    if (!readResult.success) {
      return { success: false, error: ConfigurationError.NotFound };
    }

    const versionResult = Version.fromStorage(readResult.value);
    if (!versionResult.success) {
      return { success: false, error: ConfigurationError.InvalidFormat };
    }

    return { success: true, value: versionResult.value };
  }
}
