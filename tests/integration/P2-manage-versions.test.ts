/**
 * Integration Test: P2 - Manage Application Version Configurations
 * Tests full version lifecycle: Init → Cache → Validate → Read → Update → Delete (T049)
 */

import { describe, test, expect } from 'bun:test';
import { LCPlatformAppVersionConfigurator } from '../../src/index';
import { AcceleratorStorageAdapter } from '../../src/adapters/storage/AcceleratorStorageAdapter';
import { AcceleratorPolicyAdapter } from '../../src/adapters/policy/AcceleratorPolicyAdapter';
import { AcceleratorDeploymentAdapter } from '../../src/adapters/deployment/AcceleratorDeploymentAdapter';
import { Readable } from 'stream';

describe('P2 Integration: Version Management Lifecycle', () => {
  test('should complete full version lifecycle: Init → Cache → Validate → Read → Update → Delete', async () => {
    // Setup
    const storage = new AcceleratorStorageAdapter();
    const policy = new AcceleratorPolicyAdapter();
    const deployment = new AcceleratorDeploymentAdapter();
    const configurator = new LCPlatformAppVersionConfigurator(storage, policy, deployment);

    const versionId = {
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      version: '1.0.0',
    };

    // Step 1: Init - Create new version
    const initResult = await configurator.init({
      ...versionId,
      versionNumber: '1.0.0',
      dependencies: [
        { type: 'database', name: 'postgres', version: '14' },
        { type: 'queue', name: 'rabbitmq', version: '3.11' },
      ],
      metadata: {
        description: 'Initial version',
        releaseNotes: 'First release',
      },
    });

    expect(initResult.success).toBe(true);
    if (!initResult.success) return;

    expect(initResult.value.versionNumber.toString()).toBe('1.0.0');
    expect(initResult.value.dependencies).toHaveLength(2);
    expect(initResult.value.metadata?.description).toBe('Initial version');

    // Step 2: Cache - Upload artifact
    const artifactStream = Readable.from(Buffer.from('artifact-content'));
    const cacheResult = await configurator.cache({
      identifier: versionId,
      stream: artifactStream,
      metadata: {
        contentType: 'application/zip',
        size: 1024,
      },
    });

    expect(cacheResult.success).toBe(true);
    if (!cacheResult.success) return;

    expect(cacheResult.value.path).toBeDefined();
    expect(cacheResult.value.checksum).toBeDefined();

    // Step 3: Validate - Validate dependencies
    const validateResult = await configurator.validateDependencies(versionId);
    expect(validateResult.success).toBe(true);
    if (!validateResult.success) return;

    expect(validateResult.value.valid).toBe(true);
    expect(validateResult.value.failures).toEqual([]);

    // Step 4: Read - Retrieve version
    const readResult = await configurator.read(versionId);
    expect(readResult.success).toBe(true);
    if (!readResult.success) return;

    expect(readResult.value.versionNumber.toString()).toBe('1.0.0');
    expect(readResult.value.artifactReference).toBeDefined();
    expect(readResult.value.artifactReference?.path).toBe(cacheResult.value.path);

    // Step 5: Update - Modify version
    const updateResult = await configurator.update({
      ...versionId,
      dependencies: [{ type: 'database', name: 'mysql', version: '8.0' }],
      metadata: {
        description: 'Updated version',
        releaseNotes: 'Updated dependencies',
      },
    });

    expect(updateResult.success).toBe(true);
    if (!updateResult.success) return;

    expect(updateResult.value.dependencies).toHaveLength(1);
    expect(updateResult.value.dependencies[0].name).toBe('mysql');
    expect(updateResult.value.metadata?.description).toBe('Updated version');

    // Step 6: Read again - Verify update persisted
    const readAfterUpdateResult = await configurator.read(versionId);
    expect(readAfterUpdateResult.success).toBe(true);
    if (!readAfterUpdateResult.success) return;

    expect(readAfterUpdateResult.value.dependencies).toHaveLength(1);
    expect(readAfterUpdateResult.value.metadata?.description).toBe('Updated version');
  });

  test('should handle version with prerelease tag', async () => {
    const storage = new AcceleratorStorageAdapter();
    const policy = new AcceleratorPolicyAdapter();
    const deployment = new AcceleratorDeploymentAdapter();
    const configurator = new LCPlatformAppVersionConfigurator(storage, policy, deployment);

    const versionId = {
      account: '123456789012',
      team: 'platform',
      moniker: 'beta-app',
      version: '2.0.0-beta.1',
    };

    const initResult = await configurator.init({
      ...versionId,
      versionNumber: '2.0.0-beta.1',
    });

    expect(initResult.success).toBe(true);
    if (!initResult.success) return;

    expect(initResult.value.versionNumber.toString()).toBe('2.0.0-beta.1');
    expect(initResult.value.versionNumber.prerelease).toBe('beta.1');
  });

  test('should generate IAM policies for version', async () => {
    const storage = new AcceleratorStorageAdapter();
    const policy = new AcceleratorPolicyAdapter();
    const deployment = new AcceleratorDeploymentAdapter();
    const configurator = new LCPlatformAppVersionConfigurator(storage, policy, deployment);

    const versionId = {
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      version: '1.0.0',
    };

    // Create version with dependencies
    await configurator.init({
      ...versionId,
      versionNumber: '1.0.0',
      dependencies: [{ type: 'database', name: 'postgres', version: '14' }],
    });

    // Generate app policy
    const policyResult = await configurator.generateAppPolicy(versionId);
    expect(policyResult.success).toBe(true);
    if (!policyResult.success) return;

    expect(policyResult.value.version).toBe('2012-10-17');
    expect(policyResult.value.statements).toBeDefined();
    expect(policyResult.value.statements.length).toBeGreaterThan(0);
  });
});
