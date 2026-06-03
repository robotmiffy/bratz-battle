# Doll Battle

Mobile-first Y2K doll voting app. It includes:
- random 2-doll battles
- favourites saved in localStorage
- voting history
- stats dashboard and win-rate leaderboard
- source links/credits on every doll card

## Run locally
Open `index.html` in a browser, or serve the folder:

```bash
python3 -m http.server 8080
```

Then visit `http://localhost:8080`.

## Data credits and respectful use
This prototype uses credited reference data and image URLs from Lookin’ Bratz. Every doll object must include a `source` field linking back to the relevant Lookin’ Bratz page. Do not remove credits, do not present the images as owned by the app, and consider requesting permission before publishing at scale.

For a larger catalogue, extend `data.js` with objects in this shape:

```js
{
  id: 'unique-id',
  name: 'Doll name',
  year: 2001,
  collection: 'Collection name',
  character: 'Character name',
  image: 'https://...',
  source: 'https://www.lookinbratz.com/...'
}
```
