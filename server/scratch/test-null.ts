import argon2 from 'argon2';
import crypto from 'crypto';

async function main() {
  const username = "testuser";
  const password_h = "password123";
  const publicKeyBase64 = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEA1+2..."; // dummy
  
  const hashedPassword = await argon2.hash(password_h);
  
  const recoveryKey = `nex-r-${crypto.randomBytes(8).toString('hex')}`;
  const hashedRecoveryKey = await argon2.hash(recoveryKey);
  
  const friendCode = crypto.randomBytes(4).toString('hex').substring(0, 7).toUpperCase();

  console.log("hashedPassword contains null?", hashedPassword.includes("\0"));
  console.log("hashedRecoveryKey contains null?", hashedRecoveryKey.includes("\0"));
  console.log("friendCode contains null?", friendCode.includes("\0"));
  console.log("publicKeyBase64 contains null?", publicKeyBase64.includes("\0"));
  
  console.log(hashedPassword);
}
main();
