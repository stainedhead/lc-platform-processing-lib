/**
 * Domain Unit Test: StoragePath Value Object
 *
 * Tests for StoragePath value object (bucket name generation, path validation)
 * Pure unit test with NO external dependencies
 */

import { describe, test, expect } from 'bun:test';
import { StoragePath } from '../../../src/domain/value-objects/StoragePath';

describe('StoragePath Value Object', () => {
  describe('forApplication()', () => {
    test('should create storage path for application', () => {
      const result = StoragePath.forApplication('acme', 'alpha', 'api-service');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.account).toBe('acme');
        expect(result.value.team).toBe('alpha');
        expect(result.value.moniker).toBe('api-service');
      }
    });

    test('should generate correct bucket name', () => {
      const result = StoragePath.forApplication('acme', 'alpha', 'api-service');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.bucketName).toBe('lcp-acme-alpha-api-service/');
      }
    });

    test('should generate correct app config path', () => {
      const result = StoragePath.forApplication('acme', 'alpha', 'api-service');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.appConfigPath).toBe('lcp-acme-alpha-api-service/app.config');
      }
    });

    test('should reject empty account', () => {
      const result = StoragePath.forApplication('', 'alpha', 'api-service');

      expect(result.success).toBe(false);
    });

    test('should reject invalid characters in account', () => {
      const result = StoragePath.forApplication('acme/corp', 'alpha', 'api-service');

      expect(result.success).toBe(false);
    });

    test('should reject invalid characters in team', () => {
      const result = StoragePath.forApplication('acme', 'alpha team', 'api-service');

      expect(result.success).toBe(false);
    });
  });

  describe('forVersion()', () => {
    test('should create storage path for version', () => {
      const result = StoragePath.forVersion('acme', 'alpha', 'api-service', '1.0.0');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.account).toBe('acme');
        expect(result.value.version).toBe('1.0.0');
      }
    });

    test('should generate correct version path', () => {
      const result = StoragePath.forVersion('acme', 'alpha', 'api-service', '1.0.0');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.versionPath).toBe('lcp-acme-alpha-api-service/versions/1.0.0/');
      }
    });

    test('should generate correct version config path', () => {
      const result = StoragePath.forVersion('acme', 'alpha', 'api-service', '1.0.0');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.versionConfigPath).toBe(
          'lcp-acme-alpha-api-service/versions/1.0.0/appversion.config'
        );
      }
    });

    test('should generate correct artifact path', () => {
      const result = StoragePath.forVersion('acme', 'alpha', 'api-service', '1.0.0');

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.value.artifactPath).toBe(
          'lcp-acme-alpha-api-service/versions/1.0.0/artifact'
        );
      }
    });

    test('should reject empty version', () => {
      const result = StoragePath.forVersion('acme', 'alpha', 'api-service', '');

      expect(result.success).toBe(false);
    });
  });

  describe('immutability', () => {
    test('properties are readonly (TypeScript compile-time guarantee)', () => {
      const result = StoragePath.forApplication('acme', 'alpha', 'api-service');

      expect(result.success).toBe(true);
      if (result.success) {
        // TypeScript prevents modification at compile time
        expect(result.value.account).toBe('acme');
        expect(result.value.team).toBe('alpha');
        expect(result.value.moniker).toBe('api-service');
      }
    });
  });
});
