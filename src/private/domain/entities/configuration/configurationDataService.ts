/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { EmailConfigurationDataEntity } from './emailConfigurationDataEntity'

/**
 * Core entity representation of the configuration data service used in business logic. Used to retrieve configuration data representing the various limits.
 *
 * @interface EmailConfigurationDataService
 */
export interface EmailConfigurationDataService {
  /**
   * Retrieve the configuration data from the service.
   *
   * @returns {GetConfigurationDataEntity} The configuration data for the email service.
   */
  getConfigurationData(): Promise<EmailConfigurationDataEntity>
}
