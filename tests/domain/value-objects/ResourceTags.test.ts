/**
 * Domain Unit Tests: ResourceTags Value Object
 * Tests standard tags, custom tag merging, tag collision detection (T079, FR-035, FR-036)
 */

import { describe, test, expect } from 'bun:test';
import { ResourceTags } from '../../../src/domain/value-objects/ResourceTags';
import { ValidationError } from '../../../src/domain/types';

describe('ResourceTags Value Object', () => {
  describe('create() - Standard Tags (FR-035)', () => {
    test('should extract standard tags from application and version metadata', () => {
      const result = ResourceTags.create({
        account: '123456789012',
        team: 'platform',
        moniker: 'my-app',
        version: '1.0.0',
        environment: 'production',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        const tags = result.value.toRecord();
        expect(tags['lc:account']).toBe('123456789012');
        expect(tags['lc:team']).toBe('platform');
        expect(tags['lc:application']).toBe('my-app');
        expect(tags['lc:version']).toBe('1.0.0');
        expect(tags['lc:environment']).toBe('production');
      }
    });

    test('should include managed-by tag', () => {
      const result = ResourceTags.create({
        account: '123456789012',
        team: 'platform',
        moniker: 'my-app',
        version: '1.0.0',
        environment: 'staging',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        const tags = result.value.toRecord();
        expect(tags['lc:managed-by']).toBe('lc-platform');
      }
    });
  });

  describe('withCustomTags() - Merge Custom Tags (FR-036)', () => {
    test('should merge custom tags with standard tags', () => {
      const baseResult = ResourceTags.create({
        account: '123456789012',
        team: 'platform',
        moniker: 'my-app',
        version: '1.0.0',
        environment: 'production',
      });

      expect(baseResult.success).toBe(true);
      if (!baseResult.success) return;

      const result = baseResult.value.withCustomTags({
        'custom:owner': 'john-doe',
        'custom:cost-center': 'engineering',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        const tags = result.value.toRecord();
        expect(tags['lc:account']).toBe('123456789012');
        expect(tags['custom:owner']).toBe('john-doe');
        expect(tags['custom:cost-center']).toBe('engineering');
      }
    });

    test('should detect tag collision with standard tags', () => {
      const baseResult = ResourceTags.create({
        account: '123456789012',
        team: 'platform',
        moniker: 'my-app',
        version: '1.0.0',
        environment: 'production',
      });

      expect(baseResult.success).toBe(true);
      if (!baseResult.success) return;

      const result = baseResult.value.withCustomTags({
        'lc:account': 'different-account', // Collision!
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ValidationError.InvalidValue);
      }
    });

    test('should detect tag collision with lc: prefix', () => {
      const baseResult = ResourceTags.create({
        account: '123456789012',
        team: 'platform',
        moniker: 'my-app',
        version: '1.0.0',
        environment: 'production',
      });

      expect(baseResult.success).toBe(true);
      if (!baseResult.success) return;

      const result = baseResult.value.withCustomTags({
        'lc:custom-tag': 'value', // lc: prefix reserved!
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ValidationError.InvalidValue);
      }
    });

    test('should allow multiple custom tags', () => {
      const baseResult = ResourceTags.create({
        account: '123456789012',
        team: 'platform',
        moniker: 'my-app',
        version: '1.0.0',
        environment: 'production',
      });

      expect(baseResult.success).toBe(true);
      if (!baseResult.success) return;

      const result = baseResult.value.withCustomTags({
        'custom:owner': 'john-doe',
        'custom:cost-center': 'engineering',
        'custom:project': 'platform-migration',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        const tags = result.value.toRecord();
        expect(Object.keys(tags).length).toBeGreaterThan(6); // Standard + custom
      }
    });
  });

  describe('toRecord()', () => {
    test('should convert tags to key-value record', () => {
      const result = ResourceTags.create({
        account: '123456789012',
        team: 'platform',
        moniker: 'my-app',
        version: '1.0.0',
        environment: 'production',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        const tags = result.value.toRecord();
        expect(typeof tags).toBe('object');
        expect(Object.keys(tags).length).toBeGreaterThan(0);
      }
    });
  });

  describe('validation', () => {
    test('should reject empty account', () => {
      const result = ResourceTags.create({
        account: '',
        team: 'platform',
        moniker: 'my-app',
        version: '1.0.0',
        environment: 'production',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe(ValidationError.MissingRequired);
      }
    });

    test('should reject empty team', () => {
      const result = ResourceTags.create({
        account: '123456789012',
        team: '',
        moniker: 'my-app',
        version: '1.0.0',
        environment: 'production',
      });

      expect(result.success).toBe(false);
    });

    test('should reject empty environment', () => {
      const result = ResourceTags.create({
        account: '123456789012',
        team: 'platform',
        moniker: 'my-app',
        version: '1.0.0',
        environment: '',
      });

      expect(result.success).toBe(false);
    });
  });

  describe('immutability', () => {
    test('tags are readonly (TypeScript compile-time guarantee)', () => {
      const result = ResourceTags.create({
        account: '123456789012',
        team: 'platform',
        moniker: 'my-app',
        version: '1.0.0',
        environment: 'production',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        const tags = result.value.toRecord();
        expect(tags).toBeDefined();
      }
    });
  });
});
