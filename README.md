# NIP-05 Identifier Service

This repository hosts a NIP-05 identifier service for Nostr users at `bitkarrot.github.io`.

## For Users

Visit [add-nip05.html](https://bitkarrot.github.io/add-nip05.html) to register your NIP-05 identifier.

## Architecture

```
┌─────────────────┐     ┌──────────────────────┐     ┌─────────────────────┐
│   Web Form      │────▶│  Vercel Serverless   │────▶│  GitHub Actions     │
│ (add-nip05.html)│     │  (/api/submit-nip05) │     │  (add-nip05.yml)    │
└─────────────────┘     └──────────────────────┘     └─────────────────────┘
                                                              │
                                                              ▼
                                                     ┌─────────────────────┐
                                                     │  Pull Request       │
                                                     │  (nostr.json)       │
                                                     └─────────────────────┘
```

1. User submits username + pubkey via the web form
2. Vercel serverless function validates input and triggers a GitHub `repository_dispatch` event
3. GitHub Actions workflow updates `nostr.json` and creates a PR using `peter-evans/create-pull-request`
4. Repository owner reviews and merges the PR

## Setup Instructions

### 1. Create a GitHub Personal Access Token

1. Go to [GitHub Settings > Developer settings > Personal access tokens > Fine-grained tokens](https://github.com/settings/tokens?type=beta)
2. Create a new token with:
   - **Repository access**: Only select this repository (`bitkarrot.github.io`)
   - **Permissions**:
     - Contents: Read and write
     - Pull requests: Read and write
     - Metadata: Read-only
3. Copy the token (starts with `github_pat_`)

### 2. Deploy to Vercel

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Login to Vercel:
   ```bash
   vercel login
   ```

3. Deploy the project:
   ```bash
   vercel
   ```

4. Set the GitHub token as an environment variable in Vercel:
   ```bash
   vercel env add GITHUB_TOKEN
   ```
   Paste your token when prompted, and select all environments (Production, Preview, Development).

5. Redeploy to apply the environment variable:
   ```bash
   vercel --prod
   ```

### 3. Configure Environment Variables

In the Vercel dashboard, ensure these environment variables are set:
- `GITHUB_TOKEN` - Your GitHub Personal Access Token
- `GITHUB_OWNER` - `bitkarrot` (already in vercel.json)
- `GITHUB_REPO` - `bitkarrot.github.io` (already in vercel.json)
- `ALLOWED_ORIGIN` - (optional) Restrict CORS to your domain

## Files

- **`.well-known/nostr.json`** - The NIP-05 identifier mapping
- **`add-nip05.html`** - User-facing registration form
- **`api/submit-nip05.js`** - Vercel serverless function
- **`vercel.json`** - Vercel configuration
- **`.github/workflows/add-nip05.yml`** - GitHub Actions workflow

## Security Notes

- The GitHub token is stored as a Vercel environment variable, never exposed to users
- Input validation happens both client-side and server-side
- The workflow validates username and pubkey format before making changes
- PRs require manual approval before merging

## NIP-05 Format

Once registered, users can set their NIP-05 identifier in their Nostr profile as:

```
username@bitkarrot.github.io
```

For the root identifier `_`, it displays as just `bitkarrot.github.io`.
