# BOOKORA

A runnable 3D-inspired ebook marketplace starter with a Node.js API and responsive frontend.

## Run locally

1. Install Node.js 18+.
2. Open a terminal in this folder.
3. Run `npm start`.
4. Visit `http://localhost:3000`.

Demo admin:
- Email: `admin@bookora.local`
- Password: `admin123`

## Included

- 3D-inspired animated storefront
- Responsive mobile/desktop UI
- Search, categories, sorting
- Cart
- Customer registration/login
- Orders and demo checkout
- Admin dashboard
- Add/delete books
- JSON persistence (`data.json`)
- SEO basics and social metadata
- Production payment integration hook point

## Production checklist

Before going live, replace demo authentication/payment behavior with secure providers:
- Use hashed passwords and a proper auth/session provider.
- Use PostgreSQL (or another production database).
- Store ebook files in private object storage and issue protected, expiring download URLs.
- Connect Razorpay/Stripe/etc. and verify webhooks server-side.
- Add HTTPS, rate limiting, CSRF protection where applicable, input validation, email delivery, backups and monitoring.
- Add Google Analytics/Meta Pixel IDs through environment variables.
- Deploy to a Node-compatible host and connect your custom domain.

Never use the demo admin password in production.
