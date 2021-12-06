import { ConfigurationDataEntity } from './configurationDataEntity'

/**
 * Core entity representation of the configuration data service used in business logic. Used to retrieve configuration data representing the various limits.
 *
 * @interface ConfigurationDataService
 */
export interface ConfigurationDataService {
  /**
   * Retrieve the configuration data from the service.
   *
   * @returns {GetConfigurationDataEntity} The configuration data for the email service.
   */
  getConfigurationData(): Promise<ConfigurationDataEntity>
}
