/**
 * Version Entity (Aggregate Root)
 * Represents a specific version of an application
 */

import { Result, ValidationError, VersionMetadata } from '../types';
import { AppId } from '../value-objects/AppId';
import { VersionNumber } from '../value-objects/VersionNumber';
import { StoragePath } from '../value-objects/StoragePath';
import {
  DependencyConfiguration,
  ArtifactReference,
  PolicyReferences,
} from '../../use-cases/ports';

export interface CreateVersionParams {
  applicationId: AppId;
  versionNumber: VersionNumber;
  storagePath: StoragePath;
  dependencies?: DependencyConfiguration[];
  metadata?: VersionMetadata;
}

export interface StoredVersionData {
  id: string;
  applicationId: string;
  versionNumber: string;
  dependencies: DependencyConfiguration[];
  artifactReference?: ArtifactReference;
  policyReferences?: PolicyReferences;
  metadata?: VersionMetadata;
  createdAt: string;
  updatedAt: string;
}

export class Version {
  private constructor(
    public readonly id: string,
    public readonly applicationId: AppId,
    public readonly versionNumber: VersionNumber,
    public readonly storagePath: StoragePath,
    public dependencies: DependencyConfiguration[],
    private _artifactReference: ArtifactReference | undefined,
    private _policyReferences: PolicyReferences,
    public metadata: VersionMetadata | undefined,
    public readonly createdAt: Date,
    private _updatedAt: Date
  ) {}

  get updatedAt(): Date {
    return this._updatedAt;
  }

  get artifactReference(): ArtifactReference | undefined {
    return this._artifactReference;
  }

  get policyReferences(): PolicyReferences {
    return this._policyReferences;
  }

  static create(params: CreateVersionParams): Result<Version, ValidationError> {
    const now = new Date();
    const version = new Version(
      crypto.randomUUID(),
      params.applicationId,
      params.versionNumber,
      params.storagePath,
      params.dependencies || [],
      undefined,
      {},
      params.metadata,
      now,
      now
    );

    return { success: true, value: version };
  }

  static fromStorage(data: StoredVersionData): Result<Version, ValidationError> {
    const appIdResult = AppId.fromString(data.applicationId);
    if (!appIdResult.success) return appIdResult;

    const versionNumberResult = VersionNumber.parse(data.versionNumber);
    if (!versionNumberResult.success) return versionNumberResult;

    const version = new Version(
      data.id,
      appIdResult.value,
      versionNumberResult.value,
      {} as StoragePath, // Reconstructed from storage context
      data.dependencies,
      data.artifactReference,
      data.policyReferences || {},
      data.metadata,
      new Date(data.createdAt),
      new Date(data.updatedAt)
    );

    return { success: true, value: version };
  }

  update(params: {
    dependencies?: DependencyConfiguration[];
    metadata?: VersionMetadata;
  }): Result<void, ValidationError> {
    if (params.dependencies) {
      this.dependencies = params.dependencies;
    }
    if (params.metadata) {
      this.metadata = params.metadata;
    }
    this._updatedAt = new Date();
    return { success: true, value: undefined };
  }

  cacheArtifact(artifact: ArtifactReference): Result<void, ValidationError> {
    if (this._artifactReference) {
      return { success: false, error: ValidationError.InvalidValue };
    }
    this._artifactReference = artifact;
    this._updatedAt = new Date();
    return { success: true, value: undefined };
  }

  setPolicyReferences(refs: PolicyReferences): void {
    this._policyReferences = refs;
    this._updatedAt = new Date();
  }

  toStorageFormat(): StoredVersionData {
    return {
      id: this.id,
      applicationId: this.applicationId.toString(),
      versionNumber: this.versionNumber.toString(),
      dependencies: this.dependencies,
      artifactReference: this._artifactReference,
      policyReferences: this._policyReferences,
      metadata: this.metadata,
      createdAt: this.createdAt.toISOString(),
      updatedAt: this._updatedAt.toISOString(),
    };
  }
}
