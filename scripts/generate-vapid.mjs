#!/usr/bin/env node
// Generates VAPID keys for Web Push and prints .env.local entries.
// Run: node scripts/generate-vapid.mjs

import webpush from "web-push";

const keys = webpush.generateVAPIDKeys();

console.log("\n# Add these to your .env.local:\n");
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY="${keys.publicKey}"`);
console.log(`VAPID_PRIVATE_KEY="${keys.privateKey}"`);
console.log(`VAPID_EMAIL="mailto:admin@example.com"\n`);
