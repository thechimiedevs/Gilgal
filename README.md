# Gilgal Ground Chalets

Mobile booking site for Gilgal Ground Chalets: a guest booking flow (family or individual, Fri–Sun days, room and bed picker, confirmation) and a front-desk view (calendar, days, check in, check out).

Plain HTML, CSS and JavaScript — no build step.

## Run locally

Open `index.html` in a browser, or serve the folder:

```bash
npx serve .
```

## Deploy to Vercel

Push this folder to a GitHub repository, then in Vercel choose **Add New → Project**, import the repository and keep the defaults (Framework Preset: **Other**, no build command, output directory = project root).

Or from this folder with the Vercel CLI:

```bash
npx vercel --prod
```

The front desk lives at `/#/calendar`.
