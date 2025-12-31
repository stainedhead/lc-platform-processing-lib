/**
 * Application Entity (Aggregate Root)
 *
 * Represents a deployable application registered in the platform
 * Encapsulates business rules for application configuration
 */

import { Result, ValidationError, ApplicationMetadata } from '../types';
import { AppId } from '../value-objects/AppId';
import { TeamMoniker } from '../value-objects/TeamMoniker';
import { StoragePath } from '../value-objects/StoragePath';

/**
 * Parameters for creating a new Application
 */
export interface CreateApplicationParams {
  account: string;
  teamMoniker: TeamMoniker;
  storagePath: StoragePath;
  metadata?: ApplicationMetadata;
}

/**
 * Storage format for Application persistence
 */
export interface StoredApplicationData {
  id: string;
  account: string;
  team: string;
  moniker: string;
  metadata?: ApplicationMetadata;
  createdAt: string; // ISO 8601
  updatedAt: string; // ISO 8601
}

/**
 * Application Entity
 * Aggregate root for application configuration
 */
export class Application {
  /** Private constructor - use factory methods */
  private constructor(
    public readonly id: AppId,
    public readonly account: string,
    public readonly teamMoniker: TeamMoniker,
    public readonly storagePath: StoragePath,
    public metadata: ApplicationMetadata | undefined,
    public readonly createdAt: Date,
    private _updatedAt: Date
  ) {}

  /** Getter for updatedAt (can be modified by update()) */
  public get updatedAt(): Date {
    return this._updatedAt;
  }

  /**
   * Create a new Application
   * Validates business rules
   */
  public static create(params: CreateApplicationParams): Result<Application, ValidationError> {
    // Validate account
    if (!params.account || params.account.length === 0) {
      return {
        success: false,
        error: ValidationError.MissingRequired,
      };
    }

    // Validate metadata if provided
    if (params.metadata) {
      if (params.metadata.displayName && params.metadata.displayName.length === 0) {
        return { success: false, error: ValidationError.InvalidValue };
      }
      if (params.metadata.description && params.metadata.description.length === 0) {
        return { success: false, error: ValidationError.InvalidValue };
      }
      if (params.metadata.owner && params.metadata.owner.length === 0) {
        return { success: false, error: ValidationError.InvalidValue };
      }
    }

    const appIdResult = AppId.generate();
    if (!appIdResult.success) {
      return appIdResult;
    }

    const now = new Date();
    const application = new Application(
      appIdResult.value,
      params.account,
      params.teamMoniker,
      params.storagePath,
      params.metadata,
      now,
      now
    );

    return {
      success: true,
      value: application,
    };
  }

  /**
   * Reconstruct Application from storage
   */
  public static fromStorage(data: StoredApplicationData): Result<Application, ValidationError> {
    // Reconstruct AppId
    const appIdResult = AppId.fromString(data.id);
    if (!appIdResult.success) {
      return appIdResult;
    }

    // Reconstruct TeamMoniker
    const teamMonikerResult = TeamMoniker.create(data.team, data.moniker);
    if (!teamMonikerResult.success) {
      return teamMonikerResult;
    }

    // Reconstruct StoragePath
    const storagePathResult = StoragePath.forApplication(data.account, data.team, data.moniker);
    if (!storagePathResult.success) {
      return storagePathResult;
    }

    const application = new Application(
      appIdResult.value,
      data.account,
      teamMonikerResult.value,
      storagePathResult.value,
      data.metadata,
      new Date(data.createdAt),
      new Date(data.updatedAt)
    );

    return {
      success: true,
      value: application,
    };
  }

  /**
   * Update application metadata
   * Updates updatedAt timestamp
   */
  public update(metadata: ApplicationMetadata): Result<void, ValidationError> {
    // Validate metadata
    if (metadata.displayName && metadata.displayName.length === 0) {
      return { success: false, error: ValidationError.InvalidValue };
    }
    if (metadata.description && metadata.description.length === 0) {
      return { success: false, error: ValidationError.InvalidValue };
    }
    if (metadata.owner && metadata.owner.length === 0) {
      return { success: false, error: ValidationError.InvalidValue };
    }

    this.metadata = metadata;
    this._updatedAt = new Date();

    return { success: true, value: undefined };
  }

  /**
   * Check equality by AppId
   */
  public equals(other: Application): boolean {
    return this.id.equals(other.id);
  }

  /**
   * Serialize to storage format
   */
  public toStorageFormat(): StoredApplicationData {
    return {
      id: this.id.toString(),
      account: this.account,
      team: this.teamMoniker.team,
      moniker: this.teamMoniker.moniker,
      metadata: this.metadata,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
