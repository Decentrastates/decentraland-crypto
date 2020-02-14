import * as chai from 'chai'
import * as chaiAsPromised from 'chai-as-promised'
import * as sinon from 'sinon'
import * as EthCrypto from 'eth-crypto'
import { HttpProvider } from 'web3x/providers'

import {
  Authenticator,
  getEphemeralSignatureType,
  ECDSA_EIP_1654_EPHEMERAL_VALIDATOR,
  ECDSA_PERSONAL_EPHEMERAL_VALIDATOR
} from '../src/Authenticator'
import { AuthLinkType, AuthChain } from '../src/types'
import { moveMinutes } from '../src/helper/utils'

chai.use(chaiAsPromised)
const expect = chai.expect

const PERSONAL_SIGNATURE =
  '0x49c5d57fc804e6a06f83ee8d499aec293a84328766864d96349db599ef9ebacc072892ec1f3e2777bdc8265b53d8b84edd646bdc711dd5290c18adcc5de4a2831b'
const CONTRACT_WALLET_SIGNATURE =
  '0xea441043d745d130e8a2560d7c5e8a9e9d9dae8530015f3bd90eaea5040c81ca419a2a2f29c48439985a58fa7aa7b4bb06e4111a054bfa8095b65b2f3c1ecae41ccdb959d51dda310325d0294cf6a9f0691d08abfb9978d4f2e7e504042b663ef2123712bf864ef161cf579c4b3e3faf3767865a5bb4535d9fc2b9f6664e403d241b'

