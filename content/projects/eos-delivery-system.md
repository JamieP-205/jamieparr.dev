---
title: "EOS Delivery System"
summary: "A C# desktop app for calculating delivery quotes and producing invoices, with input validation, discounts and print preview."
tech: ["C#", ".NET 10", "Windows Forms", "GitHub Actions"]
links:
  - { label: "Download Windows app", url: "https://github.com/JamieP-205/eos-delivery-system/releases/latest/download/EosDelivery-windows-x64.zip", primary: true }
  - { label: "Source code", url: "https://github.com/JamieP-205/eos-delivery-system" }
image: "/uploads/projects/eos-app.webp"
imageAlt: "The EOS Delivery System window with customer details, package options and an itemised invoice"
featured: true
order: 2
draft: false
---
A Windows Forms app based on my EOS coursework at SRC Newry. You enter the customer and package details, calculate the price, then save or print the invoice.

**Try it.** Download the zip, extract it and run `EosDelivery.exe`. It includes its own .NET runtime. Log in with **JamieP** / **password123**, select **Auto Fill (for testing)**, then **EOS Invoice**. Enter `discount` for 20% off.

### A sample calculation

| Item | Charge |
| --- | ---: |
| Normal, Electronic, Liquids, Expensive | £75.00 |
| Package size: Small | £5.00 |
| 2 packages × £5.00 | £10.00 |
| Additional shipping charge | £5.00 |
| **Subtotal** | **£95.00** |
| VAT (demo rate, 20%) | £19.00 |
| Discount (20% off the VAT-inclusive amount) | −£22.80 |
| **Total** | **£91.20** |

Money uses decimal arithmetic, rounded to two places.

### Validation and checks

- Weight must be positive and no more than 100 kg, or the equivalent in grams, pounds or ounces. Package count must be 1–15, customers must be at least 18, and delivery can't be before dispatch.
- Editing any input invalidates the displayed invoice, so an out-of-date total can't be exported.
- The login pauses for 30 seconds after three failed attempts.
- 24 automated checks cover prices, discounts, weight conversions, age and date limits, login lockout, form layout, clear/restore and invoice updates. They run on GitHub Actions.
