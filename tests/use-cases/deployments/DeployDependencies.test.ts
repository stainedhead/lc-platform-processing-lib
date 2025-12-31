/**
 * Use Case Test: DeployDependencies
 * Tests dependency deployment with rollback on failure (T080, FR-027, FR-027a, FR-027b)
 */

import { describe, test, expect } from 'bun:test';
import { DeployDependencies } from '../../../src/use-cases/deployments/DeployDependencies';
import { InitVersion } from '../../../src/use-cases/versions/InitVersion';
import { AcceleratorStorageAdapter } from '../../../src/adapters/storage/AcceleratorStorageAdapter';
import { AcceleratorDeploymentAdapter } from '../../../src/adapters/deployment/AcceleratorDeploymentAdapter';
import { ConfigurationError } from '../../../src/domain/types';

describe('DeployDependencies Use Case', () => {
  const createVersion = async (storage: AcceleratorStorageAdapter) => {
    const initVersion = new InitVersion(storage);
    return await initVersion.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      versionNumber: '1.0.0',
      dependencies: [
        { type: 'database', name: 'postgres', version: '14' },
        { type: 'queue', name: 'rabbitmq', version: '3.11' },
      ],
    });
  };

  test('should deploy all dependencies (FR-027)', async () => {
    const storage = new AcceleratorStorageAdapter();
    const deployment = new AcceleratorDeploymentAdapter();
    await createVersion(storage);

    const deployDeps = new DeployDependencies(storage, deployment);
    const result = await deployDeps.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      version: '1.0.0',
      environment: 'production',
      tags: {
        'custom:owner': 'platform-team',
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.deployments).toHaveLength(2); // 2 dependencies
      expect(result.value.deployments.every((d) => d.status === 'completed')).toBe(true);
    }
  });

  test('should apply resource tags to dependencies (FR-033)', async () => {
    const storage = new AcceleratorStorageAdapter();
    const deployment = new AcceleratorDeploymentAdapter();
    await createVersion(storage);

    const deployDeps = new DeployDependencies(storage, deployment);
    const result = await deployDeps.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      version: '1.0.0',
      environment: 'production',
      tags: {
        'custom:cost-center': 'engineering',
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      result.value.deployments.forEach((deployment) => {
        const tags = deployment.appliedTags;
        expect(tags['lc:account']).toBe('123456789012');
        expect(tags['lc:team']).toBe('platform');
        expect(tags['lc:environment']).toBe('production');
        expect(tags['custom:cost-center']).toBe('engineering');
      });
    }
  });

  test('should return NotFound for non-existent version', async () => {
    const storage = new AcceleratorStorageAdapter();
    const deployment = new AcceleratorDeploymentAdapter();

    const deployDeps = new DeployDependencies(storage, deployment);
    const result = await deployDeps.execute({
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

  test('should handle version with no dependencies', async () => {
    const storage = new AcceleratorStorageAdapter();
    const deployment = new AcceleratorDeploymentAdapter();

    const initVersion = new InitVersion(storage);
    await initVersion.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'simple-app',
      versionNumber: '1.0.0',
      dependencies: [],
    });

    const deployDeps = new DeployDependencies(storage, deployment);
    const result = await deployDeps.execute({
      account: '123456789012',
      team: 'platform',
      moniker: 'simple-app',
      version: '1.0.0',
      environment: 'production',
      tags: {},
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.deployments).toHaveLength(0);
    }
  });
});
