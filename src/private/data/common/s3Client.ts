/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  CompleteMultipartUploadOutput,
  NoSuchKey,
  NotFound,
  S3,
} from '@aws-sdk/client-s3'
import { fromCognitoIdentityPool } from '@aws-sdk/credential-providers'
import { Upload } from '@aws-sdk/lib-storage'
import { DefaultLogger, Logger } from '@sudoplatform/sudo-common'
import {
  SudoUserClient,
  internal as SudoUserInternal,
} from '@sudoplatform/sudo-user'
import _ from 'lodash'
import { S3UploadError } from '../../../public'

interface GetAWSS3Input {
  region: string
}

interface S3ClientUploadInput {
  bucket: string
  region: string
  key: string
  body: string
  metadata?: Record<string, string>
}

export interface S3ClientUploadOutput {
  key: string
  lastModified: Date
}

interface S3ClientDownloadInput {
  bucket: string
  region: string
  key: string
}
// exported for testing
export interface S3ClientDownloadOutput {
  lastModified: Date
  body: string
  metadata?: Record<string, string>
  contentEncoding?: string
}

interface S3ClientGetHeadObjectDataInput {
  bucket: string
  region: string
  key: string
}

export interface S3ClientGetHeadObjectDataOutput {
  lastModified: Date
  metadata?: Record<string, string>
  contentEncoding?: string
}

export interface S3ClientListOutput {
  key: string
  lastModified: Date
}

interface S3ClientDeleteInput {
  bucket: string
  region: string
  key: string
}

interface S3ClientBulkDeleteInput {
  bucket: string
  region: string
  keys: string[]
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
  readonly msg?: string
  constructor({ key, msg }: S3ErrorOptions) {
    super(`Failed to delete Key: ${key}`)
    this.key = key
    this.msg = msg
  }
}

