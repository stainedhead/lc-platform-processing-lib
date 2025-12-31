/**
 * Deployment Entity (Aggregate Root)
 * Links Version to Environment, manages deployment state machine, resource tagging
 */

import { Result, ValidationError } from '../types';
import { DeploymentStatus, DeploymentStatusType } from '../value-objects/DeploymentStatus';
import { ResourceTags } from '../value-objects/ResourceTags';

export interface CreateDeploymentParams {
  versionId: string;
  environment: string;
  status: DeploymentStatus;
  tags: ResourceTags;
}

export interface DeployedResource {
  type: string;
  id: string;
  arn: string;
}

export interface StoredDeploymentData {
  id: string;
  versionId: string;
  environment: string;
  status: DeploymentStatusType;
  tags: Record<string, string>;
  deployedResources: DeployedResource[];
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  failureReason?: string;
}

export class Deployment {
  private constructor(
    public readonly id: string,
    public readonly versionId: string,
    public readonly environment: string,
    private _status: DeploymentStatus,
    public readonly tags: ResourceTags,
    private _deployedResources: DeployedResource[],
    public readonly createdAt: Date,
    private _startedAt: Date | undefined,
    private _completedAt: Date | undefined,
    private _failureReason: string | undefined
  ) {}

  get status(): DeploymentStatus {
    return this._status;
  }

  get deployedResources(): DeployedResource[] {
    return [...this._deployedResources];
  }

  get startedAt(): Date | undefined {
    return this._startedAt;
  }

  get completedAt(): Date | undefined {
    return this._completedAt;
  }

  get failureReason(): string | undefined {
    return this._failureReason;
  }

  static create(params: CreateDeploymentParams): Result<Deployment, ValidationError> {
    const now = new Date();
    const deployment = new Deployment(
      crypto.randomUUID(),
      params.versionId,
      params.environment,
      params.status,
      params.tags,
      [],
      now,
      undefined,
      undefined,
      undefined
    );

    return { success: true, value: deployment };
  }

  /**
   * Update deployment status with state machine validation
   * Terminal states (completed, failed) cannot be changed
   */
  updateStatus(newStatus: DeploymentStatus, failureReason?: string): Result<void, ValidationError> {
    // Terminal states cannot be changed
    if (this._status.isTerminal()) {
      return { success: false, error: ValidationError.InvalidValue };
    }

    this._status = newStatus;

    // Track timestamps
    if (newStatus.isInProgress() && !this._startedAt) {
      this._startedAt = new Date();
    }

    if (newStatus.isCompleted()) {
      this._completedAt = new Date();
    }

    if (newStatus.isFailed()) {
      this._completedAt = new Date();
      this._failureReason = failureReason;
    }

    return { success: true, value: undefined };
  }

  addDeployedResource(resource: DeployedResource): void {
    this._deployedResources.push(resource);
  }

  toStorageFormat(): StoredDeploymentData {
    return {
      id: this.id,
      versionId: this.versionId,
      environment: this.environment,
      status: this._status.status,
      tags: this.tags.toRecord(),
      deployedResources: this._deployedResources,
      createdAt: this.createdAt.toISOString(),
      startedAt: this._startedAt?.toISOString(),
      completedAt: this._completedAt?.toISOString(),
      failureReason: this._failureReason,
    };
  }

  static fromStorage(data: StoredDeploymentData): Result<Deployment, ValidationError> {
    const statusResult = DeploymentStatus.create(data.status);
    if (!statusResult.success) return statusResult;

    const tagsResult = ResourceTags.create({
      account: data.tags['lc:account'] || '',
      team: data.tags['lc:team'] || '',
      moniker: data.tags['lc:application'] || '',
      version: data.tags['lc:version'] || '',
      environment: data.environment,
    });
    if (!tagsResult.success) return tagsResult;

    // Re-apply custom tags if any
    const standardTagKeys = [
      'lc:account',
      'lc:team',
      'lc:application',
      'lc:version',
      'lc:environment',
      'lc:managed-by',
    ];
    const customTags: Record<string, string> = {};
    for (const [key, value] of Object.entries(data.tags)) {
      if (!standardTagKeys.includes(key)) {
        customTags[key] = value;
      }
    }

    let finalTags = tagsResult.value;
    if (Object.keys(customTags).length > 0) {
      const withCustomResult = tagsResult.value.withCustomTags(customTags);
      if (!withCustomResult.success) return withCustomResult;
      finalTags = withCustomResult.value;
    }

    const deployment = new Deployment(
      data.id,
      data.versionId,
      data.environment,
      statusResult.value,
      finalTags,
      data.deployedResources,
      new Date(data.createdAt),
      data.startedAt ? new Date(data.startedAt) : undefined,
      data.completedAt ? new Date(data.completedAt) : undefined,
      data.failureReason
    );

    return { success: true, value: deployment };
  }
}
