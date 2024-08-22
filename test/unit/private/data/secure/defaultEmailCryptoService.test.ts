import {
  Base64,
  DecodeError,
  EncryptionAlgorithm,
} from '@sudoplatform/sudo-common'
import {
  anything,
  capture,
  instance,
  mock,
  reset,
  verify,
  when,
} from 'ts-mockito'
import { v4 } from 'uuid'
import { EmailAttachment, InvalidArgumentError } from '../../../../../src'
import { DeviceKeyWorker } from '../../../../../src/private/data/common/deviceKeyWorker'
import { DefaultEmailCryptoService } from '../../../../../src/private/data/secure/defaultEmailCryptoService'
import { SealedKeyTransformer } from '../../../../../src/private/data/secure/transformer/sealedKeyTransformer'
import { SecureDataTransformer } from '../../../../../src/private/data/secure/transformer/secureDataTransformer'
import { EmailCryptoService } from '../../../../../src/private/domain/entities/secure/emailCryptoService'
import { SecureData } from '../../../../../src/private/domain/entities/secure/secureData'
import { SecureEmailAttachmentType } from '../../../../../src/private/domain/entities/secure/secureEmailAttachmentType'
import { SecurePackage } from '../../../../../src/private/domain/entities/secure/securePackage'
import {
  arrayBufferToString,
  stringToArrayBuffer,
} from '../../../../../src/private/util/buffer'
import { EmailAddressPublicInfoEntity } from '../../../../../src/private/domain/entities/account/emailAddressPublicInfoEntity'

