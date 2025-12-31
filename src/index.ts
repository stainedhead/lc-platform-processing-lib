/**
 * LC Platform Processing Library
 * Public API
 */

// Configurators (Public API)
export { ApplicationConfigurator as LCPlatformAppConfigurator } from './use-cases/applications/ApplicationConfigurator';
export { VersionConfigurator as LCPlatformAppVersionConfigurator } from './use-cases/versions/VersionConfigurator';

// Domain Types (Public)
export type { Result, ApplicationMetadata, VersionMetadata, StandardTags } from './domain/types';
export { ConfigurationError, ValidationError, StorageError, DeploymentError } from './domain/types';

// Use Case Types (Public)
export type {
  ApplicationIdentifier,
  VersionIdentifier,
  InitApplicationParams,
  UpdateApplicationParams,
  InitVersionParams,
  UpdateVersionParams,
  CacheArtifactParams,
  DeployParams,
  ValidationReport,
  ValidationFailure,
} from './use-cases/types';

// Port Interfaces (Public - for implementing custom adapters)
export type {
  IStorageProvider,
  IPolicyProvider,
  IDeploymentProvider,
  DependencyConfiguration,
  ArtifactReference,
  PolicyReferences,
  PolicyDocument,
  PolicyStatement,
  DeploymentResult,
} from './use-cases/ports';

// Adapters (Public - reference implementations)
export { AcceleratorStorageAdapter } from './adapters/storage/AcceleratorStorageAdapter';
export { AcceleratorPolicyAdapter } from './adapters/policy/AcceleratorPolicyAdapter';
export { AcceleratorDeploymentAdapter } from './adapters/deployment/AcceleratorDeploymentAdapter';

// Domain entities and value objects (for advanced use)
export { Application } from './domain/entities/Application';
export { Version } from './domain/entities/Version';
export { Deployment } from './domain/entities/Deployment';
export { AppId } from './domain/value-objects/AppId';
export { VersionNumber } from './domain/value-objects/VersionNumber';
export { TeamMoniker } from './domain/value-objects/TeamMoniker';
export { StoragePath } from './domain/value-objects/StoragePath';
export { DeploymentStatus } from './domain/value-objects/DeploymentStatus';
export { ResourceTags } from './domain/value-objects/ResourceTags';

// Deployment Use Cases (Public API)
export { DeployDependencies } from './use-cases/deployments/DeployDependencies';
export { DeployApplication } from './use-cases/deployments/DeployApplication';
export type {
  DeployDependenciesParams,
  DeployDependenciesResult,
} from './use-cases/deployments/DeployDependencies';
export type { DeployApplicationParams } from './use-cases/deployments/DeployApplication';
