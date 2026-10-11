# Functional local prototype

The user's request to make RozgarLink a prototype authorizes local account registration and password authentication, replacing fictional-account login. Existing matching definitions and offline operation remain unchanged. This overrides fictional-only account access; sample opportunities remain fictional.

Run `npm install`, then `npm run dev`. Open http://localhost:5173. Choose a portal, click **New here? Create an account**, and register with a password of at least 10 characters. Applicants complete their profile; companies can post opportunities. Applicant registration optionally shares matching profiles with registered companies. Private contact fields, certificate details, saved jobs, and progress are removed from company responses. Sharing can also be changed on the profile page. Without opt-in, a profile is visible only to its owner. Dataset reset and judge account switching are disabled.

Passwords use salted scrypt hashes; sessions use HttpOnly cookies. Records persist in SQLite. Seed accounts cannot sign in through the old OTP. Existing records are preserved. Only theme preferences persist in browser storage for the updated app.

This is a local prototype, not a production deployment. There is no password recovery, email ownership verification, or real application submission. Certificate verification and learning completion remain simulated. Existing profile email edits update profile contact information; the registration email remains the login identifier. No hosted service or paid API is required.

Verify with `npm run test` and `npm run build`.
