/**
 * Copyright © 2025 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { DefaultLogger } from '@sudoplatform/sudo-common'
import {
  anything,
  capture,
  instance,
  mock,
  reset,
  verify,
  when,
} from 'ts-mockito'
import { EmailAccountService } from '../../../../../../src/private/domain/entities/account/emailAccountService'
import { ProvisionEmailAccountUseCase } from '../../../../../../src/private/domain/use-cases/account/provisionEmailAccountUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'

const log = new DefaultLogger()

describe('ProvisionEmailAccountUseCase Test Suite', () => {
  const mockEmailAccountService = mock<EmailAccountService>()

  let instanceUnderTest: ProvisionEmailAccountUseCase

  beforeEach(() => {
    reset(mockEmailAccountService)
    instanceUnderTest = new ProvisionEmailAccountUseCase(
      instance(mockEmailAccountService),
    )
  })

  describe('execute', () => {
    it('email account is provisioned correctly with existing key pair', async () => {
      when(mockEmailAccountService.create(anything())).thenResolve(
        EntityDataFactory.emailAccount,
      )
      const result = await instanceUnderTest.execute({
        emailAddressEntity: EntityDataFactory.emailAccount.emailAddress,
        ownershipProofToken: EntityDataFactory.owner.id,
      })
      expect(result).toStrictEqual(EntityDataFactory.emailAccount)

      const [inputArgs] = capture(mockEmailAccountService.create).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddressEntity: EntityDataFactory.emailAccount.emailAddress,
        ownershipProofToken: EntityDataFactory.owner.id,
        allowSymmetricKeyGeneration: true,
      })
      expect(result).toStrictEqual(EntityDataFactory.emailAccount)
      verify(mockEmailAccountService.create(anything())).once()
    })

    it('passes allowSymmetricKeyGeneration properly', async () => {
      when(mockEmailAccountService.create(anything())).thenResolve(
        EntityDataFactory.emailAccount,
      )
      await instanceUnderTest.execute({
        emailAddressEntity: EntityDataFactory.emailAccount.emailAddress,
        ownershipProofToken: EntityDataFactory.owner.id,
        allowSymmetricKeyGeneration: false,
      })

      const [inputArgs] = capture(mockEmailAccountService.create).first()
      expect(inputArgs).toStrictEqual<typeof inputArgs>({
        emailAddressEntity: EntityDataFactory.emailAccount.emailAddress,
        ownershipProofToken: EntityDataFactory.owner.id,
        allowSymmetricKeyGeneration: false,
      })
      verify(mockEmailAccountService.create(anything())).once()
    })
  })
})
