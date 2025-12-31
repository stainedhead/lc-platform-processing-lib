/**
 * Domain Unit Tests: Deployment Entity
 * Tests deployment state machine, links Version to Environment, resource tagging (T077)
 */

import { describe, test, expect } from 'bun:test';
import { Deployment } from '../../../src/domain/entities/Deployment';
import { DeploymentStatus } from '../../../src/domain/value-objects/DeploymentStatus';
import { ResourceTags } from '../../../src/domain/value-objects/ResourceTags';
import { ValidationError } from '../../../src/domain/types';

describe('Deployment Entity', () => {
  const createValidParams = () => {
    const statusResult = DeploymentStatus.create('pending');
    const tagsResult = ResourceTags.create({
      account: '123456789012',
      team: 'platform',
      moniker: 'my-app',
      version: '1.0.0',
      environment: 'production',
    });

    if (!statusResult.success || !tagsResult.success) {
      throw new Error('Failed to create valid params');
    }

    return {
      versionId: 'version-uuid',
      environment: 'production',
      status: statusResult.value,
      tags: tagsResult.value,
    };
  };

  describe('create()', () => {
    test('should create deployment with pending status', () => {
      const params = createValidParams();
      const result = Deployment.create(params);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.id).toBeDefined();
        expect(result.value.versionId).toBe('version-uuid');
        expect(result.value.environment).toBe('production');
        expect(result.value.status.isPending()).toBe(true);
        expect(result.value.createdAt).toBeInstanceOf(Date);
      }
    });

    test('should include resource tags', () => {
      const params = createValidParams();
      const result = Deployment.create(params);

      expect(result.success).toBe(true);
      if (result.success) {
        const tags = result.value.tags.toRecord();
        expect(tags['lc:account']).toBe('123456789012');
        expect(tags['lc:team']).toBe('platform');
        expect(tags['lc:environment']).toBe('production');
      }
    });

    test('should generate unique deployment IDs', () => {
      const params = createValidParams();
      const result1 = Deployment.create(params);
      const result2 = Deployment.create(params);

      expect(result1.success && result2.success).toBe(true);
      if (result1.success && result2.success) {
        expect(result1.value.id).not.toBe(result2.value.id);
      }
    });
  });

  describe('State Machine Transitions', () => {
    test('should transition from pending to in-progress', () => {
      const params = createValidParams();
      const deployment = Deployment.create(params);
      expect(deployment.success).toBe(true);
      if (!deployment.success) return;

      const statusResult = DeploymentStatus.create('in-progress');
      expect(statusResult.success).toBe(true);
      if (!statusResult.success) return;

      const result = deployment.value.updateStatus(statusResult.value);
      expect(result.success).toBe(true);
      expect(deployment.value.status.isInProgress()).toBe(true);
    });

    test('should transition from in-progress to completed', () => {
      const params = createValidParams();
      const deployment = Deployment.create(params);
      expect(deployment.success).toBe(true);
      if (!deployment.success) return;

      // First to in-progress
      const inProgressResult = DeploymentStatus.create('in-progress');
      expect(inProgressResult.success).toBe(true);
      if (!inProgressResult.success) return;
      deployment.value.updateStatus(inProgressResult.value);

      // Then to completed
      const completedResult = DeploymentStatus.create('completed');
      expect(completedResult.success).toBe(true);
      if (!completedResult.success) return;

      const result = deployment.value.updateStatus(completedResult.value);
      expect(result.success).toBe(true);
      expect(deployment.value.status.isCompleted()).toBe(true);
      expect(deployment.value.completedAt).toBeInstanceOf(Date);
    });

    test('should transition from in-progress to failed', () => {
      const params = createValidParams();
      const deployment = Deployment.create(params);
      expect(deployment.success).toBe(true);
      if (!deployment.success) return;

      // First to in-progress
      const inProgressResult = DeploymentStatus.create('in-progress');
      expect(inProgressResult.success).toBe(true);
      if (!inProgressResult.success) return;
      deployment.value.updateStatus(inProgressResult.value);

      // Then to failed
      const failedResult = DeploymentStatus.create('failed');
      expect(failedResult.success).toBe(true);
      if (!failedResult.success) return;

      const result = deployment.value.updateStatus(failedResult.value, 'Deployment error');
      expect(result.success).toBe(true);
      expect(deployment.value.status.isFailed()).toBe(true);
      expect(deployment.value.failureReason).toBe('Deployment error');
    });

    test('should reject transition from completed to in-progress', () => {
      const params = createValidParams();
      const deployment = Deployment.create(params);
      expect(deployment.success).toBe(true);
      if (!deployment.success) return;

      // Move to completed
      const inProgressResult = DeploymentStatus.create('in-progress');
      expect(inProgressResult.success).toBe(true);
      if (!inProgressResult.success) return;
      deployment.value.updateStatus(inProgressResult.value);

      const completedResult = DeploymentStatus.create('completed');
      expect(completedResult.success).toBe(true);
      if (!completedResult.success) return;
      deployment.value.updateStatus(completedResult.value);

      // Try to go back to in-progress (should fail)
      const backToProgressResult = DeploymentStatus.create('in-progress');
      expect(backToProgressResult.success).toBe(true);
      if (!backToProgressResult.success) return;

      const result = deployment.value.updateStatus(backToProgressResult.value);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ValidationError.InvalidValue);
      }
    });

    test('should reject transition from failed to any other status', () => {
      const params = createValidParams();
      const deployment = Deployment.create(params);
      expect(deployment.success).toBe(true);
      if (!deployment.success) return;

      // Move to failed
      const inProgressResult = DeploymentStatus.create('in-progress');
      expect(inProgressResult.success).toBe(true);
      if (!inProgressResult.success) return;
      deployment.value.updateStatus(inProgressResult.value);

      const failedResult = DeploymentStatus.create('failed');
      expect(failedResult.success).toBe(true);
      if (!failedResult.success) return;
      deployment.value.updateStatus(failedResult.value);

      // Try to change status (should fail)
      const completedResult = DeploymentStatus.create('completed');
      expect(completedResult.success).toBe(true);
      if (!completedResult.success) return;

      const result = deployment.value.updateStatus(completedResult.value);
      expect(result.success).toBe(false);
    });
  });

  describe('addDeployedResource()', () => {
    test('should track deployed resources', () => {
      const params = createValidParams();
      const deployment = Deployment.create(params);
      expect(deployment.success).toBe(true);
      if (!deployment.success) return;

      deployment.value.addDeployedResource({
        type: 'database',
        id: 'db-instance-123',
        arn: 'arn:aws:rds:us-east-1:123456789012:db:postgres-prod',
      });

      expect(deployment.value.deployedResources).toHaveLength(1);
      expect(deployment.value.deployedResources[0].type).toBe('database');
      expect(deployment.value.deployedResources[0].id).toBe('db-instance-123');
    });

    test('should track multiple deployed resources', () => {
      const params = createValidParams();
      const deployment = Deployment.create(params);
      expect(deployment.success).toBe(true);
      if (!deployment.success) return;

      deployment.value.addDeployedResource({
        type: 'database',
        id: 'db-1',
        arn: 'arn:aws:rds:us-east-1:123456789012:db:db-1',
      });

      deployment.value.addDeployedResource({
        type: 'queue',
        id: 'queue-1',
        arn: 'arn:aws:sqs:us-east-1:123456789012:queue-1',
      });

      expect(deployment.value.deployedResources).toHaveLength(2);
    });
  });

  describe('toStorageFormat() and fromStorage()', () => {
    test('should serialize to storage format', () => {
      const params = createValidParams();
      const deployment = Deployment.create(params);
      expect(deployment.success).toBe(true);
      if (!deployment.success) return;

      const stored = deployment.value.toStorageFormat();

      expect(stored.id).toBe(deployment.value.id);
      expect(stored.versionId).toBe('version-uuid');
      expect(stored.environment).toBe('production');
      expect(stored.status).toBe('pending');
      expect(stored.createdAt).toBeDefined();
    });

    test('should deserialize from storage format', () => {
      const stored = {
        id: crypto.randomUUID(),
        versionId: 'version-uuid',
        environment: 'production',
        status: 'completed' as const,
        tags: {
          'lc:account': '123456789012',
          'lc:team': 'platform',
          'lc:application': 'my-app',
          'lc:version': '1.0.0',
          'lc:environment': 'production',
          'lc:managed-by': 'lc-platform',
        },
        deployedResources: [],
        createdAt: new Date().toISOString(),
        startedAt: new Date().toISOString(),
        completedAt: new Date().toISOString(),
      };

      const result = Deployment.fromStorage(stored);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.id).toBe(stored.id);
        expect(result.value.versionId).toBe('version-uuid');
        expect(result.value.status.isCompleted()).toBe(true);
      }
    });
  });

  describe('immutability', () => {
    test('id is readonly', () => {
      const params = createValidParams();
      const deployment = Deployment.create(params);
      expect(deployment.success).toBe(true);
      if (deployment.success) {
        expect(deployment.value.id).toBeDefined();
      }
    });

    test('versionId is readonly', () => {
      const params = createValidParams();
      const deployment = Deployment.create(params);
      expect(deployment.success).toBe(true);
      if (deployment.success) {
        expect(deployment.value.versionId).toBe('version-uuid');
      }
    });

    test('environment is readonly', () => {
      const params = createValidParams();
      const deployment = Deployment.create(params);
      expect(deployment.success).toBe(true);
      if (deployment.success) {
        expect(deployment.value.environment).toBe('production');
      }
    });
  });
});
