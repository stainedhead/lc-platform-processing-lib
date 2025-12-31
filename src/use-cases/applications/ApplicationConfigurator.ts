/**
 * ApplicationConfigurator
 *
 * Orchestrates application configuration use cases
 * Public API for application management (exported as LCPlatformAppConfigurator)
 */

import { Result, ConfigurationError, ValidationError } from '../../domain/types';
import { Application } from '../../domain/entities/Application';
import { IStorageProvider } from '../ports';
import type {
  ApplicationIdentifier,
  InitApplicationParams,
  UpdateApplicationParams,
  ValidationReport,
} from '../types';

import { InitApplication } from './InitApplication';
import { ReadApplication } from './ReadApplication';
import { UpdateApplication } from './UpdateApplication';
import { DeleteApplication } from './DeleteApplication';
import { ValidateApplication } from './ValidateApplication';

/**
 * Application Configurator
 *
 * High-level API for managing application configurations in the LC Platform.
 * Provides a unified interface for CRUD operations and validation of application metadata.
 *
 * @remarks
 * This class orchestrates application configuration use cases and is the primary
 * entry point for application management. Applications are uniquely identified by
 * the combination of account + team + moniker.
 *
 * @example
 * ```typescript
 * const storage = new AcceleratorStorageAdapter();
 * const appConfig = new ApplicationConfigurator(storage);
 *
 * // Initialize a new application
 * const result = await appConfig.init({
 *   account: '123456789012',
 *   team: 'platform',
 *   moniker: 'my-app',
 *   metadata: { description: 'My application' }
 * });
 * ```
 *
 * @public
 */
export class ApplicationConfigurator {
  private readonly initApp: InitApplication;
  private readonly readApp: ReadApplication;
  private readonly updateApp: UpdateApplication;
  private readonly deleteApp: DeleteApplication;
  private readonly validateApp: ValidateApplication;

  /**
   * Creates an instance of ApplicationConfigurator
   *
   * @param storage - Storage provider implementation for persisting application configurations
   */
  constructor(storage: IStorageProvider) {
    this.initApp = new InitApplication(storage);
    this.readApp = new ReadApplication(storage);
    this.updateApp = new UpdateApplication(storage);
    this.deleteApp = new DeleteApplication(storage);
    this.validateApp = new ValidateApplication(storage);
  }

  /**
   * Initialize a new application configuration
   *
   * Creates a new application with the specified metadata. The application is uniquely
   * identified by account, team, and moniker. Fails if an application with the same
   * identifier already exists.
   *
   * @param params - Application initialization parameters
   * @returns Result containing the created Application entity or ConfigurationError
   *
   * @example
   * ```typescript
   * const result = await appConfig.init({
   *   account: '123456789012',
   *   team: 'platform',
   *   moniker: 'my-app',
   *   metadata: {
   *     description: 'My application',
   *     owner: 'platform-team'
   *   }
   * });
   *
   * if (result.success) {
   *   console.log('Application created:', result.value.id);
   * } else {
   *   console.error('Failed:', result.error);
   * }
   * ```
   *
   * @remarks Implements FR-003
   */
  async init(params: InitApplicationParams): Promise<Result<Application, ConfigurationError>> {
    return await this.initApp.execute(params);
  }

  /**
   * Read an existing application configuration
   *
   * Retrieves application metadata from storage. Returns NotFound error if the
   * application does not exist.
   *
   * @param params - Application identifier (account, team, moniker)
   * @returns Result containing the Application entity or ConfigurationError
   *
   * @example
   * ```typescript
   * const result = await appConfig.read({
   *   account: '123456789012',
   *   team: 'platform',
   *   moniker: 'my-app'
   * });
   *
   * if (result.success) {
   *   console.log('Description:', result.value.metadata.description);
   * }
   * ```
   *
   * @remarks Implements FR-008
   */
  async read(params: ApplicationIdentifier): Promise<Result<Application, ConfigurationError>> {
    return await this.readApp.execute(params);
  }

