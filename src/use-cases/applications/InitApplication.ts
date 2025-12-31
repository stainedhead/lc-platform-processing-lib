/**
 * InitApplication Use Case
 *
 * Creates a new application configuration
 * Business Rule: Prevents overwriting existing configurations (FR-004)
 */

import { Result, ConfigurationError } from '../../domain/types';
import { Application } from '../../domain/entities/Application';
import { TeamMoniker } from '../../domain/value-objects/TeamMoniker';
import { StoragePath } from '../../domain/value-objects/StoragePath';
import { IStorageProvider } from '../ports';
import type { InitApplicationParams } from '../types';

export class InitApplication {
  constructor(private readonly storage: IStorageProvider) {}

  async execute(params: InitApplicationParams): Promise<Result<Application, ConfigurationError>> {
    // Create TeamMoniker
    const teamMonikerResult = TeamMoniker.create(params.team, params.moniker);
    if (!teamMonikerResult.success) {
      return { success: false, error: ConfigurationError.ValidationFailed };
    }

    // Create StoragePath
    const storagePathResult = StoragePath.forApplication(
      params.account,
      params.team,
      params.moniker
    );
    if (!storagePathResult.success) {
      return { success: false, error: ConfigurationError.ValidationFailed };
    }

    // Check if already exists (FR-004: prevent overwrite)
    const path = storagePathResult.value.appConfigPath;
    const exists = await this.storage.exists(path);
    if (exists) {
      return { success: false, error: ConfigurationError.AlreadyExists };
    }

    // Create Application entity
    const appResult = Application.create({
      account: params.account,
      teamMoniker: teamMonikerResult.value,
      storagePath: storagePathResult.value,
      metadata: params.metadata,
    });

    if (!appResult.success) {
      return { success: false, error: ConfigurationError.ValidationFailed };
    }

    // Persist to storage
    const writeResult = await this.storage.write(path, appResult.value.toStorageFormat());
    if (!writeResult.success) {
      return { success: false, error: ConfigurationError.StorageError };
    }

    return { success: true, value: appResult.value };
  }
}
