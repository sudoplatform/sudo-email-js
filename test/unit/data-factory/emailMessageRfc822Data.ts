import { IdentityServiceConfig } from '@sudoplatform/sudo-user/lib/sdk'
import _ from 'lodash'
import { S3ClientDownloadOutput } from '../../../src/private/data/common/s3Client'

export class EmailMessageRfc822DataFactory {
  static readonly s3ClientDownloadOutput: S3ClientDownloadOutput = {
    lastModified: new Date(),
    body: 'downloadedRfc822Data',
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

  static readonly getRfc822DataInput = {
    id: 'testId',
    emailAddressId: 'testEmailAddressId',
  }

  static listEmailMessagesRfc822DsataWithPrefix(
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
}
