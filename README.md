# NIP-05 Automated PR Service

Automates NIP-05 identifier registration via pull requests. Users submit their Nostr pubkey through a web form, and the system automatically creates a PR to add them to the `nostr.json` file.

## For Users

Visit the registration form to request your NIP-05 identifier. Once your PR is approved and merged, your identifier will be active.

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
   - **Repository access**: Only select this repository
   - **Permissions**:
     - **Actions**: Read and write (required to trigger `repository_dispatch`)
     - **Contents**: Read and write
     - **Metadata**: Read-only (auto-granted)
     - **Pull requests**: Read and write
3. Copy the token (starts with `github_pat_`)

### 2. Enable GitHub Actions Workflow Permissions

1. Go to your repository's **Settings** → **Actions** → **General**
2. Scroll to **"Workflow permissions"**
3. Select **"Read and write permissions"**
4. Check **"Allow GitHub Actions to create and approve pull requests"**
5. Click **Save**

### 3. Deploy to Vercel

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

### 4. Configure Your Domain (Optional)

Add a custom domain in the Vercel dashboard under **Settings** → **Domains**.

### 5. Update Repository References

If you fork or rename this repository, update these files:
- `api/submit-nip05.js` - Update `GITHUB_OWNER` and `GITHUB_REPO` constants
- `add-nip05.html` - Update the PR link URL
- `.github/workflows/add-nip05.yml` - Update the NIP-05 domain in the PR body

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
username@yourdomain.com
```

For the root identifier `_`, it displays as just the domain.

## License

MIT
