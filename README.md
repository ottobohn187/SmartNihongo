# SmartNihongo.com

ProcessWire theme files for SmartNihongo.com.

## Deployment notes

The production host already contains the ProcessWire core, database, and `site/config.php`.
This repository intentionally tracks the maintainable front-end layer only:

- `site/templates/_main.php`
- `site/templates/home.php`
- `site/templates/basic-page.php`
- `site/templates/admin.php`
- `site/templates/styles/main.css`
- `site/templates/scripts/main.js`

Deploy these files into the matching `smartnihongo.com/site/templates/` paths over explicit FTPS.
The ProcessWire admin remains served by the configured admin page at `/admin123/`.
