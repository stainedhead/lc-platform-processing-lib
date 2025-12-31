This libary, or package, is an enabling package to ensure the plaform configuration provided by this system is centeralized and can be shared across tooling that may need to update this configuration.  The intent is to provide CLI based tooling for developers to use in lower level environments an REST based services to enable in non-production test and production environments.  This library is expected to be used within the lc-platform-dev-accelerators package which would then be used by those front-ends.

lc-platform-dev-accelerators.LCPlatform is Control Plane entry point that provides infrastructure management and later storage of that configuration.  This libarary will ensure the processing rules to enable the storage of that configuration and processing of the deployment and configuration of dependencies are always done in a consistent manner. 

This repo can refererence code and documentation to help ensure the code base is in sync with this dependency library.  the code and documentation can be found at ../lc-platform-dev-accelerators/

we can also import code from this this library such as:

import { 
  LCPlatform, 
  PlatformType, 
  Environment,
  DependencyType,
  EncryptionType
} from '@stainedhead/lc-platform-dev-accelerators';


This libary will have a main Class which will be constructed with a reference to lc-platform-dev-accelerators.LCPlatform and lc-platform-dev-accelerators.LCPlatformApp instances. These objects will have the data required to update the backend configurations.

lc-platform-dev-accelerators has a collection of classes within utils specifically configPersistence, dependencyValidator, idGenerator, nameGenerator, policySerializer all of these classes should be copied into this library, if there are other classes what also need to be moved because they are related or required for these classes to work, they can also be brought over.  we will later remove those deprecated classes from lc-platform-dev-accelerators.

lc-platform-dev-accelerators.configPersistence has a method:

export function generateAppConfigPath(account: string, team: string, moniker: string): string {
  return `lcp-${account}-${team}-${moniker}/app.config`;
}

which should be rewritten to remove the file, and have the code build the directory name, which should then be used where ever the code needs the directory path.

export function generateAppConfigBucketName(account: string, team: string, moniker: string): string {
  return `lcp-${account}-${team}-${moniker}/`;
}

********** LCPlaformAppConfigurator **********

This libary will have a class LCPlatformAppConfigurator with instances which use acp as its default instance name.  Objects of this type will have methods such as:

Init() which uses the configuration data from its instance parameters to create a new application configuration.  This method should ensure it is not overwriting a previous application owned by the same team, and having the same moniker.  We should error if this is attempted.  This method writes a app.config file to the path returned by generateAppConfigBucketName

Update() which uses the configuration data from its instance parameters to update an existing application configuration.  This method should ensure it is updating an existing application owned by the same team, and having the same moniker.  We should error if this is not found.

Delete() which uses the configuration data from its instance parameters to delete an existing application configuration.

Read() which reads the configuration values from the storage location, and returns it to the caller as a JSON.

Exists() which reads the configuration values from teh storage location and confirms the configuration exists.

NeedsUpdate() which reads the configuration values from the storage location and ensures that the inmemory configuation matches the stored configuration, if all values match this method returns false, if any value is out of synch it should return true.

Validate() which takes the inmemory values and confirms they are valid and could be persisted without breaking any rules.

********** LCPlaformAppVersionConfigurator **********
This libary will have a class LCPlatformAppVersionConfigurator with instances which use av as its default instance name.  Objects of this type will have methods such as:

Init() which uses the configuration data from its instance parameters to create a new application version configuration.  This method should ensure it is not overwriting a previous application version owned by the same team, and having the same moniker and version.  We should error if this is attempted.  This method writes a appversion.config file to the path returned by generateAppConfigBucketName concatenated with '/versions/<version>/'

Update() which uses the configuration data from its instance parameters to update an existing application version configuration.  This method should ensure it is updating an existing application version owned by the same team, and having the same moniker and version.  We should error if this is not found.

Delete() which uses the configuration data from its instance parameters to delete an existing application version configuration.

Read() which reads the configuration values from the storage location, and returns it to the caller as a JSON.

Exists() which reads the configuration values from teh storage location and confirms the configuration exists.

NeedsUpdate() which reads the configuration values from the storage location and ensures that the inmemory configuation matches the stored configuration, if all values match this method returns false, if any value is out of synch it should return true.

Validate() which takes the inmemory values and confirms they are valid and could be persisted without breaking any rules.

Cache(binary: Stream) take a stream representing the binary we will later deploy to the the version folder within the path returned by generateAppConfigBucketName concatenated with '/versions/

GenerateAppPolicy() creates IAM policy to enable the app to have access to the dependencies and do the work it requires.

GenerateCICDPolicy() creates an IAM policy required to deploy the application an its dependencies.

ReadAppPolicy()

ReadCICDPolicy()

ValidateDependencies() confirm the configuration values within the versions dependencies.

DeployDependencies()

DeployApp()

DeployAppVersionAndDependencies() does a deployment of any required dependencies, and then if successful (or no deployment was required) does a deployment of the application.  Deployment of the application includes the deployment of the IAM policy required to run the application.  This method is best implemented as a wrapper to the DeployDependencies and DeployApp functions.

