import * as paillier from 'paillier-bigint';

export function encrypt(m: bigint, publicKey: paillier.PublicKey) {
  try {
    const encryptedValue = publicKey.encrypt(m);

    return '0x' + encryptedValue.toString(16).padStart(64, '0');
  } catch (error) {
    console.error('Error encrypting:', error);
    throw new Error('Failed to encrypt');
  }
}

export function decrypt(c: bigint, privateKey: paillier.PrivateKey) {
  try {
    const decryptedValue = privateKey.decrypt(c);
    return decryptedValue;
  } catch (error) {
    console.error('Error decrypting:', error);
    throw new Error('Failed to decrypt');
  }
}
