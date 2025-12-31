/**
 * AcceleratorPolicyAdapter
 * Implements IPolicyProvider (stub until accelerators available)
 */

import { Result } from '../../domain/types';
import {
  IPolicyProvider,
  DependencyConfiguration,
  PolicyDocument,
  PolicyStatement,
} from '../../use-cases/ports';

export class AcceleratorPolicyAdapter implements IPolicyProvider {
  async generateAppPolicy(
    dependencies: DependencyConfiguration[]
  ): Promise<Result<PolicyDocument, Error>> {
    const statements: PolicyStatement[] = dependencies.map((dep) => ({
      effect: 'Allow' as const,
      actions: [`${dep.type}:*`],
      resources: [`arn:*:${dep.type}:*:*:${dep.name}`],
    }));

    return {
      success: true,
      value: {
        version: '2012-10-17',
        statements,
      },
    };
  }

  async generateCICDPolicy(
    dependencies: DependencyConfiguration[]
  ): Promise<Result<PolicyDocument, Error>> {
    const statements: PolicyStatement[] = dependencies.map((dep) => ({
      effect: 'Allow' as const,
      actions: [`${dep.type}:Create`, `${dep.type}:Update`, `${dep.type}:Delete`],
      resources: [`arn:*:${dep.type}:*:*:*`],
    }));

    return {
      success: true,
      value: {
        version: '2012-10-17',
        statements,
      },
    };
  }

  serializePolicy(policy: PolicyDocument): string {
    return JSON.stringify(policy, null, 2);
  }
}
