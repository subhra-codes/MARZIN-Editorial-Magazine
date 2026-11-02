# MARGIN — Independent Reading Journal

A premium editorial-style book discovery website for a Web Technology lab exercise.

## Design direction
Inspired by experimental independent culture magazines: monochrome photographic cover, oversized condensed-feeling typography, a pale editorial content sheet, a narrow editor's rail, modular story teasers and a dark reading-room catalogue. This is a complete visual redesign, not a colour swap of the previous layout.

## Features
- Real book search using jQuery `$.ajax()` with HTTP GET.
- JSON response parsing from the Open Library Search API.
- Cover image, title, author, publication year and edition count.
- Editorial topic links that launch catalogue searches.
- Save/remove favourites with browser localStorage.
- Saved-books view, sorting and pagination.
- Responsive desktop and mobile layout.
- Loading, empty, timeout, API/network error and retry states.

## Files
- `index.html` — page structure and magazine layout
- `style.css` — complete visual system and responsive styling
- `script.js` — AJAX request, JSON parsing, rendering and interactions
- `assets/editorial-hero.png` — original generated monochrome editorial hero artwork

## Run
Open the folder in VS Code and run `index.html` with Live Server. Internet is required for jQuery, Google Fonts, Open Library API data and book cover images.

## API endpoint
`https://openlibrary.org/search.json`

## AJAX flow
The search form prevents the default page reload, sends a GET request using jQuery `$.ajax()`, receives JSON, reads the `docs` array, and renders book records. The fail callback handles request errors and the always callback restores the controls.
