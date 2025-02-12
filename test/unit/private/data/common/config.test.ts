/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultConfigurationManager } from '@sudoplatform/sudo-common'
import {
  EmailServiceConfig,
  getEmailServiceConfig,
} from '../../../../../src/private/data/common/config'
import { EmailServiceConfigNotFoundError } from '../../../../../src/public/errors'

describe('config tests', () => {
  const emailServiceConfig: EmailServiceConfig = {
    apiUrl: 'api-url',
    region: 'region',
    bucket: 'bucket',
    transientBucket: 'transient-bucket',
  }

  describe('getEmailServiceConfig', () => {
    it('should throw an EmailServiceConfigNotFoundError if config has no emService stanza', () => {
      DefaultConfigurationManager.getInstance().setConfig(JSON.stringify({}))
      expect(() => getEmailServiceConfig()).toThrowError(
        EmailServiceConfigNotFoundError,
      )
    })

    it('should return config if emService stanza is present', () => {
      DefaultConfigurationManager.getInstance().setConfig(
        JSON.stringify({ emService: emailServiceConfig }),
      )
      expect(getEmailServiceConfig()).toEqual(emailServiceConfig)
    })
  })
})
