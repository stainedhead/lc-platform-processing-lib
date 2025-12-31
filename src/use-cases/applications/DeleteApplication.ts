/**
 * DeleteApplication Use Case
 * Removes an application configuration from storage (FR-007)
 */

import { Result, ConfigurationError } from '../../domain/types';
import { StoragePath } from '../../domain/value-objects/StoragePath';
import { IStorageProvider } from '../ports';
import type { ApplicationIdentifier } from '../types';

export class DeleteApplication {
  constructor(private readonly storage: IStorageProvider) {}

  async execute(params: ApplicationIdentifier): Promise<Result<void, ConfigurationError>> {
    const storagePathResult = StoragePath.forApplication(
      params.account,
      params.team,
      params.moniker
    );
    if (!storagePathResult.success) {
      return { success: false, error: ConfigurationError.ValidationFailed };
    }

    const path = storagePathResult.value.appConfigPath;
    const deleteResult = await this.storage.delete(path);

    if (!deleteResult.success) {
      return { success: false, error: ConfigurationError.StorageError };
    }

    return { success: true, value: undefined };
  }
}
