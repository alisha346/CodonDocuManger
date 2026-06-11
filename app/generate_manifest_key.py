import base64
import hashlib
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives import serialization

def main():
    # 1. Generate RSA private key
    private_key = rsa.generate_private_key(
        public_exponent=65537,
        key_size=2048
    )

    # 2. Get Public Key in DER format (SubjectPublicKeyInfo)
    public_key = private_key.public_key()
    pub_der = public_key.public_bytes(
        encoding=serialization.Encoding.DER,
        format=serialization.PublicFormat.SubjectPublicKeyInfo
    )

    # 3. Encode DER in base64 for manifest.json "key" field
    pub_base64 = base64.b64encode(pub_der).decode('utf-8')

    # 4. Compute Extension ID
    # SHA-256 of the public key DER, then first 32 hex characters mapped to a-p
    sha256 = hashlib.sha256(pub_der).hexdigest()
    first_32 = sha256[:32]
    
    # Mapping hex (0-f) to (a-p)
    # 0 -> a, 1 -> b, ..., 9 -> j
    # a -> k, b -> l, ..., f -> p
    trans = str.maketrans('0123456789abcdef', 'abcdefghijklmnop')
    extension_id = first_32.translate(trans)

    print(f"Extension ID: {extension_id}")
    print("\nValue for 'key' in manifest.json:")
    print(pub_base64)

    # Optionally write private key to key.pem (not strictly required by browser for loading unpacked, but good practice)
    with open('key.pem', 'wb') as f:
        f.write(private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.TraditionalOpenSSL,
            encryption_algorithm=serialization.NoEncryption()
        ))
    print("\nPrivate key saved to key.pem")

if __name__ == '__main__':
    main()
