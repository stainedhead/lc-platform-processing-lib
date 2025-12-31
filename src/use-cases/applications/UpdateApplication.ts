/**
 * UpdateApplication Use Case
 * Updates an existing application configuration (FR-005, FR-006)
 */

import { Result, ConfigurationError } from '../../domain/types';
import { Application } from '../../domain/entities/Application';
import { StoragePath } from '../../domain/value-objects/StoragePath';
import { IStorageProvider } from '../ports';
import type { UpdateApplicationParams } from '../types';
import { ReadApplication } from './ReadApplication';

export class UpdateApplication {
  private readonly readApp: ReadApplication;

  constructor(private readonly storage: IStorageProvider) {
    this.readApp = new ReadApplication(storage);
  }

  async execute(params: UpdateApplicationParams): Promise<Result<Application, ConfigurationError>> {
    // Read existing application (FR-006: verify exists)
    const readResult = await this.readApp.execute({
      account: params.account,
      team: params.team,
      moniker: params.moniker,
    });

    if (!readResult.success) {
      return readResult;
    }

    const app = readResult.value;

    // Update metadata (FR-005: modify existing)
    const updateResult = app.update(params.metadata);
    if (!updateResult.success) {
      return { success: false, error: ConfigurationError.ValidationFailed };
    }

    // Persist updated application
    const storagePathResult = StoragePath.forApplication(
      params.account,
      params.team,
      params.moniker
    );
    if (!storagePathResult.success) {
      return { success: false, error: ConfigurationError.ValidationFailed };
    }

    const writeResult = await this.storage.write(
      storagePathResult.value.appConfigPath,
      app.toStorageFormat()
    );

    if (!writeResult.success) {
      return { success: false, error: ConfigurationError.StorageError };
    }

    return { success: true, value: app };
  }
}
