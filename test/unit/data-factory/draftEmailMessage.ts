/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { internal as SudoUserInternal } from '@sudoplatform/sudo-user'
import _ from 'lodash'
import {
  S3ClientDownloadOutput,
  S3ClientListOutput,
} from '../../../src/private/data/common/s3Client'

export class DraftEmailMessageDataFactory {
  static readonly s3ClientDownloadOutput: S3ClientDownloadOutput = {
    lastModified: new Date(),
    body: 'downloadedDraft',
    metadata: { 'key-id': 'testKeyId', algorithm: 'AES/CBC/PKCS7Padding' },
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

  static readonly getDraftInput = {
    id: 'testId',
    emailAddressId: 'testEmailAddressId',
  }

  static listDraftsWithPrefix(
    identityId: string,
    emailAddressId: string,
    draftEmailMessage: string,
    numberOfDrafts: number,
  ): S3ClientListOutput[] {
    const now = Date.now()
    const prefix = `${identityId}/email/${emailAddressId}/draft`
    return _.range(numberOfDrafts).map((i) => ({
      key: `${prefix}/${draftEmailMessage}${i}`,
      lastModified: new Date(now + i),
    }))
  }
}
