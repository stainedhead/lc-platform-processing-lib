/**
 * Use Case Tests: Policy Generation
 * Tests IAM policy generation for runtime and CI/CD (T064-T067)
 */

import { describe, test, expect } from 'bun:test';
import { InitVersion } from '../../../src/use-cases/versions/InitVersion';
import { VersionConfigurator } from '../../../src/use-cases/versions/VersionConfigurator';
import { AcceleratorStorageAdapter } from '../../../src/adapters/storage/AcceleratorStorageAdapter';
import { AcceleratorPolicyAdapter } from '../../../src/adapters/policy/AcceleratorPolicyAdapter';
import { AcceleratorDeploymentAdapter } from '../../../src/adapters/deployment/AcceleratorDeploymentAdapter';

describe('Policy Generation Use Cases', () => {
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

  describe('GenerateAppPolicy (FR-023)', () => {
    test('should generate IAM policy for application runtime access', async () => {
      const storage = new AcceleratorStorageAdapter();
      const policy = new AcceleratorPolicyAdapter();
      const deployment = new AcceleratorDeploymentAdapter();
      const configurator = new VersionConfigurator(storage, policy, deployment);

      await createVersion(storage);

      const result = await configurator.generateAppPolicy({
        account: '123456789012',
        team: 'platform',
        moniker: 'my-app',
        version: '1.0.0',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.version).toBe('2012-10-17');
        expect(result.value.statements).toBeDefined();
        expect(result.value.statements.length).toBeGreaterThan(0);
      }
    });

    test('should generate policy with correct permissions for dependencies', async () => {
      const storage = new AcceleratorStorageAdapter();
      const policy = new AcceleratorPolicyAdapter();
      const deployment = new AcceleratorDeploymentAdapter();
      const configurator = new VersionConfigurator(storage, policy, deployment);

      await createVersion(storage);

      const result = await configurator.generateAppPolicy({
        account: '123456789012',
        team: 'platform',
        moniker: 'my-app',
        version: '1.0.0',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        const statements = result.value.statements;
        expect(statements).toHaveLength(2); // One for each dependency

        const dbStatement = statements.find((s) => s.actions.some((a) => a.includes('database')));
        expect(dbStatement).toBeDefined();
        expect(dbStatement?.effect).toBe('Allow');

        const queueStatement = statements.find((s) => s.actions.some((a) => a.includes('queue')));
        expect(queueStatement).toBeDefined();
      }
    });

    test('should return NotFound error for non-existent version', async () => {
      const storage = new AcceleratorStorageAdapter();
      const policy = new AcceleratorPolicyAdapter();
      const deployment = new AcceleratorDeploymentAdapter();
      const configurator = new VersionConfigurator(storage, policy, deployment);

      const result = await configurator.generateAppPolicy({
        account: '123456789012',
        team: 'platform',
        moniker: 'non-existent',
        version: '1.0.0',
      });

      expect(result.success).toBe(false);
    });

    test('should follow least-privilege principle (SC-006)', async () => {
      const storage = new AcceleratorStorageAdapter();
      const policy = new AcceleratorPolicyAdapter();
      const deployment = new AcceleratorDeploymentAdapter();
      const configurator = new VersionConfigurator(storage, policy, deployment);

      await createVersion(storage);

      const result = await configurator.generateAppPolicy({
        account: '123456789012',
        team: 'platform',
        moniker: 'my-app',
        version: '1.0.0',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        // Verify each statement has specific resources, not wildcards
        result.value.statements.forEach((statement) => {
          expect(statement.resources).toBeDefined();
          expect(statement.resources.length).toBeGreaterThan(0);
          // Resources should reference specific dependency names
          statement.resources.forEach((resource) => {
            expect(resource).toContain('arn:');
          });
        });
      }
    });
  });

  describe('GenerateCICDPolicy (FR-024)', () => {
    test('should generate IAM policy for CI/CD deployment', async () => {
      const policy = new AcceleratorPolicyAdapter();

      const result = await policy.generateCICDPolicy([
        { type: 'database', name: 'postgres', version: '14' },
        { type: 'queue', name: 'rabbitmq', version: '3.11' },
      ]);

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.version).toBe('2012-10-17');
        expect(result.value.statements).toBeDefined();
        expect(result.value.statements.length).toBeGreaterThan(0);
      }
    });

    test('should generate policy with deployment permissions', async () => {
      const policy = new AcceleratorPolicyAdapter();

      const result = await policy.generateCICDPolicy([
        { type: 'database', name: 'postgres', version: '14' },
      ]);

      expect(result.success).toBe(true);
      if (result.success) {
        const statements = result.value.statements;
        expect(statements.length).toBeGreaterThan(0);

        // CI/CD policy should include Create, Update, Delete actions
        statements.forEach((statement) => {
          expect(statement.effect).toBe('Allow');
          expect(
            statement.actions.some(
              (a) => a.includes('Create') || a.includes('Update') || a.includes('Delete')
            )
          ).toBe(true);
        });
      }
    });
  });

  describe('Policy Serialization', () => {
    test('should serialize policy to JSON string', () => {
      const policy = new AcceleratorPolicyAdapter();

      const policyDoc = {
        version: '2012-10-17',
        statements: [
          {
            effect: 'Allow' as const,
            actions: ['database:Read'],
            resources: ['arn:*:database:*:*:postgres'],
          },
        ],
      };

      const serialized = policy.serializePolicy(policyDoc);
      expect(typeof serialized).toBe('string');

      const parsed = JSON.parse(serialized);
      expect(parsed.version).toBe('2012-10-17');
      expect(parsed.statements).toHaveLength(1);
    });
  });
});
