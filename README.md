# Flashfo Vercel Starter

This is a Vercel-ready migration starter for Flashfo. It keeps the current Flashfo HTML/CSS/JS frontend and replaces `google.script.run` with a Next.js API route at `/api/rpc`.

## Deploy steps

1. Create a GitHub repo named `flashfo`.
2. Upload all files in this folder to the repo.
3. Import the repo into Vercel.
4. In Vercel Project Settings → Environment Variables, add:

```
OPENAI_API_KEY=your OpenAI key
```

5. Redeploy the project.
6. Turn off Deployment Protection / Vercel Authentication for public testers.
7. Your already-connected domain `flashfo.org` will work once the deployment is production-ready.

## Notes

- Core AI features now run through Next.js API routes instead of Apps Script `Code.gs`.
- Google Drive export is temporarily converted to local downloadable data URLs. Real Drive sync should be added later after Google OAuth/login is implemented.
- Supabase is not included yet. Add it later for real user accounts, saved work syncing, classes, and analytics.
