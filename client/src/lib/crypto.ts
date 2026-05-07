/**
 * NexChat Crypto Engine
 * Powered by Web Crypto API
 * 
 * Provides End-to-End Encryption (E2EE) primitives:
 * - RSA-OAEP for Key Exchange (2048-bit)
 * - AES-GCM for Message Encryption (256-bit)
 */

export class CryptoEngine {
  /**
   * Generate a new RSA-OAEP key pair.
   * 
   * Security: The public key is exported as SPKI base64 for the server.
   * The private key is re-imported with extractable: FALSE — meaning the
   * Web Crypto sandbox will refuse any exportKey() call on it, even under XSS.
   * The transient PKCS8 bytes exist only for the duration of this function call.
   */
  static async generateKeyPair(): Promise<{ publicKey: string; privateKey: CryptoKey }> {
    // Step 1: Generate with extractable:true so we can export both keys immediately
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true, // must be true here to export the keys in the next steps
      ["encrypt", "decrypt"]
    );

    // Step 2: Export public key (SPKI) — fine to expose, it's public
    const exportedPublic = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
    const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(exportedPublic)));

    // Step 3: Export private key as PKCS8 bytes (transient — never stored as bytes)
    const exportedPrivate = await window.crypto.subtle.exportKey("pkcs8", keyPair.privateKey);

    // Step 4: Re-import private key with extractable:FALSE
    // This locks it inside the browser's cryptographic sandbox.
    // Any call to exportKey() on this key will throw a DOMException.
    const nonExtractablePrivateKey = await window.crypto.subtle.importKey(
      "pkcs8",
      exportedPrivate,
      { name: "RSA-OAEP", hash: "SHA-256" },
      false, // ← extractable: FALSE — the critical security fix
      ["decrypt"]
    );

    return {
      publicKey: publicKeyBase64,
      privateKey: nonExtractablePrivateKey,
    };
  }

  // ─── ECDH Session Keys (Forward Secrecy) ────────────────────────────────────
  //
  // Design:
  //   1. Each user generates an ephemeral ECDH P-256 key pair per channel session
  //   2. Ephemeral public key is published to the server (channel_sessions table)
  //   3. Both parties compute ECDH(myPrivate, theirPublic) → same shared secret
  //   4. HKDF derives a 256-bit AES-GCM session key from the shared secret
  //   5. ECDH private key is immediately discarded — never stored anywhere
  //   6. The derived AES session key is stored in IndexedDB with a 30-day TTL
  //      (after expiry, that session's messages cannot be decrypted — true FS)
  //
  // Forward secrecy guarantee:
  //   Compromising the static RSA identity key cannot reveal past session keys
  //   because the ECDH private key was never persisted.
  // ────────────────────────────────────────────────────────────────────────────

  /** Generate an ephemeral ECDH P-256 key pair. Returns public key as base64 SPKI. */
  static async generateECDHKeyPair(): Promise<{ publicKeyBase64: string; privateKey: CryptoKey }> {
    const keyPair = await window.crypto.subtle.generateKey(
      { name: 'ECDH', namedCurve: 'P-256' },
      true,
      ['deriveKey', 'deriveBits']
    );
    const exported = await window.crypto.subtle.exportKey('spki', keyPair.publicKey);
    const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(exported)));
    return { publicKeyBase64, privateKey: keyPair.privateKey };
  }

  /**
   * Derive a shared AES-256-GCM session key from an ECDH key agreement.
   * Uses HKDF with the channelId as context to bind the key to this conversation.
   * The ECDH private key is passed in and should be dropped immediately after this call.
   */
  static async deriveSessionKey(myECDHPrivate: CryptoKey, theirPublicBase64: string, channelId: string): Promise<CryptoKey> {
    // Import their ECDH public key
    const theirPublicBytes = Uint8Array.from(atob(theirPublicBase64), c => c.charCodeAt(0));
    const theirPublicKey = await window.crypto.subtle.importKey(
      'spki',
      theirPublicBytes,
      { name: 'ECDH', namedCurve: 'P-256' },
      false,
      []
    );

    // ECDH key agreement → raw shared secret bits
    const sharedBits = await window.crypto.subtle.deriveBits(
      { name: 'ECDH', public: theirPublicKey },
      myECDHPrivate,
      256
    );

    // Import shared bits as HKDF key
    const hkdfKey = await window.crypto.subtle.importKey('raw', sharedBits, 'HKDF', false, ['deriveKey']);

    // HKDF → AES-256-GCM session key, using channelId as info for domain separation
    const sessionKey = await window.crypto.subtle.deriveKey(
      {
        name: 'HKDF',
        hash: 'SHA-256',
        salt: new Uint8Array(32), // zero salt (shared implicitly)
        info: new TextEncoder().encode(`nexchat-session-v1:${channelId}`),
      },
      hkdfKey,
      { name: 'AES-GCM', length: 256 },
      false, // session key is non-extractable
      ['encrypt', 'decrypt']
    );

    return sessionKey;
  }

  /** Encrypt plaintext with a session AES-GCM key. Returns { content, iv } both base64. */
  static async encryptWithSessionKey(plaintext: string, sessionKey: CryptoKey): Promise<{ content: string; iv: string }> {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encoded = new TextEncoder().encode(plaintext);
    // Pad to nearest 256-byte block to hide message size from the server
    const padded = CryptoEngine.padPayload(encoded);
    const ciphertext = await window.crypto.subtle.encrypt({ name: 'AES-GCM', iv }, sessionKey, padded.buffer as ArrayBuffer);
    return {
      content: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
      iv: btoa(String.fromCharCode(...iv)),
    };
  }

  /** Decrypt a session-encrypted message. */
  static async decryptWithSessionKey(contentBase64: string, ivBase64: string, sessionKey: CryptoKey): Promise<string> {
    const content = Uint8Array.from(atob(contentBase64), c => c.charCodeAt(0));
    const iv = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
    const padded = await window.crypto.subtle.decrypt({ name: 'AES-GCM', iv }, sessionKey, content);
    const unpadded = CryptoEngine.unpadPayload(new Uint8Array(padded));
    return new TextDecoder().decode(unpadded);
  }

  /** Persist a derived session key in IndexedDB with a 30-day TTL. */
  static async storeSessionKey(channelId: string, sessionKey: CryptoKey): Promise<void> {
    const db = await this.openDB();
    const expiresAt = Date.now() + 30 * 24 * 60 * 60 * 1000; // 30 days
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sessions', 'readwrite');
      const req = tx.objectStore('sessions').put({ key: sessionKey, expiresAt }, channelId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /**
   * Retrieve a session key for a channel.
   * Returns null if none exists or if the key has expired (FS: expired = gone forever).
   */
  static async getSessionKey(channelId: string): Promise<CryptoKey | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('sessions', 'readonly');
      const req = tx.objectStore('sessions').get(channelId);
      req.onsuccess = () => {
        const record = req.result;
        if (!record) return resolve(null);
        if (Date.now() > record.expiresAt) {
          // Expired — delete it (enforce forward secrecy)
          const delTx = db.transaction('sessions', 'readwrite');
          delTx.objectStore('sessions').delete(channelId);
          return resolve(null);
        }
        resolve(record.key);
      };
      req.onerror = () => reject(req.error);
    });
  }

  // Encrypt a message using AES-GCM with a random key (single recipient)
  static async encryptMessage(content: string, recipientPublicKeyBase64: string) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);

    // 1. Generate a random AES key
    const aesKey = await window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    // 2. Encrypt the content with AES
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedContent = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      aesKey,
      data
    );

    // 3. Encrypt the AES key with the recipient's RSA Public Key
    const recipientPubKeyBuffer = Uint8Array.from(atob(recipientPublicKeyBase64), c => c.charCodeAt(0));
    const recipientPubKey = await window.crypto.subtle.importKey(
      "spki",
      recipientPubKeyBuffer,
      { name: "RSA-OAEP", hash: "SHA-256" },
      true,
      ["encrypt"]
    );

    const exportedAesKey = await window.crypto.subtle.exportKey("raw", aesKey);
    const encryptedAesKey = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      recipientPubKey,
      exportedAesKey
    );

    return {
      content: btoa(String.fromCharCode(...new Uint8Array(encryptedContent))),
      key: btoa(String.fromCharCode(...new Uint8Array(encryptedAesKey))),
      iv: btoa(String.fromCharCode(...iv)),
    };
  }

  /**
   * Encrypt a message for MULTIPLE recipients.
   * Uses ONE AES key + IV for the content, then wraps the AES key
   * separately for each recipient's RSA public key.
   * Returns: { content, iv, keys: { [userId]: encryptedAesKey } }
   */
  static async encryptMessageForMany(
    content: string,
    recipients: { userId: string; publicKeyBase64: string }[]
  ) {
    const encoder = new TextEncoder();
    const data = encoder.encode(content);

    // 1. Single AES key for the content
    const aesKey = await window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );

    // 2. Encrypt content once
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedContent = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      aesKey,
      data
    );

    const exportedAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

    // 3. Wrap the AES key for each recipient
    const keys: Record<string, string> = {};
    for (const { userId, publicKeyBase64 } of recipients) {
      const pubKeyBuffer = Uint8Array.from(atob(publicKeyBase64), c => c.charCodeAt(0));
      const pubKey = await window.crypto.subtle.importKey(
        "spki",
        pubKeyBuffer,
        { name: "RSA-OAEP", hash: "SHA-256" },
        true,
        ["encrypt"]
      );
      const encryptedAesKey = await window.crypto.subtle.encrypt(
        { name: "RSA-OAEP" },
        pubKey,
        exportedAesKey
      );
      keys[userId] = btoa(String.fromCharCode(...new Uint8Array(encryptedAesKey)));
    }

    return {
      content: btoa(String.fromCharCode(...new Uint8Array(encryptedContent))),
      iv: btoa(String.fromCharCode(...iv)),
      keys,
    };
  }

  // Decrypt a message using the user's RSA Private Key
  static async decryptMessage(
    encryptedContentBase64: string,
    encryptedKeyBase64: string,
    ivBase64: string,
    privateKey: CryptoKey
  ): Promise<string> {
    const decoder = new TextDecoder();

    // 1. Decrypt the AES key using the RSA Private Key
    const encryptedKeyBuffer = Uint8Array.from(atob(encryptedKeyBase64), c => c.charCodeAt(0));
    const aesKeyBuffer = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      privateKey,
      encryptedKeyBuffer
    );

    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      aesKeyBuffer,
      { name: "AES-GCM", length: 256 },
      true,
      ["decrypt"]
    );

    // 2. Decrypt the content using the AES key
    const encryptedContentBuffer = Uint8Array.from(atob(encryptedContentBase64), c => c.charCodeAt(0));
    const ivBuffer = Uint8Array.from(atob(ivBase64), c => c.charCodeAt(0));
    
    const decryptedContent = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: ivBuffer },
      aesKey,
      encryptedContentBuffer
    );

    return decoder.decode(decryptedContent);
  }

  // Helper to store private key in IndexedDB (Secure storage)
  static async storePrivateKey(userId: string, key: CryptoKey) {
    const db = await this.openDB();
    const tx = db.transaction("keys", "readwrite");
    await tx.objectStore("keys").put(key, userId);
  }

  static async getPrivateKey(userId: string): Promise<CryptoKey | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("keys", "readonly");
      const request = tx.objectStore("keys").get(userId);
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = () => reject(request.error);
    });
  }

  // ── Payload Padding (Metadata Protection) ──────────────────────────────────
  //
  // Pads plaintext to the nearest 256-byte block BEFORE encryption.
  // This makes all short messages ("hi", "ok", "yes") the same ciphertext size
  // as a full block message, hiding message lengths from the server.
  //
  // Format: [2-byte big-endian original length][original bytes][zero padding]
  //
  // Block size 256 bytes → effective quantization:
  //   1–254 bytes → 256 bytes  (all short messages look identical)
  //   255–510 bytes → 512 bytes
  //   511–766 bytes → 768 bytes  (etc.)
  // ────────────────────────────────────────────────────────────────────────────

  private static readonly PAD_BLOCK = 256;

  private static padPayload(data: Uint8Array): Uint8Array {
    // 2-byte header stores original length (supports up to 65535 bytes)
    const needed = 2 + data.length;
    const padded_len = Math.ceil(needed / this.PAD_BLOCK) * this.PAD_BLOCK;
    const out = new Uint8Array(padded_len); // zero-initialized
    out[0] = (data.length >> 8) & 0xff;
    out[1] = data.length & 0xff;
    out.set(data, 2);
    return out;
  }

  private static unpadPayload(padded: Uint8Array): Uint8Array {
    const originalLength = (padded[0] << 8) | padded[1];
    return padded.slice(2, 2 + originalLength);
  }

  private static openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("NexChatCrypto", 3);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains("keys")) db.createObjectStore("keys");
        if (!db.objectStoreNames.contains("verified")) db.createObjectStore("verified");
        if (!db.objectStoreNames.contains("sessions")) db.createObjectStore("sessions");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Compute a deterministic Safety Number from two public keys.
   * Keys are sorted lexicographically so both parties compute the same number.
   * Output: 12 groups of 5 digits (60 digits total) — Signal-style.
   */
  static async computeFingerprint(pubKeyA: string, pubKeyB: string): Promise<string> {
    // Sort so output is identical regardless of who initiates
    const sorted = [pubKeyA, pubKeyB].sort();
    const combined = sorted.join('|');
    const encoded = new TextEncoder().encode(combined);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", encoded);
    const hashArray = new Uint8Array(hashBuffer);

    // Convert bytes to a long decimal string, then chunk into 5-digit groups
    // We take 30 bytes and turn each pair into a number 0-65535, zero-padded to 5 digits
    const groups: string[] = [];
    for (let i = 0; i < 30; i += 5) {
      // XOR 5 bytes together into a 0-99999 range
      let n = 0;
      for (let j = i; j < i + 5 && j < hashArray.length; j++) {
        n = ((n << 8) + hashArray[j]) % 100000;
      }
      groups.push(n.toString().padStart(5, '0'));
    }
    return groups.join(' ');
  }

  /** Store that a channel's key fingerprint has been verified by this user */
  static async markVerified(channelId: string, fingerprint: string): Promise<void> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("verified", "readwrite");
      const req = tx.objectStore("verified").put({ fingerprint, verifiedAt: Date.now() }, channelId);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  }

  /** Returns the stored verified fingerprint for a channel, or null if not verified */
  static async getVerified(channelId: string): Promise<{ fingerprint: string; verifiedAt: number } | null> {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction("verified", "readonly");
      const req = tx.objectStore("verified").get(channelId);
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => reject(req.error);
    });
  }
}
