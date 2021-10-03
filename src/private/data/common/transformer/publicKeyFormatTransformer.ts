import { PublicKeyFormat, ServiceError } from '@sudoplatform/sudo-common'
import { DeviceKeyWorkerKeyFormat } from '../deviceKeyWorker'

export class PublicKeyFormatTransformer {
  toDeviceKeyWorkerKeyFormat(
    publicKeyFormat: PublicKeyFormat,
  ): DeviceKeyWorkerKeyFormat {
    switch (publicKeyFormat) {
      case PublicKeyFormat.RSAPublicKey:
        return DeviceKeyWorkerKeyFormat.RsaPublicKey
      case PublicKeyFormat.SPKI:
        return DeviceKeyWorkerKeyFormat.Spki
      default:
        throw new ServiceError('Invalid public key format')
    }
  }
}
