/**
 * Integration Test: P1 - Initialize Application Configuration
 *
 * End-to-end workflow test for User Story 1
 * Tests: Init → Read → Update → Delete
 */

import { describe, test, expect } from 'bun:test';
import { LCPlatformAppConfigurator, AcceleratorStorageAdapter } from '../../src/index';

describe('P1: Initialize Application Configuration (User Story 1)', () => {
  test('should complete full application lifecycle: Init → Read → Update → Delete', async () => {
    // Setup
    const storage = new AcceleratorStorageAdapter();
    const configurator = new LCPlatformAppConfigurator(storage);

    const appParams = {
      account: 'acme',
      team: 'alpha',
      moniker: 'test-app',
      metadata: {
        displayName: 'Test Application',
        description: 'Integration test app',
        owner: 'test@example.com',
      },
    };

    // 1. Init - Create new application
    const initResult = await configurator.init(appParams);
    expect(initResult.success).toBe(true);

    if (!initResult.success) return;

    const app = initResult.value;
    expect(app.account).toBe('acme');
    expect(app.teamMoniker.team).toBe('alpha');
    expect(app.teamMoniker.moniker).toBe('test-app');
    expect(app.metadata?.displayName).toBe('Test Application');

    // 2. Read - Retrieve the application
    const readResult = await configurator.read({
      account: 'acme',
      team: 'alpha',
      moniker: 'test-app',
    });

    expect(readResult.success).toBe(true);
    if (!readResult.success) return;

    expect(readResult.value.id.toString()).toBe(app.id.toString());
    expect(readResult.value.metadata?.displayName).toBe('Test Application');

    // 3. Update - Modify metadata
    const updateResult = await configurator.update({
      account: 'acme',
      team: 'alpha',
      moniker: 'test-app',
      metadata: {
        displayName: 'Updated Test Application',
        description: 'Updated description',
        owner: 'updated@example.com',
      },
    });

    expect(updateResult.success).toBe(true);
    if (!updateResult.success) return;

    expect(updateResult.value.metadata?.displayName).toBe('Updated Test Application');
    expect(updateResult.value.metadata?.owner).toBe('updated@example.com');

    // 4. Verify update persisted
    const readAfterUpdate = await configurator.read({
      account: 'acme',
      team: 'alpha',
      moniker: 'test-app',
    });

    expect(readAfterUpdate.success).toBe(true);
    if (!readAfterUpdate.success) return;

    expect(readAfterUpdate.value.metadata?.displayName).toBe('Updated Test Application');

    // 5. Delete - Remove the application
    const deleteResult = await configurator.delete({
      account: 'acme',
      team: 'alpha',
      moniker: 'test-app',
    });

    expect(deleteResult.success).toBe(true);

    // 6. Verify deletion - Read should fail
    const readAfterDelete = await configurator.read({
      account: 'acme',
      team: 'alpha',
      moniker: 'test-app',
    });

    expect(readAfterDelete.success).toBe(false);
  });

  test('should prevent overwriting existing application', async () => {
    const storage = new AcceleratorStorageAdapter();
    const configurator = new LCPlatformAppConfigurator(storage);

    const appParams = {
      account: 'acme',
      team: 'beta',
      moniker: 'test-app-2',
    };

    // Create application
    const firstInit = await configurator.init(appParams);
    expect(firstInit.success).toBe(true);

    // Attempt to create again - should fail
    const secondInit = await configurator.init(appParams);
    expect(secondInit.success).toBe(false);
    if (!secondInit.success) {
      expect(secondInit.error).toBeDefined();
    }
  });

  test('should validate application existence', async () => {
    const storage = new AcceleratorStorageAdapter();
    const configurator = new LCPlatformAppConfigurator(storage);

    const identifier = {
      account: 'acme',
      team: 'gamma',
      moniker: 'test-app-3',
    };

    // Should not exist initially
    const existsBefore = await configurator.exists(identifier);
    expect(existsBefore).toBe(false);

    // Create application
    await configurator.init(identifier);

    // Should exist after creation
    const existsAfter = await configurator.exists(identifier);
    expect(existsAfter).toBe(true);
  });
});
