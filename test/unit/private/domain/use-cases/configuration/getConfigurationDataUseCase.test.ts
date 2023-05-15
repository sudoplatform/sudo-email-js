/*
 * Copyright © 2023 Anonyome Labs, Inc. All rights reserved.
 *
 * SPDX-License-Identifier: Apache-2.0
 */

import { instance, mock, reset, verify, when } from 'ts-mockito'
import { EmailConfigurationDataService } from '../../../../../../src/private/domain/entities/configuration/configurationDataService'
import { GetConfigurationDataUseCase } from '../../../../../../src/private/domain/use-cases/configuration/getConfigurationDataUseCase'
import { EntityDataFactory } from '../../../../data-factory/entity'

describe('GetConfigurationDataUseCase', () => {
  const mockConfigurationDataService = mock<EmailConfigurationDataService>()

  let instanceUnderTest: GetConfigurationDataUseCase

  beforeEach(() => {
    reset(mockConfigurationDataService)
    instanceUnderTest = new GetConfigurationDataUseCase(
      instance(mockConfigurationDataService),
    )
  })

  describe('execute', () => {
    it('completes successfully', async () => {
      when(mockConfigurationDataService.getConfigurationData()).thenResolve(
        EntityDataFactory.configurationData,
      )
      const result = await instanceUnderTest.execute()
      verify(mockConfigurationDataService.getConfigurationData()).once()
      expect(result).toStrictEqual(EntityDataFactory.configurationData)
    })
  })
})
