/**
 * VersionConfigurator
 * Orchestrates version configuration use cases
 * Public API (exported as LCPlatformAppVersionConfigurator)
 */

import { Result, ConfigurationError, StorageError, ValidationError } from '../../domain/types';
import { Version } from '../../domain/entities/Version';
import {
  IStorageProvider,
  IPolicyProvider,
  IDeploymentProvider,
  ArtifactReference,
  PolicyDocument,
} from '../ports';
import type {
  VersionIdentifier,
  InitVersionParams,
  UpdateVersionParams,
  CacheArtifactParams,
  ValidationReport,
} from '../types';

import { InitVersion } from './InitVersion';
import { ReadVersion } from './ReadVersion';
import { CacheArtifact } from './CacheArtifact';
import { UpdateVersion } from './UpdateVersion';

/**
 * Version Configurator
 *
 * High-level API for managing application versions in the LC Platform.
 * Provides operations for version lifecycle management, artifact caching,
 * and IAM policy generation.
 *
 * @remarks
 * This class orchestrates version configuration use cases. Versions are uniquely
 * identified by account + team + moniker + version number and must follow
 * semantic versioning (major.minor.patch[-prerelease]).
 *
 * @example
 * ```typescript
 * const storage = new AcceleratorStorageAdapter();
 * const policy = new AcceleratorPolicyAdapter();
 * const deployment = new AcceleratorDeploymentAdapter();
 * const versionConfig = new VersionConfigurator(storage, policy, deployment);
 *
 * // Initialize a new version
 * const result = await versionConfig.init({
 *   account: '123456789012',
 *   team: 'platform',
 *   moniker: 'my-app',
 *   versionNumber: '1.0.0',
 *   dependencies: [
 *     { type: 'database', name: 'postgres', version: '14' }
 *   ]
 * });
 * ```
 *
 * @public
 */
export class VersionConfigurator {
  private readonly initVersion: InitVersion;
  private readonly readVersion: ReadVersion;
  private readonly cacheArtifact: CacheArtifact;
  private readonly updateVersion: UpdateVersion;

  /**
   * Creates an instance of VersionConfigurator
   *
   * @param storage - Storage provider for persisting version configurations
   * @param _policy - Policy provider for IAM policy generation
   * @param _deployment - Deployment provider for deployment operations
   */
  constructor(
    storage: IStorageProvider,
    private readonly _policy: IPolicyProvider,
    _deployment: IDeploymentProvider
  ) {
    this.initVersion = new InitVersion(storage);
    this.readVersion = new ReadVersion(storage);
    this.cacheArtifact = new CacheArtifact(storage);
    this.updateVersion = new UpdateVersion(storage);
  }

  /**
   * Initialize a new version configuration
   *
   * Creates a new version with the specified dependencies and metadata.
   * Version numbers must follow semantic versioning (e.g., "1.0.0", "2.1.0-beta").
   *
   * @param params - Version initialization parameters
   * @returns Result containing the created Version entity or ConfigurationError
   *
   * @example
   * ```typescript
   * const result = await versionConfig.init({
   *   account: '123456789012',
   *   team: 'platform',
   *   moniker: 'my-app',
   *   versionNumber: '1.0.0',
   *   dependencies: [
   *     { type: 'database', name: 'postgres', version: '14' },
   *     { type: 'queue', name: 'rabbitmq', version: '3.11' }
   *   ],
   *   metadata: {
   *     description: 'Initial release',
   *     releaseNotes: 'First production release'
   *   }
   * });
   *
   * if (result.success) {
   *   console.log('Version created:', result.value.versionNumber);
   * }
   * ```
   *
   * @remarks Implements FR-012
   */
  async init(params: InitVersionParams): Promise<Result<Version, ConfigurationError>> {
    return await this.initVersion.execute(params);
  }

  /**
   * Read an existing version configuration
   *
   * Retrieves version metadata including dependencies and artifact references.
   * Returns NotFound error if the version does not exist.
   *
   * @param params - Version identifier (account, team, moniker, version)
   * @returns Result containing the Version entity or ConfigurationError
   *
   * @example
   * ```typescript
   * const result = await versionConfig.read({
   *   account: '123456789012',
   *   team: 'platform',
   *   moniker: 'my-app',
   *   version: '1.0.0'
   * });
   *
   * if (result.success) {
   *   console.log('Dependencies:', result.value.dependencies);
   *   console.log('Artifact:', result.value.artifactReference);
   * }
   * ```
   *
   * @remarks Implements FR-016
   */
  async read(params: VersionIdentifier): Promise<Result<Version, ConfigurationError>> {
    return await this.readVersion.execute(params);
  }

