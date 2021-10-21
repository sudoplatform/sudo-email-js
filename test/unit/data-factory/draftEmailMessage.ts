import { IdentityServiceConfig } from '@sudoplatform/sudo-user/lib/sdk'
import _ from 'lodash'
import { S3ClientDownloadOutput } from '../../../src/private/data/common/s3Client'

export class DraftEmailMessageDataFactory {
  static readonly s3ClientDownloadOutput: S3ClientDownloadOutput = {
    body: 'downloadedDraft',
    metadata: { 'key-id': 'testKeyId', algorithm: 'testAlgorithm' },
  }

  static readonly identityServiceConfig: IdentityServiceConfig = {
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
  ): string[] {
    const prefix = `${identityId}/email/${emailAddressId}/draft`
    return _.range(numberOfDrafts).map(
      (i) => `${prefix}/${draftEmailMessage}${i}`,
    )
  }
}