export class S3BulkDeleteError extends Error {
  readonly keys: string[]
  readonly msg?: string
  constructor({ keys, msg }: { keys: string[]; msg?: string }) {
    super(`Failed to delete Keys: ${keys}`)
    this.keys = keys
    this.msg = msg
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

export class S3GetHeadObjectDataError extends Error {
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
  private readonly log: Logger
  private readonly providerName: string

  constructor(
    private readonly userClient: SudoUserClient,
    private readonly identityServiceConfig: SudoUserInternal.IdentityServiceConfig,
  ) {
    this.log = new DefaultLogger(this.constructor.name)
    this.providerName = `cognito-idp.${this.identityServiceConfig.region}.amazonaws.com/${this.identityServiceConfig.poolId}`
  }

  private async getAWSS3({ region }: GetAWSS3Input): Promise<S3> {
    const authToken = await this.userClient.getLatestAuthToken()
    const credentials = fromCognitoIdentityPool({
      identityPoolId: this.identityServiceConfig.identityPoolId,
      logins: {
        [this.providerName]: authToken,
      },
      clientConfig: { region },
    })
    const awsS3 = new S3({
      region,
      credentials,
    })
    return awsS3
  }

  async upload({
    bucket,
    region,
    key,
    body,
    metadata,
  }: S3ClientUploadInput): Promise<S3ClientUploadOutput> {
    this.log.debug('S3 upload', { bucket, region, key, body, metadata })
    const awsS3 = await this.getAWSS3({ region })
    const managedUpload = new Upload({
      client: awsS3,
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
      const response: CompleteMultipartUploadOutput = await managedUpload.done()
      let lastModified: Date | undefined
      try {
        const head = await awsS3.headObject({
          Bucket: bucket,
          Key: response.Key,
        })
        if (!head.LastModified) {
          const message = 'No last modified timestamp in head response'
          this.log.error(message, {
            head,
          })
          throw new S3UploadError(message)
        }
        lastModified = head.LastModified
      } catch (err) {
        const error = err as Error
        this.log.error('Unable to get HEAD of just created object', { error })
        throw new S3UploadError(error.message)
      }

      return {
        key,
        lastModified,
      }
    } catch (err) {
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
    this.log.debug('S3 download', { bucket, key })
    try {
      const awsS3 = await this.getAWSS3({ region })
      const response = await awsS3.getObject({ Bucket: bucket, Key: key })
      if (!response.LastModified) {
        throw new S3DownloadError({
          msg: 'No last modified timestamp in response',
          key,
        })
      }
      const lastModified = response.LastModified

      if (!response.Body) {
        throw new S3DownloadError({ msg: 'Did not find file to download', key })
      }
      const body = await response.Body.transformToString()

      const result: S3ClientDownloadOutput = {
        lastModified,
        body,
        contentEncoding: response.ContentEncoding,
      }
      if (response.Metadata) {
        result.metadata = response.Metadata
      }
      return result
    } catch (err: unknown) {
      this.log.error('s3Client download error', { err })
      if (err instanceof NoSuchKey) {
        throw new S3DownloadError({
          msg: err.message,
          code: S3Error.NoSuchKey,
          key,
        })
      }
      const error = err as Error

      throw new S3DownloadError({
        msg: error.message,
        key,
      })
    }
  }

  async list({
    bucket,
    region,
    prefix,
  }: S3ClientListInput): Promise<S3ClientListOutput[]> {
    const awsS3 = await this.getAWSS3({ region })
    const result = await awsS3.listObjectsV2({
      Bucket: bucket,
      Prefix: prefix,
    })

    return _(result.Contents)
      .flatMap()
      .filter((value) => {
        if (value.Key && value.LastModified && value.Size !== undefined)
          return true
        this.log.error('listed S3 item has missing Key or LastModified', {
          bucket,
          prefix,
          value,
        })
        return false
      })
      .map((value) => ({
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        key: value.Key!,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        lastModified: value.LastModified!,
        // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
        size: value.Size!,
      }))
      .value()
  }

  async delete({ bucket, region, key }: S3ClientDeleteInput): Promise<string> {
    try {
      const awsS3 = await this.getAWSS3({ region })
      await awsS3.deleteObject({ Bucket: bucket, Key: key })
      return key
    } catch (err: unknown) {
      const error = err as Error

      this.log.error(`${error.name}: ${error.message}`)
      throw new S3DeleteError({ key: key, msg: error.message })
    }
  }

  /**
   * Deletes the objects with the given keys. Returns the key and reason for any failed deletions.
   *
   * @param {S3ClientBulkDeleteInput} input Input to delete
   * @returns Array of objects each containing the key and reason for a failed deletion
   */
  async bulkDelete({
    bucket,
    region,
    keys,
  }: S3ClientBulkDeleteInput): Promise<{ key: string; reason: string }[]> {
    try {
      const awsS3 = await this.getAWSS3({ region })
      const result = await awsS3.deleteObjects({
        Bucket: bucket,
        Delete: {
          Objects: keys.map((key) => ({
            Key: key,
          })),
        },
      })
      const failed: { key: string; reason: string }[] = []
      result.Errors?.forEach((err) => {
        this.log.error(`${err.Code}: ${err.Message} Key: ${err.Key}`)
        failed.push({
          key: err.Key ?? '',
          reason: err.Message ?? 'Unknown error',
        })
      })
      return failed
    } catch (err: unknown) {
      const error = err as Error

      this.log.error(`${error.name}: ${error.message}`)
      throw new S3BulkDeleteError({ keys, msg: error.message })
    }
  }

  async getHeadObjectData({
    bucket,
    region,
    key,
  }: S3ClientGetHeadObjectDataInput): Promise<
    S3ClientGetHeadObjectDataOutput | undefined
  > {
    try {
      const awsS3 = await this.getAWSS3({ region })
      const result = await awsS3.headObject({
        Bucket: bucket,
        Key: key,
      })

      if (!result) {
        return undefined
      }

      if (!result.LastModified) {
        throw new S3GetHeadObjectDataError({
          msg: 'No last modified timestamp in response',
          key,
        })
      }

      return {
        lastModified: result.LastModified,
        metadata: result.Metadata,
        contentEncoding: result.ContentEncoding,
      }
    } catch (err: unknown) {
      this.log.error('s3Client get head object error', { err })
      if (err instanceof NotFound) {
        throw new S3GetHeadObjectDataError({
          msg: err.message,
          code: S3Error.NoSuchKey,
          key,
        })
      }
      const error = err as Error

      throw new S3GetHeadObjectDataError({
        msg: error.message,
        key,
      })
    }
  }
}