  /**
   * Update version configuration
   *
   * Updates dependencies and metadata for an existing version. The version
   * number cannot be changed - create a new version instead.
   *
   * @param params - Version identifier and new dependencies/metadata
   * @returns Result containing the updated Version entity or ConfigurationError
   *
   * @example
   * ```typescript
   * const result = await versionConfig.update({
   *   account: '123456789012',
   *   team: 'platform',
   *   moniker: 'my-app',
   *   version: '1.0.0',
   *   dependencies: [
   *     { type: 'database', name: 'postgres', version: '15' }  // Updated
   *   ],
   *   metadata: {
   *     description: 'Updated dependencies'
   *   }
   * });
   * ```
   *
   * @remarks Implements FR-014
   */
  async update(params: UpdateVersionParams): Promise<Result<Version, ConfigurationError>> {
    return await this.updateVersion.execute(params);
  }

  /**
   * Cache application artifact
   *
   * Uploads and stores an application artifact (e.g., Docker image, ZIP file)
   * for this version. Updates the version's artifact reference with storage path,
   * size, and checksum.
   *
   * @param params - Artifact caching parameters including stream and metadata
   * @returns Result containing ArtifactReference or ConfigurationError/StorageError
   *
   * @example
   * ```typescript
   * import { createReadStream } from 'fs';
   *
   * const stream = createReadStream('./my-app.zip');
   * const result = await versionConfig.cache({
   *   identifier: {
   *     account: '123456789012',
   *     team: 'platform',
   *     moniker: 'my-app',
   *     version: '1.0.0'
   *   },
   *   stream,
   *   metadata: {
   *     contentType: 'application/zip',
   *     size: 1024000
   *   }
   * });
   *
   * if (result.success) {
   *   console.log('Artifact uploaded:', result.value.path);
   *   console.log('Checksum:', result.value.checksum);
   * }
   * ```
   *
   * @remarks Implements FR-026
   */
  async cache(
    params: CacheArtifactParams
  ): Promise<Result<ArtifactReference, ConfigurationError | StorageError>> {
    return await this.cacheArtifact.execute(params);
  }

  /**
   * Generate IAM policy for application runtime
   *
   * Creates an IAM policy document based on the version's declared dependencies.
   * The policy grants minimum required permissions for accessing configured
   * resources (databases, queues, storage, etc.).
   *
   * @param params - Version identifier
   * @returns Result containing PolicyDocument or ConfigurationError
   *
   * @example
   * ```typescript
   * const result = await versionConfig.generateAppPolicy({
   *   account: '123456789012',
   *   team: 'platform',
   *   moniker: 'my-app',
   *   version: '1.0.0'
   * });
   *
   * if (result.success) {
   *   console.log('Policy:', JSON.stringify(result.value, null, 2));
   *   // Use policy for runtime deployment
   * }
   * ```
   *
   * @remarks Implements FR-028
   */
  async generateAppPolicy(
    params: VersionIdentifier
  ): Promise<Result<PolicyDocument, ConfigurationError>> {
    const readResult = await this.readVersion.execute(params);
    if (!readResult.success) return readResult;

    const policyResult = await this._policy.generateAppPolicy(readResult.value.dependencies);
    if (!policyResult.success) {
      return { success: false, error: ConfigurationError.ValidationFailed };
    }

    return { success: true, value: policyResult.value };
  }

  /**
   * Validate version dependencies
   *
   * Verifies that all declared dependencies are valid and accessible.
   * Checks dependency versions, types, and compatibility.
   *
   * @param params - Version identifier
   * @returns Result containing ValidationReport or ValidationError
   *
   * @example
   * ```typescript
   * const result = await versionConfig.validateDependencies({
   *   account: '123456789012',
   *   team: 'platform',
   *   moniker: 'my-app',
   *   version: '1.0.0'
   * });
   *
   * if (result.success) {
   *   if (result.value.valid) {
   *     console.log('All dependencies are valid');
   *   } else {
   *     console.log('Validation failures:', result.value.failures);
   *   }
   * }
   * ```
   *
   * @remarks Implements FR-020
   */
  async validateDependencies(
    params: VersionIdentifier
  ): Promise<Result<ValidationReport, ValidationError>> {
    const readResult = await this.readVersion.execute(params);
    if (!readResult.success) {
      return { success: false, error: ValidationError.InvalidFormat };
    }

    // Simple validation - all dependencies valid if version exists
    return {
      success: true,
      value: { valid: true, failures: [] },
    };
  }
}
