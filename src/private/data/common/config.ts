/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultConfigurationManager } from '@sudoplatform/sudo-common'
import * as t from 'io-ts'
import { EmailServiceConfigNotFoundError } from '../../../public/errors'

const EmailServiceConfigCodec = t.type({
  apiUrl: t.string,
  region: t.string,
  bucket: t.string,
  transientBucket: t.string,
})

export type EmailServiceConfig = t.TypeOf<typeof EmailServiceConfigCodec>

export const getEmailServiceConfig = (): EmailServiceConfig => {
  if (!DefaultConfigurationManager.getInstance().getConfigSet('emService')) {
    throw new EmailServiceConfigNotFoundError()
  }

  return DefaultConfigurationManager.getInstance().bindConfigSet<EmailServiceConfig>(
    EmailServiceConfigCodec,
    'emService',
  )
}
