/**
 * NexChat Crypto Engine
 * Powered by Web Crypto API
 * 
 * Provides End-to-End Encryption (E2EE) primitives:
 * - RSA-OAEP for Key Exchange (2048-bit)
 * - AES-GCM for Message Encryption (256-bit)
 */

export class CryptoEngine {
  // Generate a new RSA key pair for a user
  static async generateKeyPair(): Promise<{ publicKey: string; privateKey: CryptoKey }> {
    const keyPair = await window.crypto.subtle.generateKey(
      {
        name: "RSA-OAEP",
        modulusLength: 2048,
        publicExponent: new Uint8Array([1, 0, 1]),
        hash: "SHA-256",
      },
      true, // extractable
      ["encrypt", "decrypt"]
    );

    const exportedPublic = await window.crypto.subtle.exportKey("spki", keyPair.publicKey);
    const publicKeyBase64 = btoa(String.fromCharCode(...new Uint8Array(exportedPublic)));

    return {
      publicKey: publicKeyBase64,
      privateKey: keyPair.privateKey,
    };
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

  private static openDB(): Promise<IDBDatabase> {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open("NexChatCrypto", 1);
      request.onupgradeneeded = () => {
        request.result.createObjectStore("keys");
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }
}
