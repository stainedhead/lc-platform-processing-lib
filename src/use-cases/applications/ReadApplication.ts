/**
 * ReadApplication Use Case
 * Retrieves an application configuration from storage (FR-008)
 */

import { Result, ConfigurationError } from '../../domain/types';
import { Application, StoredApplicationData } from '../../domain/entities/Application';
import { StoragePath } from '../../domain/value-objects/StoragePath';
import { IStorageProvider } from '../ports';
import type { ApplicationIdentifier } from '../types';

export class ReadApplication {
  constructor(private readonly storage: IStorageProvider) {}

  async execute(params: ApplicationIdentifier): Promise<Result<Application, ConfigurationError>> {
    const storagePathResult = StoragePath.forApplication(
      params.account,
      params.team,
      params.moniker
    );
    if (!storagePathResult.success) {
      return { success: false, error: ConfigurationError.ValidationFailed };
    }

    const path = storagePathResult.value.appConfigPath;
    const readResult = await this.storage.read<StoredApplicationData>(path);

    if (!readResult.success) {
      return { success: false, error: ConfigurationError.NotFound };
    }

    const appResult = Application.fromStorage(readResult.value);
    if (!appResult.success) {
      return { success: false, error: ConfigurationError.InvalidFormat };
    }

    return { success: true, value: appResult.value };
  }
}
