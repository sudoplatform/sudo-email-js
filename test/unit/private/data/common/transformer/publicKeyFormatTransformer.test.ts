import { PublicKeyFormat } from '@sudoplatform/sudo-common'
import { DeviceKeyWorkerKeyFormat } from '../../../../../../src/private/data/common/deviceKeyWorker'
import { PublicKeyFormatTransformer } from '../../../../../../src/private/data/common/transformer/publicKeyFormatTransformer'

describe('FetchPolicyTransformer Test Suite', () => {
  const instanceUnderTest = new PublicKeyFormatTransformer()

  describe('transformCachePolicy', () => {
    it.each`
      input                           | expected
      ${PublicKeyFormat.RSAPublicKey} | ${DeviceKeyWorkerKeyFormat.RsaPublicKey}
      ${PublicKeyFormat.SPKI}         | ${DeviceKeyWorkerKeyFormat.Spki}
    `(
      'converts cache policy ($input) to fetch policy ($expected)',
      ({ input, expected }) => {
        expect(
          instanceUnderTest.toDeviceKeyWorkerKeyFormat(input),
        ).toStrictEqual(expected)
      },
    )
  })
})
