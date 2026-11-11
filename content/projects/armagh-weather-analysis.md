---
title: "Armagh Weather Analysis"
short: "Armagh"
summary: "An Excel and Python analysis of Armagh weather records, covering temperature, rainfall, sunshine and frost."
tech: ["Python", "Excel", "CSV", "unittest"]
links:
  - { label: "Open the browser report", url: "https://jamiep-205.github.io/armagh-weather-analysis/reports/", primary: true }
  - { label: "Source code and workbook", url: "https://github.com/JamieP-205/armagh-weather-analysis" }
image: "/uploads/projects/armagh-overview.webp"
imageAlt: "Charts of annual temperature, rainfall, sunshine and frost at Armagh Observatory"
proof:
  - "2,028 monthly records, from 1853 to 2021"
  - "Missing readings kept separate from real zeros"
  - "Eight unit tests on the data handling"
context: "College coursework at SRC Newry"
exhibit:
  type: chart
  data: armagh-annual
  caption: "Annual mean temperature at Armagh Observatory, complete years only"
featured: true
order: 3
---
Records from Armagh Observatory, **2,028 monthly rows from January 1853 to December 2021**, analysed for my SRC Newry Big Data and Business Analytics course. It includes an Excel workbook with ten sheets and 32 charts, a Python analysis, CSV downloads and a browser report with charts and a coverage table.

### The missing-data decision

The original records mark some months as missing. My Excel workbook replaced those markers with **zero**. That's misleading: a month with no sunshine reading isn't a month with no sunshine, and counting it as zero drags averages down.

So the Python analysis:

- keeps missing markers as *unavailable*, separate from real zeros
- only produces an annual figure when all twelve months are available for that measure
- weights temperature means by the number of days in each month, and sums rainfall, sunshine and frost days
- keeps estimated readings, sensor flags and provisional months identifiable in the CSV

The gaps are big enough to matter. Sunshine has **928 missing months**, each temperature series and the frost series have 147, and rainfall has one. That's why the report shows a coverage table, and why the Excel and Python results differ wherever data is missing.

Eight unit tests cover missing versus zero, measurement flags, invalid tokens, duplicate months, incomplete years, provisional readings, leap-year weighting and per-measure completeness.

*Data: Met Office historic station data, Armagh. Crown copyright, Open Government Licence v3.0.*
