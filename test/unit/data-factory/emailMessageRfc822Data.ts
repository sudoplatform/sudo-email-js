/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { internal as SudoUserInternal } from '@sudoplatform/sudo-user'
import _ from 'lodash'
import { S3ClientDownloadOutput } from '../../../src/private/data/common/s3Client'
import { EmailMessageDetails } from '../../../src/private/util/rfc822MessageDataProcessor'
import { EncryptionStatus } from '../../../src'

export class EmailMessageRfc822DataFactory {
  static readonly s3ClientDownloadOutput: S3ClientDownloadOutput = {
    lastModified: new Date(),
    body: 'downloadedRfc822Data',
    metadata: { 'key-id': 'testKeyId', algorithm: 'testAlgorithm' },
  }

  static readonly identityServiceConfig: SudoUserInternal.IdentityServiceConfig =
    {
      region: 'region',
      poolId: 'poolId',
      clientId: 'clientId',
      identityPoolId: 'identityPoolId',
      apiUrl: 'apiUrl',
      apiKey: 'apiKey',
      transientBucket: 'transientBucket',
      registrationMethods: [],
      bucket: 'bucket',
    }

  static readonly getEmailMessageInput = {
    id: 'testId',
    emailAddressId: 'testEmailAddressId',
  }

  static listEmailMessagesRfc822DataWithPrefix(
    identityId: string,
    emailAddressId: string,
    emailMessageRfc822Data: string,
    numberOfMessages: number,
  ): string[] {
    const prefix = `${identityId}/email/${emailAddressId}`
    return _.range(numberOfMessages).map(
      (i) => `${prefix}/${emailMessageRfc822Data}${i}`,
    )
  }

  static emailMessageDetails(
    overrides?: Partial<EmailMessageDetails>,
  ): EmailMessageDetails {
    return {
      from: [{ emailAddress: 'sender@internal.com' }],
      to: [{ emailAddress: 'recipient@external.com' }],
      cc: [],
      bcc: [],
      replyTo: [],
      subject: 'Test Subject',
      body: 'Test Body',
      isHtml: false,
      attachments: [],
      inlineAttachments: [],
      encryptionStatus: EncryptionStatus.UNENCRYPTED,
      forwardMessageId: undefined,
      replyMessageId: undefined,
      ...overrides,
    }
  }
}