  /**
   * Update application configuration metadata
   *
   * Updates the metadata for an existing application. The application must exist
   * or this operation will fail with NotFound error.
   *
   * @param params - Application identifier and new metadata
   * @returns Result containing the updated Application entity or ConfigurationError
   *
   * @example
   * ```typescript
   * const result = await appConfig.update({
   *   account: '123456789012',
   *   team: 'platform',
   *   moniker: 'my-app',
   *   metadata: {
   *     description: 'Updated description',
   *     owner: 'new-owner'
   *   }
   * });
   * ```
   *
   * @remarks Implements FR-005
   */
  async update(params: UpdateApplicationParams): Promise<Result<Application, ConfigurationError>> {
    return await this.updateApp.execute(params);
  }

  /**
   * Delete application configuration
   *
   * Removes the application configuration from storage. This operation is permanent
   * and cannot be undone.
   *
   * @param params - Application identifier (account, team, moniker)
   * @returns Result containing void or ConfigurationError
   *
   * @example
   * ```typescript
   * const result = await appConfig.delete({
   *   account: '123456789012',
   *   team: 'platform',
   *   moniker: 'my-app'
   * });
   *
   * if (result.success) {
   *   console.log('Application deleted successfully');
   * }
   * ```
   *
   * @remarks Implements FR-007
   */
  async delete(params: ApplicationIdentifier): Promise<Result<void, ConfigurationError>> {
    return await this.deleteApp.execute(params);
  }

  /**
   * Check if application exists
   *
   * Verifies whether an application with the given identifier exists in storage.
   * This is a lightweight operation that does not load the full application metadata.
   *
   * @param params - Application identifier (account, team, moniker)
   * @returns Promise resolving to true if application exists, false otherwise
   *
   * @example
   * ```typescript
   * const exists = await appConfig.exists({
   *   account: '123456789012',
   *   team: 'platform',
   *   moniker: 'my-app'
   * });
   *
   * if (!exists) {
   *   console.log('Application not found');
   * }
   * ```
   *
   * @remarks Implements FR-009
   */
  async exists(params: ApplicationIdentifier): Promise<boolean> {
    return await this.validateApp.exists(params);
  }

  /**
   * Check if application needs update
   *
   * Compares the local updatedAt timestamp with the stored application's updatedAt
   * to determine if the local copy is stale and needs to be refreshed.
   *
   * @param params - Application identifier (account, team, moniker)
   * @param localUpdatedAt - Local timestamp to compare against
   * @returns Result containing boolean (true if update needed) or ConfigurationError
   *
   * @example
   * ```typescript
   * const result = await appConfig.needsUpdate(
   *   { account: '123456789012', team: 'platform', moniker: 'my-app' },
   *   new Date('2024-01-01')
   * );
   *
   * if (result.success && result.value) {
   *   console.log('Local copy is stale, refresh required');
   * }
   * ```
   *
   * @remarks Implements FR-010
   */
  async needsUpdate(
    params: ApplicationIdentifier,
    localUpdatedAt: Date
  ): Promise<Result<boolean, ConfigurationError>> {
    return await this.validateApp.needsUpdate(params, localUpdatedAt);
  }

  /**
   * Validate application configuration
   *
   * Performs comprehensive validation of the application configuration, checking
   * that all required fields are present and valid.
   *
   * @param params - Application identifier (account, team, moniker)
   * @returns Result containing ValidationReport or ValidationError
   *
   * @example
   * ```typescript
   * const result = await appConfig.validate({
   *   account: '123456789012',
   *   team: 'platform',
   *   moniker: 'my-app'
   * });
   *
   * if (result.success) {
   *   if (result.value.valid) {
   *     console.log('Application is valid');
   *   } else {
   *     console.log('Validation failures:', result.value.failures);
   *   }
   * }
   * ```
   *
   * @remarks Implements FR-011
   */
  async validate(
    params: ApplicationIdentifier
  ): Promise<Result<ValidationReport, ValidationError>> {
    return await this.validateApp.validate(params);
  }
}
