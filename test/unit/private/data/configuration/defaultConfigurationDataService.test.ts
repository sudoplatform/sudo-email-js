import { instance, mock, reset, verify, when } from 'ts-mockito'
import { ApiClient } from '../../../../../src/private/data/common/apiClient'
import { DefaultConfigurationDataService } from '../../../../../src/private/data/configuration/defaultConfigurationDataService'
import { EntityDataFactory } from '../../../data-factory/entity'
import { GraphQLDataFactory } from '../../../data-factory/graphQL'

describe('DefaultConfigurationDataService Test Suite', () => {
  const mockAppSync = mock<ApiClient>()
  let instanceUnderTest: DefaultConfigurationDataService

  beforeEach(() => {
    reset(mockAppSync)
    instanceUnderTest = new DefaultConfigurationDataService(
      instance(mockAppSync),
    )
  })

  describe('getConfigurationData', () => {
    it('calls appsync correctly', async () => {
      when(mockAppSync.getConfigurationData()).thenResolve(
        GraphQLDataFactory.configurationData,
      )
      const result = await instanceUnderTest.getConfigurationData()
      verify(mockAppSync.getConfigurationData()).once()
      expect(result).toEqual(EntityDataFactory.configurationData)
    })
  })
})
