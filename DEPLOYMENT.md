# Deployment Guide

## Deploying to Vercel

This guide will help you deploy your URL Shortener application to Vercel.

### Prerequisites

1. A Vercel account (sign up at https://vercel.com)
2. Vercel CLI installed globally (optional but recommended):
   ```bash
   npm install -g vercel
   ```

### Method 1: Deploy via Vercel CLI (Recommended)

1. **Login to Vercel:**
   ```bash
   vercel login
   ```

2. **Deploy the application:**
   ```bash
   vercel
   ```

   Follow the prompts:
   - Set up and deploy: `Y`
   - Which scope: Select your account
   - Link to existing project: `N` (for first deployment)
   - Project name: `url-shortener` (or your preferred name)
   - Directory: `./` (current directory)
   - Override settings: `N`

3. **Set up environment variables:**
   ```bash
   vercel env add SUPABASE_URL
   vercel env add SUPABASE_KEY
   vercel env add DEFAULT_URL_EXPIRATION_HOURS
   ```

   Or set them in the Vercel dashboard:
   - Go to your project settings
   - Navigate to "Environment Variables"
   - Add the required variables:
     - `SUPABASE_URL`: Your Supabase project URL
     - `SUPABASE_KEY`: Your Supabase anon/public key
     - `DEFAULT_URL_EXPIRATION_HOURS`: (optional) Default: 720

4. **Deploy to production:**
   ```bash
   vercel --prod
   ```

### Method 2: Deploy via Vercel Dashboard (Git Integration)

1. **Push your code to GitHub/GitLab/Bitbucket**

2. **Import project in Vercel:**
   - Go to https://vercel.com/dashboard
   - Click "Add New..." → "Project"
   - Import your repository
   - Configure project:
     - Framework Preset: Other
     - Build Command: `npm run build`
     - Output Directory: (leave empty)
     - Install Command: `npm install`

3. **Add environment variables:**
   - In project settings, go to "Environment Variables"
   - Add the following variables:
     ```
     SUPABASE_URL=<your-supabase-url>
     SUPABASE_KEY=<your-supabase-key>
     DEFAULT_URL_EXPIRATION_HOURS=720
     ```

4. **Deploy:**
   - Click "Deploy"
   - Wait for the build to complete
   - Your app will be live at `https://your-project.vercel.app`

### Configuration Files

The following files are configured for Vercel deployment:

- **vercel.json**: Vercel configuration for routing and builds
- **.vercelignore**: Files to exclude from deployment
- **package.json**: Build scripts (`build` and `vercel-build`)

### Environment Variables Required

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `SUPABASE_URL` | Supabase project URL | Yes | - |
| `SUPABASE_KEY` | Supabase anon/public key | Yes | - |
| `DEFAULT_URL_EXPIRATION_HOURS` | Default expiration time for URLs | No | 720 |
| `NODE_ENV` | Environment (automatically set by Vercel) | No | production |

### Post-Deployment

1. **Test your deployment:**
   - Visit your Vercel URL
   - Check the Swagger documentation at `/api-docs`
   - Test creating and accessing short URLs

2. **Monitor logs:**
   ```bash
   vercel logs <your-deployment-url>
   ```

   Or view logs in the Vercel dashboard under "Deployments" → Select deployment → "Logs"

3. **Set up custom domain (optional):**
   - Go to project settings → "Domains"
   - Add your custom domain
   - Follow DNS configuration instructions

### Troubleshooting

**Build fails:**
- Check that all dependencies are in `dependencies` (not `devDependencies`)
- Ensure environment variables are set correctly
- Review build logs in Vercel dashboard

**Application errors:**
- Check function logs in Vercel dashboard
- Verify Supabase credentials are correct
- Ensure Supabase has the correct schema and tables

**Routes not working:**
- Verify `vercel.json` is present and correctly configured
- Check that all API routes are properly defined in Express

### Continuous Deployment

When connected via Git:
- Every push to your main branch triggers a production deployment
- Pull requests create preview deployments
- You can configure branch deployments in project settings

### Additional Resources

- [Vercel Documentation](https://vercel.com/docs)
- [Vercel Node.js Runtime](https://vercel.com/docs/functions/serverless-functions/runtimes/node-js)
- [Vercel Environment Variables](https://vercel.com/docs/concepts/projects/environment-variables)
