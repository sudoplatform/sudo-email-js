import { DefaultLogger } from '@sudoplatform/sudo-common'
import { S3UploadError } from '@sudoplatform/sudo-profiles'
import { SudoUserClient } from '@sudoplatform/sudo-user'
import { IdentityServiceConfig } from '@sudoplatform/sudo-user/lib/sdk'
import { AWSError } from 'aws-sdk'
import S3 from 'aws-sdk/clients/s3'
import { CognitoIdentityCredentials } from 'aws-sdk/lib/core'
import _ from 'lodash'

interface GetAWSS3Input {
  bucket: string
  region: string
}

interface S3ClientUploadInput {
  bucket: string
  region: string
  key: string
  body: string
  metadata?: Record<string, string>
}

interface S3ClientDownloadInput {
  bucket: string
  region: string
  key: string
}
// exported for testing
export interface S3ClientDownloadOutput {
  body: string
  metadata?: Record<string, string>
}

interface S3ClientDeleteInput {
  bucket: string
  region: string
  key: string
}

interface S3ClientListInput {
  bucket: string
  region: string
  prefix: string
}

export enum S3Error {
  NoSuchKey = 404,
}

interface S3ErrorOptions {
  key: string
  code?: number
  msg?: string
}
export class S3DeleteError extends Error {
  readonly key: string
  constructor({ key }: S3ErrorOptions) {
    super(`Failed to delete Key: ${key}`)
    this.key = key
  }
}

export class S3DownloadError extends Error {
  readonly code?: number
  constructor({ code, msg }: S3ErrorOptions) {
    if (msg) {
      if (code) {
        msg = `${msg} - ERRCODE: ${code}`
      }
      super(msg)
    } else {
      let msg = 'Failed to download'
      if (code) {
        msg = `${msg} - ERRCODE: ${code}`
      }
      super(msg)
    }
    this.code = code
  }
}

export class S3Client {
  private readonly log = new DefaultLogger(this.constructor.name)
  private readonly providerName: string

  constructor(
    private readonly userClient: SudoUserClient,
    private readonly identityServiceConfig: IdentityServiceConfig,
  ) {
    this.providerName = `cognito-idp.${this.identityServiceConfig.region}.amazonaws.com/${this.identityServiceConfig.poolId}`
  }

  private async getAWSS3({ bucket, region }: GetAWSS3Input): Promise<S3> {
    const authToken = await this.userClient.getLatestAuthToken()
    const credentials = new CognitoIdentityCredentials(
      {
        IdentityPoolId: this.identityServiceConfig.identityPoolId,
        Logins: {
          [this.providerName]: authToken,
        },
      },
      { region },
    )
    await credentials.getPromise()
    const awsS3 = new S3({
      region,
      credentials,
      params: { bucket: bucket },
    })
    return awsS3
  }

  async upload({
    bucket,
    region,
    key,
    body,
    metadata,
  }: S3ClientUploadInput): Promise<string> {
    this.log.debug('S3 upload', { bucket, region, key, body, metadata })
    const awsS3 = await this.getAWSS3({ bucket, region })
    const managedUpload = new S3.ManagedUpload({
      service: awsS3,
      params: {
        Bucket: bucket,
        Key: key,
        Body: body,
        Metadata: metadata,
      },
    })
    managedUpload.on('httpUploadProgress', (progress) => {
      this.log.debug('httpUploadProgress', { progress })
    })
    try {
      const response = await managedUpload.promise()
      this.log.debug('Upload response', { response })
      return response.Key
    } catch (err: unknown) {
      const error = err as Error
      if (error.message) {
        throw new S3UploadError(error.message)
      } else {
        throw new S3UploadError('error')
      }
    }
  }

  async download({
    bucket,
    region,
    key,
  }: S3ClientDownloadInput): Promise<S3ClientDownloadOutput> {
    try {
      const awsS3 = await this.getAWSS3({ bucket, region })
      const response = await awsS3
        .getObject({ Bucket: bucket, Key: key })
        .promise()
      let body: string
      if (!response.Body) {
        throw new S3DownloadError({ msg: 'Did not find file to download', key })
      }
      if (typeof response.Body === 'string') {
        body = response.Body
      } else if (ArrayBuffer.isView(response.Body)) {
        body = new TextDecoder().decode(response.Body)
      } else {
        throw new S3DownloadError({ msg: 'Object type is not supported', key })
      }
      if (response.Metadata) {
        return { body, metadata: response.Metadata }
      } else {
        return { body }
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: unknown) {
      const error = err as Error & { code?: string | number }
      if (typeof error.code === 'string') {
        this.log.error(`${error.code}: ${error.message}`)
        if (error.code === 'NoSuchKey') {
          throw new S3DownloadError({
            msg: error.message,
            code: S3Error.NoSuchKey,
            key,
          })
        }
      } else {
        this.log.error(error.message)
      }

      throw new S3DownloadError({
        msg: error.message,
        key,
      })
    }
  }

  async list({ bucket, region, prefix }: S3ClientListInput): Promise<string[]> {
    const awsS3 = await this.getAWSS3({ bucket, region })
    const result = await awsS3
      .listObjectsV2({
        Bucket: bucket,
        Prefix: prefix,
      })
      .promise()

    return _(result.Contents).flatMap().flatMap<string>('Key').value()
  }

  async delete({ bucket, region, key }: S3ClientDeleteInput): Promise<string> {
    try {
      const awsS3 = await this.getAWSS3({ bucket, region })
      await awsS3.deleteObject({ Bucket: bucket, Key: key }).promise()
      return key
    } catch (err: unknown) {
      const error = err as AWSError
      this.log.error(`${error.code}: ${error.message}`)
      throw new S3DeleteError({ key: key })
    }
  }
}