describe('Decentraland Crypto', function () {
  this.timeout(999999)

  describe('Get signature type', function () {
    it('should return the correct signature type', function () {
      expect(getEphemeralSignatureType(PERSONAL_SIGNATURE)).to.be.equal(
        AuthLinkType.ECDSA_PERSONAL_EPHEMERAL
      )

      expect(getEphemeralSignatureType(CONTRACT_WALLET_SIGNATURE)).to.be.equal(
        AuthLinkType.ECDSA_EIP_1654_EPHEMERAL
      )
    })
  })

  describe('Validate Signature', function () {
    it('should validate request :: personal sign', async function () {
      const identity = EthCrypto.createIdentity()
      const ephemeral = EthCrypto.createIdentity()
      const chain = Authenticator.createAuthChain(
        identity,
        ephemeral,
        5,
        'message'
      )
      const isValid = await Authenticator.validateSignature(
        'message',
        chain,
        new HttpProvider(
          'https://mainnet.infura.io/v3/640777fe168f4b0091c93726b4f0463a'
        )
      )

      expect(isValid).to.be.equal(true)
    })

    it('should validate requiest :: EIP 1654', async function () {
      const clock = sinon.useFakeTimers(0)
      const chain: AuthChain = [
        {
          type: AuthLinkType.SIGNER,
          payload: '0x3b21028719a4aca7ebee35b0157a6f1b0cf0d0c5',
          signature: ''
        },
        {
          type: AuthLinkType.ECDSA_EIP_1654_EPHEMERAL,
          payload:
            'Decentraland Login\nEphemeral address: 0x69fBdE5Da06eb76e8E7F6Fd2FEEd968F28b951a5\nExpiration: Tue Aug 06 7112 10:14:51 GMT-0300 (Argentina Standard Time)',
          signature:
            '0x03524dbe44d19aacc8162b4d5d17820c370872de7bfd25d1add2b842adb1de546b454fc973b6d215883c30f4c21774ae71683869317d773f27e6bfaa9a2a05101b36946c3444914bb93f17a29d88e2449bcafdb6478b4835102c522197fa6f63d13ce5ab1d5c11c95db0c210fb4380995dff672392e5569c86d7c6bb2a44c53a151c'
        },
        {
          type: AuthLinkType.ECDSA_SIGNED_ENTITY,
          payload: 'QmUsqJaHc5HQaBrojhBdjF4fr5MQc6CqhwZjqwhVRftNAo',
          signature:
            '0xd73b0315dd39080d9b6d1a613a56732a75d68d2cef2a38f3b7be12bdab3c59830c92c6bdf394dcb47ba1aa736e0338cf9112c9eee59dbe4109b8af6a993b12d71b'
        }
      ]

      const isValid = await Authenticator.validateSignature(
        'QmUsqJaHc5HQaBrojhBdjF4fr5MQc6CqhwZjqwhVRftNAo',
        chain,
        new HttpProvider(
          'https://mainnet.infura.io/v3/640777fe168f4b0091c93726b4f0463a'
        )
      )

      // Restore
      clock.restore()

      expect(isValid).to.be.equal(true)
    })

    it('should validate a signature :: EIP 1654', async function () {
      // Date.now() should return 0 to avoid expiration
      const clock = sinon.useFakeTimers(0)
      const ephemeral = '0x1F19d3EC0BE294f913967364c1D5B416e6A74555'
      const authority = '0x3B21028719a4ACa7EBee35B0157a6F1B0cF0d0c5'
      const authLink = {
        type: AuthLinkType.ECDSA_EIP_1654_EPHEMERAL,
        payload: `Decentraland Login\nEphemeral address: ${ephemeral}\nExpiration: Tue Jan 21 2020 16:34:32 GMT+0000 (Coordinated Universal Time)`,
        signature: CONTRACT_WALLET_SIGNATURE
      }

      const res = await ECDSA_EIP_1654_EPHEMERAL_VALIDATOR(
        authority,
        authLink,
        { provider: new HttpProvider('https://mainnet.infura.io/v3/640777fe168f4b0091c93726b4f0463a') }
      )

      // Restore
      clock.restore()

      expect(res.nextAuthority).to.be.equal(ephemeral)
    })

    it('should support /r :: EIP 1654', async function () {
      // Date.now() should return 0 to avoid expiration
      const clock = sinon.useFakeTimers(0)
      const ephemeral = '0x1F19d3EC0BE294f913967364c1D5B416e6A74555'
      const authority = '0x3B21028719a4ACa7EBee35B0157a6F1B0cF0d0c5'
      const authLink = {
        type: AuthLinkType.ECDSA_EIP_1654_EPHEMERAL,
        payload: `Decentraland Login\r\nEphemeral address: ${ephemeral}\r\nExpiration: Tue Jan 21 2020 16:34:32 GMT+0000 (Coordinated Universal Time)`,
        signature: CONTRACT_WALLET_SIGNATURE
      }

      const res = await ECDSA_EIP_1654_EPHEMERAL_VALIDATOR(
        authority,
        authLink,
        { provider: new HttpProvider('https://mainnet.infura.io/v3/640777fe168f4b0091c93726b4f0463a') }
      )

      // Restore
      clock.restore()

      expect(res.nextAuthority).to.be.equal(ephemeral)
    })

    it('should support /r :: personal sign', async function () {
      // Date.now() should return 0 to avoid expiration
      const clock = sinon.useFakeTimers(0)
      const chain: AuthChain = [
        {
          type: AuthLinkType.SIGNER,
          payload: '0xf053efea93c7aeb3251a3c5f422864dddab354a9',
          signature: ''
        },
        {
          type: AuthLinkType.ECDSA_PERSONAL_EPHEMERAL,
          payload:
            'Decentraland Login\r\nEphemeral address: 0xd59c1F11bF5BDd5ae7305FA36D66089343f1C8FC\r\nExpiration: 2020-03-15T00:45:29.278Z',
          signature:
            '0x0fc56c45d201d17339aa84b39469d08b01e71bf992b3b709ae6babca7ab51fa63ef05436551effdd65981cf62624876b3e7a745e01738b6e17c8b43890feaaa81c'
        },
        {
          type: AuthLinkType.ECDSA_SIGNED_ENTITY,
          payload: 'QmUe3LmUJ4NACAKJzwQhn5rZVpLLSyBLWBmTSzJYEesDNx',
          signature:
            '0xe752475faa184dada05f10fa56c28b4a2d0391b5b92efe6af5ff77ca331594eb0102b23d74816afbb8645eaeff71af20b9eb92c621da0ecc55109cedd720f65d1c'
        }
      ]

      const isValid = await Authenticator.validateSignature(
        'QmUe3LmUJ4NACAKJzwQhn5rZVpLLSyBLWBmTSzJYEesDNx',
        chain,
        new HttpProvider(
          'https://mainnet.infura.io/v3/640777fe168f4b0091c93726b4f0463a'
        )
      )

      // Restore
      clock.restore()

      expect(isValid).to.be.equal(true)
    })

    it('supports signature with old versions', async function () {
      // Date.now() should return 0 to avoid expiration
      const clock = sinon.useFakeTimers(0)
      const chain: AuthChain = [
        {
          type: AuthLinkType.SIGNER,
          payload: '0xbcac4dafb7e215f2f6cb3312af6d5e4f9d9e7eda',
          signature: ''
        },
        {
          type: AuthLinkType.ECDSA_PERSONAL_EPHEMERAL,
          payload:
            'Decentraland Login\nEphemeral address: 0x08bdc29abFB11C6a1BB201b7EF3c41273aEA23EA\nExpiration: 2020-03-16T20:38:09.875Z',
          signature:
            '0x3a66ecdb318c1b6a72aaf991418804044ad30a2015d0846f52240e7bdb533853736e9308c619593a7ed20ecf9361b988fbf9e4957a12f062276eda2a37b7dfda01'
        },
        {
          type: AuthLinkType.ECDSA_SIGNED_ENTITY,
          payload: 'QmbGrShBQs4XiuoTNX6znAvXNdqtub8DtXyaxdSTZbHLCu',
          signature:
            '0x25ce09ec7f3e77040e886a2ad441467877a0c285b31bdde5c2f8517dc9b802454720b34c456eb592ebbcb14cc908d445b2e1bc1695469b2ba80a4882676f71921c'
        }
      ]

      const isValid = await Authenticator.validateSignature(
        'QmbGrShBQs4XiuoTNX6znAvXNdqtub8DtXyaxdSTZbHLCu',
        chain,
        new HttpProvider(
          'https://mainnet.infura.io/v3/640777fe168f4b0091c93726b4f0463a'
        )
      )

      // Restore
      clock.restore()

      expect(isValid).to.be.equal(true)
    })

    it('reverts if signature was expired', async function () {
      const authority = '0x1f19d3ec0be294f913967364c1d5b416e6a74555'
      const authLink = {
        type: AuthLinkType.ECDSA_PERSONAL_EPHEMERAL,
        payload:
          'Decentraland Login\nEphemeral address: 0x1F19d3EC0BE294f913967364c1D5B416e6A74555\nExpiration: 2020-01-15T00:45:29.278Z',
        signature: PERSONAL_SIGNATURE
      }

      const res = await ECDSA_PERSONAL_EPHEMERAL_VALIDATOR(
        authority,
        authLink,
        { provider: new HttpProvider('https://mainnet.infura.io/v3/640777fe168f4b0091c93726b4f0463a') }
      )

      expect(res.error).to.be.equal(true)
    })

    it('expiration check can be configured', async function () {
      const identity = EthCrypto.createIdentity()
      const ephemeral = EthCrypto.createIdentity()
      const chain = Authenticator.createAuthChain(
        identity,
        ephemeral,
        -5,
        'message'
      )

      // Since the ephemeral expired 5 minutes ago, validation should fail
      let isValid = await Authenticator.validateSignature(
        'message',
        chain,
        new HttpProvider(
          'https://mainnet.infura.io/v3/640777fe168f4b0091c93726b4f0463a'
        )
      )
      expect(isValid).to.be.equal(false)

      // Since we are checking the ephemeral against 10 minutes ago, validation should pass
      isValid = await Authenticator.validateSignature(
        'message',
        chain,
        new HttpProvider(
          'https://mainnet.infura.io/v3/640777fe168f4b0091c93726b4f0463a'
        ),
        moveMinutes(-10).getTime()
      )
      expect(isValid).to.be.equal(true)
    })
  })
})
