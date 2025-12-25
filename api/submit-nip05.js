/**
 * Vercel Serverless Function for NIP-05 Registration
 * 
 * Environment variables required (set in Vercel dashboard):
 * - GITHUB_TOKEN: Personal access token with repo scope
 */

import { nip19 } from 'nostr-tools';

// Repository configuration (hardcoded since these are not secrets)
const GITHUB_OWNER = 'bitkarrot';
const GITHUB_REPO = 'nip05-service';

function isValidHex(str) {
  return /^[0-9a-fA-F]{64}$/.test(str);
}

function convertToHex(input) {
  input = input.trim();
  
  if (isValidHex(input)) {
    return input.toLowerCase();
  }
  
  if (input.startsWith('npub1')) {
    try {
      const decoded = nip19.decode(input);
      if (decoded.type !== 'npub') throw new Error('Not an npub');
      return decoded.data;
    } catch (e) {
      throw new Error('Invalid npub format: ' + e.message);
    }
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

    // Check for GitHub token
    if (!process.env.GITHUB_TOKEN) {
      console.error('GITHUB_TOKEN environment variable is not set');
      throw new Error('Server configuration error');
    }

    // Trigger GitHub repository_dispatch event
    const response = await fetch(
      `https://api.github.com/repos/${GITHUB_OWNER}/${GITHUB_REPO}/dispatches`,
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
      throw new Error(`GitHub API error: ${response.status}`);
    }

    return res.status(200).json({
      success: true,
      message: `Request submitted! A pull request will be created for ${username}@${GITHUB_OWNER}.github.io`,
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
