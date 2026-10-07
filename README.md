# Split Calculator

A modern split-expense app for trip, food, petrol, and group spending tracking.

## Project structure

- index.html
- styles/style.css
- scripts/app.js

## Features

- Add a trip or title
- Add members to the group
- Add expenses with title, amount, payer, and chosen split members
- Automatically calculate total spend and per-person split
- View a bar chart for paid vs. share totals
- Download the report as an Excel file

## Phone contacts

Click **Contacts** next to the mobile-number field to choose a contact. The selected name and phone number fill the form; if the contact has several numbers, choose one from the number selector, then click **Add person**. For local numbers, select the matching country. Full numbers beginning with `+` keep their country calling code.

Phone-book access requires a supported browser (primarily Chrome on Android), a top-level page served over HTTPS, and your permission. It is not available in Safari on iPhone or most desktop browsers. Manual entry remains available. Only the contact you choose is shared with the app, and it is saved locally when you add the person.

## WhatsApp sharing

Select the member's country and enter their local mobile number, or enter a full international number starting with `+` (for example, `+91 98765 43210`). Click **Share on WhatsApp**, then choose each member's chat link to open their personalized message. Press **Send** in WhatsApp for each recipient.

WhatsApp links cannot automatically send to everyone or check whether a number is registered. The recipient must have a WhatsApp account. If WhatsApp still displays a version warning with the correct international number, try an updated WhatsApp app or WhatsApp Web. Older numbers that were saved with missing digits must be removed and added again.

## Run locally

From this folder, start a simple static server:

```bash
python3 -m http.server 8000
```

Then open:

```text
http://localhost:8000
```

## Notes

The app is built as a lightweight browser-based interface, so no install step is needed to view it locally.
