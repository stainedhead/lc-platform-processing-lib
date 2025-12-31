/**
 * Use Case Layer Types
 *
 * DTOs and interfaces for use case operations
 */

import type { ApplicationMetadata, VersionMetadata } from '../domain/types';
import type { DependencyConfiguration } from './ports';

/**
 * Application Identifier
 * Uniquely identifies an application by account, team, and moniker
 */
export interface ApplicationIdentifier {
  account: string;
  team: string;
  moniker: string;
}

/**
 * Version Identifier
 * Uniquely identifies a version by application identifier and version number
 */
export interface VersionIdentifier extends ApplicationIdentifier {
  version: string;
}

/**
 * Initialize Application Parameters
 */
export interface InitApplicationParams extends ApplicationIdentifier {
  metadata?: ApplicationMetadata;
}

/**
 * Update Application Parameters
 */
export interface UpdateApplicationParams extends ApplicationIdentifier {
  metadata: ApplicationMetadata;
}

/**
 * Initialize Version Parameters
 */
export interface InitVersionParams extends ApplicationIdentifier {
  versionNumber: string;
  dependencies?: DependencyConfiguration[];
  metadata?: VersionMetadata;
}

/**
 * Update Version Parameters
 */
export interface UpdateVersionParams extends VersionIdentifier {
  dependencies?: DependencyConfiguration[];
  metadata?: VersionMetadata;
}

/**
 * Cache Artifact Parameters
 */
export interface CacheArtifactParams {
  identifier: VersionIdentifier;
  stream: ReadableStream | NodeJS.ReadableStream;
  metadata: {
    size: number;
    contentType: string;
  };
}

/**
 * Deploy Parameters
 */
export interface DeployParams {
  identifier: VersionIdentifier;
  environment: string;
  createdBy?: string; // Defaults to system user if not provided
}

/**
 * Validation Report
 * Result of dependency or configuration validation
 */
export interface ValidationReport {
  valid: boolean;
  failures: ValidationFailure[];
}

export interface ValidationFailure {
  field: string;
  message: string;
  code: string;
}
