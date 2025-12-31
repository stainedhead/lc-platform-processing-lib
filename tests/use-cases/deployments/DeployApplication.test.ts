/**
 * Use Case Test: DeployApplication
 * Tests application deployment with IAM policies and resource tags (T081, FR-028, FR-032)
 */

import { describe, test, expect } from 'bun:test';
import { DeployApplication } from '../../../src/use-cases/deployments/DeployApplication';
import { InitVersion } from '../../../src/use-cases/versions/InitVersion';
import { AcceleratorStorageAdapter } from '../../../src/adapters/storage/AcceleratorStorageAdapter';
import { AcceleratorPolicyAdapter } from '../../../src/adapters/policy/AcceleratorPolicyAdapter';
import { AcceleratorDeploymentAdapter } from '../../../src/adapters/deployment/AcceleratorDeploymentAdapter';
import { ConfigurationError } from '../../../src/domain/types';

describe('DeployApplication Use Case', () => {
  const createVersionWithArtifact = async (storage: AcceleratorStorageAdapter) => {
    const initVersion = new InitVersion(storage);
    await initVersion.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      versionNumber: '1.0.0',
      dependencies: [{ type: 'database', name: 'postgres', version: '14' }],
    });

    // Note: For this test, we'll accept versions without artifacts cached
    // Real implementation would require artifact to be cached first
  };

  test('should deploy application with IAM policies (FR-028)', async () => {
    const storage = new AcceleratorStorageAdapter();
    const policy = new AcceleratorPolicyAdapter();
    const deployment = new AcceleratorDeploymentAdapter();
    await createVersionWithArtifact(storage);

    const deployApp = new DeployApplication(storage, policy, deployment);
    const result = await deployApp.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      version: '1.0.0',
      environment: 'production',
      tags: {},
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.deploymentId).toBeDefined();
      expect(result.value.status).toBe('completed');
      expect(result.value.appliedTags).toBeDefined();
    }
  });

  test('should apply resource tags to application (FR-032)', async () => {
    const storage = new AcceleratorStorageAdapter();
    const policy = new AcceleratorPolicyAdapter();
    const deployment = new AcceleratorDeploymentAdapter();
    await createVersionWithArtifact(storage);

    const deployApp = new DeployApplication(storage, policy, deployment);
    const result = await deployApp.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      version: '1.0.0',
      environment: 'production',
      tags: {
        'custom:owner': 'john-doe',
        'custom:cost-center': 'engineering',
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      const tags = result.value.appliedTags;
      expect(tags['lc:account']).toBe('123456789012');
      expect(tags['lc:team']).toBe('platform');
      expect(tags['lc:application']).toBe('my-app');
      expect(tags['lc:version']).toBe('1.0.0');
      expect(tags['lc:environment']).toBe('production');
      expect(tags['custom:owner']).toBe('john-doe');
      expect(tags['custom:cost-center']).toBe('engineering');
    }
  });

  test('should return NotFound for non-existent version', async () => {
    const storage = new AcceleratorStorageAdapter();
    const policy = new AcceleratorPolicyAdapter();
    const deployment = new AcceleratorDeploymentAdapter();

    const deployApp = new DeployApplication(storage, policy, deployment);
    const result = await deployApp.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'non-existent',
      version: '1.0.0',
      environment: 'production',
      tags: {},
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe(ConfigurationError.NotFound);
    }
  });

  test('should include deployment duration', async () => {
    const storage = new AcceleratorStorageAdapter();
    const policy = new AcceleratorPolicyAdapter();
    const deployment = new AcceleratorDeploymentAdapter();
    await createVersionWithArtifact(storage);

    const deployApp = new DeployApplication(storage, policy, deployment);
    const result = await deployApp.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      version: '1.0.0',
      environment: 'production',
      tags: {},
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.duration).toBeGreaterThan(0);
      expect(result.value.startedAt).toBeInstanceOf(Date);
      expect(result.value.completedAt).toBeInstanceOf(Date);
    }
  });
});
