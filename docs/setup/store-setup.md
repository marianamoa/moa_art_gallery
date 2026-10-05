# New Shopify store setup

Complete these steps in order. Theme code is intentionally resilient when content is missing, but checkout, digital delivery, discounts, shipping, and photo uploads require store configuration.

## 1. Store basics

1. Set the store currency, business address, tax settings, and Spanish as the primary storefront language.
2. Add the final brand name and logo in the theme editor.
3. Configure payments, customer email, sender email, domain, policies, and Markets.
4. Create the main menu and footer menus before assigning them to the header and footer sections.

## 2. Collections and product types

Create these collections:

| Collection | Recommended handle | Contents |
| --- | --- | --- |
| Originales | `originales` | Unique originals |
| Ediciones | `ediciones` | Limited-edition prints |
| Tarjetas | `tarjetas` | Card sets and stationery |
| Descargas | `descargas` | Digital products |

Use the following product setup:

- Original: tag `original`, track inventory, quantity 1, no customer-facing options, template `product.original`.
- Edition: tag `edition`, one variant per size, track inventory on every variant, template `product.edition`.
- Card set: tag `cards`, track inventory when appropriate, template `product.cards`.
- Digital download: tag `digital`, disable physical shipping, template `product.digital`.

Use product media for catalog and product imagery. Use theme image pickers only for editorial imagery such as the homepage hero, portrait, process, and commission callout.

## 3. Create custom-data definitions

Create these merchant-owned metafield definitions in **Settings → Custom data** before entering values.

### Product definitions

| Name | Namespace and key | Type |
| --- | --- | --- |
| Edition size | `custom.edition_size` | Integer |
| Medium | `custom.medium` | Single line text |
| Dimensions | `custom.dimensions` | Single line text |
| Paper | `custom.paper` | Single line text |
| Shipping note | `custom.shipping_note` | Single line text |

### Variant definition

| Name | Namespace and key | Type |
| --- | --- | --- |
| Edition size | `custom.edition_size` | Integer |

The variant definition takes precedence over the product definition. Use it when each size has its own edition total.

## 4. Write custom-data values

After the definitions exist:

1. Open each product and fill in medium, dimensions, paper, and shipping note.
2. For an edition with one total across every size, set the product edition size.
3. For an edition with separate totals per size, set edition size on each variant.
4. Keep Shopify inventory accurate. The theme calculates the remaining label from the live variant inventory and edition-size value.

## 5. Verify custom-data retrieval

Open an edition product using `product.edition` and confirm:

- The product label displays “Edición de N”.
- Selecting a size updates price, availability, and remaining inventory.
- The stock bar turns terracotta at five or fewer units.
- Medium, dimensions, paper, and shipping note appear when populated and disappear cleanly when blank.

## 6. Storefront filtering

In **Search & Discovery → Filters**, enable availability, price, product type, tags, variant size, and any product metafields required for filtering. The collection template renders whatever filters are enabled in Shopify.

## 7. Editions discount

Create an automatic fixed-amount discount:

- Value: €10
- Applies to: Ediciones collection
- Minimum requirement: quantity 2
- Apply once per order: enabled if the intended maximum discount is €10

The cart renders Shopify's actual discount allocation. It does not reproduce the discount independently.

## 8. Digital products

Install Shopify's **Digital Products** app. Attach the PDF/JPEG assets to each digital product, select automatic fulfillment, set an appropriate download limit, and enable the order-status download block if desired.

Place a complete test order and confirm that the download email and order-status link both work before publishing.

## 9. Commission requests and photo uploads

The commission page includes the visual calculator and a native contact-form fallback. To receive photos:

1. Install Shopify Forms.
2. Create an inline commission form.
3. Add name and email as required fields.
4. Add size, protagonists, finish, message, and up to five individual file-upload fields.
5. Limit accepted uploads to the image formats the studio can process.
6. Add the form as an app block to the commission section in the theme editor.
7. Configure Shopify Flow or the selected form automation to notify the studio and acknowledge the customer.

Shopify Forms accepts one file per upload field, so five fields are needed for five photos. Use a specialized form app or custom endpoint if one multi-select file picker is mandatory.

## 10. Shipping, returns, and FAQ

Create real shipping zones and rates before replacing the provisional text in the FAQ template. Test at least one address in every supported zone. Confirm free-shipping thresholds, delivery estimates, duties wording, return eligibility, and digital-product exclusions.

## 11. Notifications

Copy the applicable files from `docs/notifications/` into Shopify's notification editor. Send tests from Shopify before enabling them. The commission reference must be mapped to the chosen Forms or Flow automation.

## 12. Launch test matrix

- Original available and sold out
- Edition in stock, low stock, and sold out for each size
- Card quantity updates
- Digital purchase and download delivery
- Mixed cart with eligible and ineligible discount items
- Discount threshold below, at, and above two editions
- Shipping addresses in every active zone
- Commission submission, upload, studio notification, and customer acknowledgement
- Newsletter success and error states
- Search, filters, sorting, pagination, menus, policies, 404, and password page
- Keyboard-only navigation and visible focus
- Mobile widths 320px and 375px; tablet 768px; desktop 1024px and 1440px
- Safari, Chrome, Firefox, and mobile Safari

Connect the GitHub branch as an unpublished theme, perform the matrix on that theme, place a test order, and publish only after every item passes.

