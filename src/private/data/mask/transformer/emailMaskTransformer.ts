/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  DefaultLogger,
  EncryptionAlgorithm,
  KeyNotFoundError,
  Logger,
} from '@sudoplatform/sudo-common'
import { DeviceKeyWorker, KeyType } from '../../common/deviceKeyWorker'
import {
  EmailMask as EmailMaskGraphQL,
  SealedAttribute,
} from '../../../../gen/graphqlTypes'
import { EmailMaskEntity } from '../../../domain/entities/mask/emailMaskEntity'
import { EmailMaskRealAddressTypeTransformer } from './emailMaskRealAddressTypeTransformer'
import { EmailMaskStatusTransformer } from './emailMaskStatusTransformer'
import { dateFromEpochSeconds } from '../../../util/date'
import { EmailMask } from '../../../../public'

export class EmailMaskTransformer {
  constructor(
    private readonly deviceKeyWorker: DeviceKeyWorker,
    private readonly log: Logger = new DefaultLogger(this.constructor.name),
  ) {}

  async graphQLToEntity(data: EmailMaskGraphQL): Promise<EmailMaskEntity> {
    const entity: EmailMaskEntity = {
      id: data.id,
      owner: data.owner,
      owners: data.owners,
      identityId: data.identityId,
      maskAddress: data.maskAddress,
      realAddress: data.realAddress,
      realAddressType: EmailMaskRealAddressTypeTransformer.graphQLToEntity(
        data.realAddressType,
      ),
      status: EmailMaskStatusTransformer.graphQLToEntity(data.status),
      inboundReceived: data.inboundReceived,
      inboundDelivered: data.inboundDelivered,
      outboundReceived: data.outboundReceived,
      outboundDelivered: data.outboundDelivered,
      spamCount: data.spamCount,
      virusCount: data.virusCount,
      version: data.version,
      expiresAt: data.expiresAtEpochSec
        ? dateFromEpochSeconds(data.expiresAtEpochSec)
        : undefined,
      createdAt: new Date(data.createdAtEpochMs),
      updatedAt: new Date(data.updatedAtEpochMs),
    }

    if (data.metadata) {
      try {
        const metadata = await this.unsealMetadata(data.metadata)
        entity.metadata = metadata
      } catch (e) {
        this.log.error('error ', { e })
        entity.metadata = e as Error
      }
    }
    return entity
  }

  static async entityToApi(entity: EmailMaskEntity): Promise<EmailMask> {
    return {
      id: entity.id,
      owner: entity.owner,
      owners: entity.owners,
      identityId: entity.identityId,
      maskAddress: entity.maskAddress,
      realAddress: entity.realAddress,
      realAddressType: EmailMaskRealAddressTypeTransformer.entityToApi(
        entity.realAddressType,
      ),
      status: EmailMaskStatusTransformer.entityToApi(entity.status),
      inboundReceived: entity.inboundReceived,
      inboundDelivered: entity.inboundDelivered,
      outboundReceived: entity.outboundReceived,
      outboundDelivered: entity.outboundDelivered,
      spamCount: entity.spamCount,
      virusCount: entity.virusCount,
      version: entity.version,
      expiresAt: entity.expiresAt,
      createdAt: entity.createdAt,
      updatedAt: entity.updatedAt,
      metadata: entity.metadata,
    }
  }

  private async unsealMetadata(
    sealedMetadata: SealedAttribute,
  ): Promise<Record<string, any>> {
    const symmetricKeyExists = await this.deviceKeyWorker.keyExists(
      sealedMetadata.keyId,
      KeyType.SymmetricKey,
    )

    if (!symmetricKeyExists) {
      throw new KeyNotFoundError()
    }

    try {
      const unsealedString = await this.deviceKeyWorker.unsealString({
        encrypted: sealedMetadata.base64EncodedSealedData,
        keyId: sealedMetadata.keyId,
        keyType: KeyType.SymmetricKey,
        algorithm: EncryptionAlgorithm.AesCbcPkcs7Padding,
      })
      return JSON.parse(unsealedString)
    } catch (e) {
      this.log.warn('Could not unseal', { e })
      // Tolerate inability to unseal metadata. We have the correct
      // key so this is a decoding error
      return {}
    }
  }
}
