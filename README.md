# Orbit

Orbit is a lightweight goal management web app with local browser storage and optional Google Drive sync.

## What is ready

- Local browser save works immediately
- Google login can be used for Drive sync
- Free plan item limits are enabled
- GitHub Pages deployment is configured

## Before public use

You should set your own Google OAuth client ID in [js/config.js](/C:/Users/yyou0/.gemini/antigravity-ide/scratch/goal-orbit/js/config.js).

In Google Cloud Console, create an OAuth 2.0 Client ID for a Web application and add these items:

- Authorized JavaScript origin: your GitHub Pages URL
- Authorized JavaScript origin: `http://127.0.0.1:4173`
- Authorized JavaScript origin: `http://localhost:4173`

Example GitHub Pages origin:

```text
https://yuyayasumi.github.io
```

If you publish this repository as `goal-orbit`, the app URL will usually be:

```text
https://yuyayasumi.github.io/goal-orbit/
```

## How to publish

1. Push `main` to GitHub.
2. In the repository settings, open `Pages`.
3. Set the source to `GitHub Actions`.
4. Wait for the deployment workflow to finish.

## Notes about data

- Local edits are saved in the browser as you use the app.
- Drive sync starts after Google login is available.
- If local data and Drive data differ, Orbit now asks which one to keep instead of overwriting silently.
