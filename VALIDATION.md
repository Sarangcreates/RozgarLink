# Delivery validation

Validated on Node.js 24.19.0.

- `npm run test`: 55 tests passed across 5 test files.
- `npm run build`: TypeScript checks passed and Vite produced the production build.
- `npm run dev`: development HTTP checks passed for frontend HTML, transformed React entry, API state, and seeded SQLite data through the Vite proxy.
- `npm start`: production HTTP checks passed for frontend HTML, compiled JavaScript, a nested SPA route, and API state.
- Included SQLite database: `PRAGMA integrity_check` returned `ok`; clean revision 1; no saved login sessions.
- Seed data: 8 applicants, 6 companies, 12 opportunities, 28 courses, 18 reviews, 2 simulated certificate registry records.
- Original AGENTS.md remains unchanged.

Render smoke checks exercise the main pages with fictional data. They are not interactive browser tests. Browser visual and click testing was unavailable in the build environment; follow README.md's live scenarios after starting the app.
