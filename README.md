# MP Tourism – Investor Portal

A static website (HTML + Tailwind CSS + plain JavaScript). No server code: open
`index.html` in a browser, or host the folder on GitHub Pages / any static host.

## Pages and how they connect

```
index.html                    Home – land bank map, sectors, how it works …
 └─ Login ────────────────────► login/index.html
                                 ├─ Create an account ─► login/register.html
                                 │                         (mobile → OTP → password → done)
                                 └─ Login ─────────────► dashboard/index.html
                                                           └─ Investor Profile ─► dashboard/profile.html
                                                                                   └─ Continue ─► dashboard/profile-form.html
```

"Back to portal" (login pages) and the logo return to the home page; Logout
(dashboard) returns to the login page. The light / dark theme choice is
carried between all pages.

## Demo details

| What | Value |
|---|---|
| Login | username `investor`, password `Invest@123` (plus the captcha shown) |
| OTP on Create Account | `111111` |

Everything is front-end only: sign-in, OTP, PAN check and saving the profile
are demos (the profile is stored in the browser). Each place to connect a real
service is marked `DEMO` in the scripts.

## Folder layout

```
index.html              home page
home/                   home page's styles (Tailwind source + compiled) and scripts
login/                  login.html, register.html, their styles, scripts and images
dashboard/              dashboard, investor profile, profile form + styles and scripts
assets/                 shared images and the home video
package.json            Tailwind build commands
```

Each `styles/input.css` is the Tailwind source; the `.css` next to it
(`home.css`, `login.css`, `dashboard.css`) is generated – don't edit it by hand.

## Changing the styles

```bash
npm install          # first time only
npm run build        # rebuild all three stylesheets
npm run watch:home   # or watch:login / watch:dashboard while editing
```

## Hosting on GitHub Pages

1. Create a public repository on github.com (e.g. `mp-tourism-portal`).
2. Upload / push the contents of this folder (`node_modules` is ignored).
3. Repository → **Settings → Pages** → Source: **Deploy from a branch**,
   Branch: **main**, folder **/ (root)** → Save.
4. After a minute the site is live at
   `https://<your-username>.github.io/mp-tourism-portal/`.

The compiled CSS files are committed, so GitHub Pages needs no build step.
