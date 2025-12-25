/**
 * Vercel Serverless Function for NIP-05 Registration
 * 
 * Environment variables required (set in Vercel dashboard):
 * - GITHUB_TOKEN: Personal access token with repo scope
 * - GITHUB_OWNER: Repository owner (e.g., "bitkarrot")
 * - GITHUB_REPO: Repository name (e.g., "bitkarrot.github.io")
 */

const BECH32_ALPHABET = 'qpzry9x8gf2tvdw0s3jn54khce6mua7l';

function bech32Decode(str) {
  str = str.toLowerCase();
  const sepIndex = str.lastIndexOf('1');
  if (sepIndex < 1) throw new Error('Invalid bech32 string');
  
  const hrp = str.slice(0, sepIndex);
  const data = str.slice(sepIndex + 1);
  
  const ALPHABET_MAP = {};
  for (let i = 0; i < BECH32_ALPHABET.length; i++) {
    ALPHABET_MAP[BECH32_ALPHABET[i]] = i;
  }
  
  const values = [];
  for (const char of data) {
    if (ALPHABET_MAP[char] === undefined) throw new Error('Invalid character');
    values.push(ALPHABET_MAP[char]);
  }
  
  // Remove checksum (last 6 characters)
  const dataValues = values.slice(0, -6);
  
  // Convert 5-bit to 8-bit
  let acc = 0;
  let bits = 0;
  const result = [];
  
  for (let i = 1; i < dataValues.length; i++) {
    acc = (acc << 5) | dataValues[i];
    bits += 5;
    while (bits >= 8) {
      bits -= 8;
      result.push((acc >> bits) & 0xff);
    }
  }
  
  return { hrp, data: new Uint8Array(result) };
}

function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

function isValidHex(str) {
  return /^[0-9a-fA-F]{64}$/.test(str);
}

function convertToHex(input) {
  input = input.trim();
  
  if (isValidHex(input)) {
    return input.toLowerCase();
  }
  
  if (input.startsWith('npub1')) {
    const decoded = bech32Decode(input);
    if (decoded.hrp !== 'npub') throw new Error('Not an npub');
    return bytesToHex(decoded.data);
  }
  
  throw new Error('Invalid public key format');
}

function validateUsername(username) {
  if (!username || typeof username !== 'string') {
    throw new Error('Username is required');
  }
  username = username.trim().toLowerCase();
  if (!/^[a-z0-9_\.\-]+$/.test(username)) {
    throw new Error('Username can only contain lowercase letters, numbers, hyphens, underscores, and dots');
  }
  if (username.length < 1 || username.length > 64) {
    throw new Error('Username must be between 1 and 64 characters');
  }
  return username;
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': process.env.ALLOWED_ORIGIN || '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export default async function handler(req, res) {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin']);
    res.setHeader('Access-Control-Allow-Methods', corsHeaders['Access-Control-Allow-Methods']);
    res.setHeader('Access-Control-Allow-Headers', corsHeaders['Access-Control-Allow-Headers']);
    res.setHeader('Access-Control-Max-Age', '86400');
    return res.status(200).end();
  }

  // Set CORS headers for all responses
  res.setHeader('Access-Control-Allow-Origin', corsHeaders['Access-Control-Allow-Origin']);

  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { username: rawUsername, pubkey: rawPubkey } = req.body;

    // Validate and normalize inputs
    const username = validateUsername(rawUsername);
    const pubkey = convertToHex(rawPubkey);

    // Trigger GitHub repository_dispatch event
    const response = await fetch(
      `https://api.github.com/repos/${process.env.GITHUB_OWNER}/${process.env.GITHUB_REPO}/dispatches`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
          'User-Agent': 'NIP05-Vercel-Function',
        },
        body: JSON.stringify({
          event_type: 'add-nip05',
          client_payload: {
            username,
            pubkey,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      console.error('GitHub API error:', response.status, errorText);
      throw new Error('Failed to trigger workflow');
    }

    return res.status(200).json({
      success: true,
      message: `Request submitted! A pull request will be created for ${username}@${process.env.GITHUB_OWNER}.github.io`,
      username,
      pubkey,
    });
  } catch (error) {
    console.error('Error:', error.message);
    return res.status(400).json({
      success: false,
      error: error.message,
    });
  }
}