describe('DefaultEmailCryptoService Test Suite', () => {
  const mockDeviceKeyWorker = mock<DeviceKeyWorker>()

  let instanceUnderTest: EmailCryptoService

  let mockSymmetricKey: ArrayBuffer
  let mockEncryptedData: ArrayBuffer
  let mockIv: ArrayBuffer
  let mockSealedSymmetricKey: ArrayBuffer
  let mockData: ArrayBuffer
  let mockEmailAddressPublicInfo: EmailAddressPublicInfoEntity[]

  beforeEach(() => {
    reset(mockDeviceKeyWorker)

    instanceUnderTest = new DefaultEmailCryptoService(
      instance(mockDeviceKeyWorker),
    )

    mockSymmetricKey = stringToArrayBuffer(v4())
    mockIv = stringToArrayBuffer(v4())
    mockEncryptedData = stringToArrayBuffer(v4())
    mockSealedSymmetricKey = stringToArrayBuffer(v4())
    mockData = stringToArrayBuffer(`mockData-${v4()}`)
    mockEmailAddressPublicInfo = [
      {
        emailAddress: 'foobar@example.com',
        keyId: `keyId-${v4()}`,
        publicKey: 'mockPublicKey1',
      },
      {
        emailAddress: 'foobar2@example.com',
        keyId: `keyId-${v4()}`,
        publicKey: 'mockPublicKey2',
      },
    ]

    when(mockDeviceKeyWorker.generateRandomSymmetricKey()).thenResolve(
      mockSymmetricKey,
    )
    when(mockDeviceKeyWorker.generateRandomData(anything())).thenResolve(mockIv)
    when(mockDeviceKeyWorker.encryptWithSymmetricKey(anything())).thenResolve(
      mockEncryptedData,
    )
    when(mockDeviceKeyWorker.encryptWithPublicKey(anything())).thenResolve(
      mockSealedSymmetricKey,
    )

    when(mockDeviceKeyWorker.unsealWithKeyPairId(anything())).thenResolve(
      mockData,
    )
    when(mockDeviceKeyWorker.keyExists(anything(), anything())).thenResolve(
      true,
    )
  })

  describe('encrypt', () => {
    it('throws if data is empty', async () => {
      const data = new ArrayBuffer(0)

      await expect(
        instanceUnderTest.encrypt(data, mockEmailAddressPublicInfo),
      ).rejects.toThrow(InvalidArgumentError)
    })

    it('throws if no email address public info passed', async () => {
      await expect(instanceUnderTest.encrypt(mockData, [])).rejects.toThrow(
        InvalidArgumentError,
      )
    })

    it('generates a random iv and seals the data', async () => {
      await instanceUnderTest.encrypt(mockData, mockEmailAddressPublicInfo)

      verify(mockDeviceKeyWorker.generateRandomSymmetricKey()).once()
      verify(mockDeviceKeyWorker.generateRandomData(anything())).once()
      const [randomDataSize] = capture(
        mockDeviceKeyWorker.generateRandomData,
      ).first()
      expect(randomDataSize).toEqual(16)
      verify(mockDeviceKeyWorker.encryptWithSymmetricKey(anything())).once()
      const [symmKeyArg] = capture(
        mockDeviceKeyWorker.encryptWithSymmetricKey,
      ).first()
      expect(symmKeyArg.key).toEqual(mockSymmetricKey)
      expect(symmKeyArg.data).toEqual(mockData)
      expect(symmKeyArg.iv).toEqual(mockIv)
      const [pubKeyArg] = capture(
        mockDeviceKeyWorker.encryptWithPublicKey,
      ).first()
      expect(pubKeyArg.key).toEqual(
        Base64.decode(mockEmailAddressPublicInfo[0].publicKey),
      )
      expect(pubKeyArg.data).toEqual(mockData)
      expect(pubKeyArg.algorithm).toEqual(EncryptionAlgorithm.RsaOaepSha1)
    })

    it('returns a SecurePackage containing the sealed body and sealed keys as attachments', async () => {
      const result = await instanceUnderTest.encrypt(
        mockData,
        mockEmailAddressPublicInfo,
      )
      const resultArray = result.toArray()
      const mockSecureData: SecureData = {
        encryptedData: mockEncryptedData,
        initVectorKeyID: mockIv,
      }

      // Number of recipients plus 1 for the body
      expect(resultArray).toHaveLength(mockEmailAddressPublicInfo.length + 1)
      expect(resultArray).toContainEqual<EmailAttachment>({
        contentTransferEncoding: 'binary',
        data: SecureDataTransformer.toJson(mockSecureData),
        filename: SecureEmailAttachmentType.BODY.fileName,
        inlineAttachment: false,
        mimeType: SecureEmailAttachmentType.BODY.mimeType,
        contentId: SecureEmailAttachmentType.BODY.contentId,
      })
      mockEmailAddressPublicInfo.forEach((publicInfo, index) => {
        expect(resultArray).toContainEqual<EmailAttachment>({
          contentTransferEncoding: 'binary',
          data: SealedKeyTransformer.toJson({
            publicKeyId: publicInfo.keyId,
            encryptedKey: Base64.encode(mockSealedSymmetricKey),
            algorithm: EncryptionAlgorithm.RsaOaepSha1,
          }),
          filename: `${SecureEmailAttachmentType.KEY_EXCHANGE.fileName} ${
            index + 1
          }`,
          inlineAttachment: false,
          mimeType: SecureEmailAttachmentType.KEY_EXCHANGE.mimeType,
          contentId: SecureEmailAttachmentType.KEY_EXCHANGE.contentId,
        })
      })
    })
  })

  describe('decrypt', () => {
    let mockBodyAttachment: EmailAttachment
    let mockKeyAttachments: Set<EmailAttachment>
    let mockSecurePackage: SecurePackage
    beforeEach(() => {
      const mockSecureData: SecureData = {
        encryptedData: mockEncryptedData,
        initVectorKeyID: mockIv,
      }
      mockBodyAttachment = {
        contentTransferEncoding: 'binary',
        data: SecureDataTransformer.toJson(mockSecureData),
        filename: SecureEmailAttachmentType.BODY.fileName,
        inlineAttachment: false,
        mimeType: SecureEmailAttachmentType.BODY.mimeType,
        contentId: SecureEmailAttachmentType.BODY.contentId,
      }
      mockKeyAttachments = new Set(
        mockEmailAddressPublicInfo.map((publicInfo, index) => ({
          contentTransferEncoding: 'binary',
          data: SealedKeyTransformer.toJson({
            publicKeyId: publicInfo.keyId,
            encryptedKey: Base64.encode(mockSealedSymmetricKey),
            algorithm: EncryptionAlgorithm.RsaOaepSha1,
          }),
          filename: `${SecureEmailAttachmentType.KEY_EXCHANGE.fileName} ${
            index + 1
          }`,
          inlineAttachment: false,
          mimeType: SecureEmailAttachmentType.KEY_EXCHANGE.mimeType,
          contentId: SecureEmailAttachmentType.KEY_EXCHANGE.contentId,
        })),
      )
      mockSecurePackage = new SecurePackage(
        mockKeyAttachments,
        mockBodyAttachment,
      )
    })

    it('throws DecodeError if no keys for user found', async () => {
      when(mockDeviceKeyWorker.keyExists(anything(), anything())).thenResolve(
        false,
      )

      await expect(
        instanceUnderTest.decrypt(mockSecurePackage),
      ).rejects.toThrow(DecodeError)
    })

    it('checks each key attachment to see if the key exists', async () => {
      when(mockDeviceKeyWorker.keyExists(anything(), anything()))
        .thenResolve(false)
        .thenResolve(true)

      await instanceUnderTest.decrypt(mockSecurePackage)

      verify(mockDeviceKeyWorker.keyExists(anything(), anything())).times(
        mockKeyAttachments.size,
      )
    })

    it('uses the existing keyid to unseal the data', async () => {
      const result = await instanceUnderTest.decrypt(mockSecurePackage)

      verify(mockDeviceKeyWorker.unsealWithKeyPairId(anything())).once()
      const [inputArgs] = capture(
        mockDeviceKeyWorker.unsealWithKeyPairId,
      ).first()
      expect(arrayBufferToString(inputArgs.iv!)).toEqual(
        arrayBufferToString(mockIv),
      )
      expect(inputArgs.keyPairId).toEqual(mockEmailAddressPublicInfo[0].keyId)
      expect(arrayBufferToString(inputArgs.sealedCipherKey)).toEqual(
        arrayBufferToString(mockSealedSymmetricKey),
      )
      expect(arrayBufferToString(inputArgs.sealedPayload)).toEqual(
        arrayBufferToString(mockEncryptedData),
      )

      expect(result).toEqual(mockData)
    })
  })
})
