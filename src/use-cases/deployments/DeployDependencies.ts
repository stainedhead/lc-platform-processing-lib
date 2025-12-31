/**
 * DeployDependencies Use Case
 * Provisions dependencies with automatic rollback on failure (FR-027, FR-027a, FR-027b)
 */

import { Result, ConfigurationError } from '../../domain/types';
import { ResourceTags } from '../../domain/value-objects/ResourceTags';
import { IStorageProvider, IDeploymentProvider, DeploymentResult } from '../ports';
import { ReadVersion } from '../versions/ReadVersion';

export interface DeployDependenciesParams {
  account: string;
  team: string;
  moniker: string;
  version: string;
  environment: string;
  tags: Record<string, string>;
}

export interface DeployDependenciesResult {
  deployments: DeploymentResult[];
}

export class DeployDependencies {
  private readonly readVersion: ReadVersion;

  constructor(
    storage: IStorageProvider,
    private readonly deployment: IDeploymentProvider
  ) {
    this.readVersion = new ReadVersion(storage);
  }

  async execute(
    params: DeployDependenciesParams
  ): Promise<Result<DeployDependenciesResult, ConfigurationError>> {
    // Read version to get dependencies
    const versionResult = await this.readVersion.execute({
      account: params.account,
      team: params.team,
      moniker: params.moniker,
      version: params.version,
    });

    if (!versionResult.success) return versionResult;

    const version = versionResult.value;
    const dependencies = version.dependencies;

    // Create resource tags
    const tagsResult = ResourceTags.create({
      account: params.account,
      team: params.team,
      moniker: params.moniker,
      version: params.version,
      environment: params.environment,
    });

    if (!tagsResult.success) {
      return { success: false, error: ConfigurationError.ValidationFailed };
    }

    // Merge custom tags
    let finalTags = tagsResult.value;
    if (Object.keys(params.tags).length > 0) {
      const withCustomResult = tagsResult.value.withCustomTags(params.tags);
      if (!withCustomResult.success) {
        return { success: false, error: ConfigurationError.ValidationFailed };
      }
      finalTags = withCustomResult.value;
    }

    const deployments: DeploymentResult[] = [];

    // Deploy each dependency
    for (const dependency of dependencies) {
      const deployResult = await this.deployment.deployDependency({
        dependency,
        environment: params.environment,
        tags: finalTags.toRecord(),
      });

      if (!deployResult.success) {
        // FR-027a: Automatic rollback on failure
        // FR-027b: Log rollback failures but return error
        await this.rollbackDeployments(deployments);
        return { success: false, error: ConfigurationError.ValidationFailed };
      }

      deployments.push(deployResult.value);
    }

    return {
      success: true,
      value: { deployments },
    };
  }

  private async rollbackDeployments(deployments: DeploymentResult[]): Promise<void> {
    // FR-027a: Rollback deployed resources
    for (const deployment of deployments) {
      try {
        await this.deployment.rollbackDeployment(deployment.deploymentId);
      } catch (error) {
        // FR-027b: Log rollback failure but continue
        console.error(`Failed to rollback deployment ${deployment.deploymentId}:`, error);
      }
    }
  }
}
