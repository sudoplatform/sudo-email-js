/*
 * Copyright © 2024 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  anything,
  capture,
  instance,
  mock,
  reset,
  verify,
  when,
} from 'ts-mockito'
import {
  EmailAccountService,
  LookupEmailAddressesPublicInfoInput,
} from '../../../../../../src/private/domain/entities/account/emailAccountService'
import { EntityDataFactory } from '../../../../data-factory/entity'
import { LookupEmailAddressesPublicInfoUseCase } from '../../../../../../src/private/domain/use-cases/account/lookupEmailAddressesPublicInfoUseCase'
import { EmailAddressPublicInfoEntity } from '../../../../../../src/private/domain/entities/account/emailAddressPublicInfoEntity'

describe('lookupEmailAddressesPublicInfoUseCase Test Suite', () => {
  const mockEmailAccountService = mock<EmailAccountService>()

  let instanceUnderTest: LookupEmailAddressesPublicInfoUseCase

  beforeEach(() => {
    reset(mockEmailAccountService)
    instanceUnderTest = new LookupEmailAddressesPublicInfoUseCase(
      instance(mockEmailAccountService),
    )
  })

  describe('execute', () => {
    const inputEmailAddresses: string[] =
      EntityDataFactory.emailAddressesPublicInfo.map(
        ({ emailAddress }) => emailAddress,
      )

    it('completes successfully', async () => {
      when(mockEmailAccountService.lookupPublicInfo(anything())).thenResolve(
        EntityDataFactory.emailAddressesPublicInfo,
      )

      await expect(
        instanceUnderTest.execute({
          emailAddresses: inputEmailAddresses,
        }),
      ).resolves.toStrictEqual<EmailAddressPublicInfoEntity[]>(
        EntityDataFactory.emailAddressesPublicInfo,
      )

      verify(mockEmailAccountService.lookupPublicInfo(anything())).once()
      const [inputArgs] = capture(
        mockEmailAccountService.lookupPublicInfo,
      ).first()
      expect(inputArgs).toStrictEqual<LookupEmailAddressesPublicInfoInput>({
        emailAddresses: inputEmailAddresses,
      })
    })

    it('completes successfully with empty result items', async () => {
      when(mockEmailAccountService.lookupPublicInfo(anything())).thenResolve([])

      await expect(
        instanceUnderTest.execute({ emailAddresses: [] }),
      ).resolves.toStrictEqual<EmailAddressPublicInfoEntity[]>([])

      verify(mockEmailAccountService.lookupPublicInfo(anything())).once()
      const [inputArgs] = capture(
        mockEmailAccountService.lookupPublicInfo,
      ).first()
      expect(inputArgs).toStrictEqual<LookupEmailAddressesPublicInfoInput>({
        emailAddresses: [],
      })
    })
  })
})
