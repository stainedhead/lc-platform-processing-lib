/**
 * ValidateApplication Use Case
 * Provides Exists, NeedsUpdate, and Validate operations (FR-009, FR-010, FR-011)
 */

import { Result, ConfigurationError, ValidationError } from '../../domain/types';
import { StoragePath } from '../../domain/value-objects/StoragePath';
import { IStorageProvider } from '../ports';
import type { ApplicationIdentifier } from '../types';
import type { ValidationReport } from '../types';
import { ReadApplication } from './ReadApplication';

export class ValidateApplication {
  private readonly readApp: ReadApplication;

  constructor(private readonly storage: IStorageProvider) {
    this.readApp = new ReadApplication(storage);
  }

  /**
   * FR-009: Check if application exists
   */
  async exists(params: ApplicationIdentifier): Promise<boolean> {
    const storagePathResult = StoragePath.forApplication(
      params.account,
      params.team,
      params.moniker
    );
    if (!storagePathResult.success) {
      return false;
    }

    return await this.storage.exists(storagePathResult.value.appConfigPath);
  }

  /**
   * FR-010: Check if application needs update (compares timestamps)
   */
  async needsUpdate(
    params: ApplicationIdentifier,
    localUpdatedAt: Date
  ): Promise<Result<boolean, ConfigurationError>> {
    const readResult = await this.readApp.execute(params);
    if (!readResult.success) {
      return readResult;
    }

    const needsUpdate = readResult.value.updatedAt > localUpdatedAt;
    return { success: true, value: needsUpdate };
  }

  /**
   * FR-011: Validate application configuration
   */
  async validate(
    params: ApplicationIdentifier
  ): Promise<Result<ValidationReport, ValidationError>> {
    const readResult = await this.readApp.execute(params);

    if (!readResult.success) {
      return {
        success: false,
        error: ValidationError.InvalidFormat,
      };
    }

    // Application is valid if it was successfully read and reconstructed
    return {
      success: true,
      value: {
        valid: true,
        failures: [],
      },
    };
  }
}
