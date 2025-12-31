/**
 * DeployApplication Use Case
 * Deploys application with IAM policies and resource tags (FR-028, FR-032)
 */

import { Result, ConfigurationError } from '../../domain/types';
import { ResourceTags } from '../../domain/value-objects/ResourceTags';
import { IStorageProvider, IPolicyProvider, IDeploymentProvider, DeploymentResult } from '../ports';
import { ReadVersion } from '../versions/ReadVersion';

export interface DeployApplicationParams {
  account: string;
  team: string;
  moniker: string;
  version: string;
  environment: string;
  tags: Record<string, string>;
}

export class DeployApplication {
  private readonly readVersion: ReadVersion;

  constructor(
    storage: IStorageProvider,
    private readonly policy: IPolicyProvider,
    private readonly deployment: IDeploymentProvider
  ) {
    this.readVersion = new ReadVersion(storage);
  }

  async execute(
    params: DeployApplicationParams
  ): Promise<Result<DeploymentResult, ConfigurationError>> {
    // Read version
    const versionResult = await this.readVersion.execute({
      account: params.account,
      team: params.team,
      moniker: params.moniker,
      version: params.version,
    });

    if (!versionResult.success) return versionResult;

    const version = versionResult.value;

    // Generate IAM policy for application (FR-028)
    const policyResult = await this.policy.generateAppPolicy(version.dependencies);
    if (!policyResult.success) {
      return { success: false, error: ConfigurationError.ValidationFailed };
    }

    // Create resource tags (FR-032)
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

    // Deploy application with policy and tags
    const deployResult = await this.deployment.deployApplication({
      artifactPath: version.artifactReference?.path || '',
      policyDocument: policyResult.value,
      environment: params.environment,
      tags: finalTags.toRecord(),
    });

    if (!deployResult.success) {
      return { success: false, error: ConfigurationError.ValidationFailed };
    }

    return { success: true, value: deployResult.value };
  }
}
