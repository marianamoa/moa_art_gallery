# Sorrel Gallery Shopify theme

A buildless Shopify Online Store 2.0 theme for a quiet watercolor gallery. The theme is designed for a new Shopify store and can be connected directly to a GitHub branch.

## Included

- Responsive home, collection, search, cart, password, 404, blog, article, and standard page templates
- Product templates for originals, editions, card sets, and digital downloads
- About, shipping/FAQ, contact, and commission page templates
- Inventory-aware edition counters and variant selection
- Shopify storefront filters and discount display
- Newsletter consent form
- Spanish default locale with English storefront translations
- Merchant-editable sections, colors, typography, menus, imagery, and content
- Setup instructions and notification templates under `docs/`

## Development

Install Shopify CLI:

```sh
npm install -g @shopify/cli@latest
```

Start a development preview after authenticating to a store:

```sh
shopify theme dev --store your-store.myshopify.com
```

Run local validation:

```sh
shopify theme check
```

## GitHub connection

The repository root is the Shopify theme root. Connect a branch from **Online Store → Themes → Add theme → Connect from GitHub**. Use a preview branch while developing, then connect and publish `main` after launch checks pass.

Shopify writes theme-editor changes back to the connected branch. Avoid editing the same theme file in Shopify and GitHub at the same time.

## New-store setup

Follow [docs/setup/store-setup.md](docs/setup/store-setup.md) before launch. It covers catalog structure, custom data, discounts, digital delivery, Shopify Forms, shipping, notifications, and the final test matrix.

The HTML design archive is reference material only and is not required at runtime.
