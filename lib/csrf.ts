// lib/csrf.js
import Tokens from 'csrf';

const tokens = new Tokens();

export function generateCSRFSecret() {
  return tokens.secretSync();
}

export function createCSRFToken(secret:any) {
  return tokens.create(secret);
}

export function verifyCSRFToken(secret:any, token:any) {
  return tokens.verify(secret, token);
}