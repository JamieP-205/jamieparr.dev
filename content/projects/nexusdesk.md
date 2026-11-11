---
title: "NexusDesk"
summary: "A Java and SQL helpdesk with support tickets, equipment records and separate employee, technician and administrator accounts."
tech: ["Java", "Spring Boot", "Spring Security", "SQL", "H2", "Thymeleaf"]
links:
  - label: "Try in browser"
    url: "https://nexusdesk-demo-1tl6.onrender.com"
    primary: true
  - label: "Download demo"
    url: "https://github.com/JamieP-205/NexusDesk/releases/tag/v0.2.2"
  - label: "Source code"
    url: "https://github.com/JamieP-205/NexusDesk"
access: "No account needed: choose Employee, Technician or Administrator. Each visitor gets a private copy of the fictional data. On free hosting, the first visit after a quiet spell takes about a minute to start."
image: "/uploads/projects/nexusdesk-dashboard.png"
imageAlt: "NexusDesk 0.2.0 dashboard showing ticket totals and workload charts using fictional demo records"
proof:
  - "96 automated tests, run on Java 17, 21 and 25"
  - "Separate employee, technician and administrator permissions with Spring Security"
  - "Try it in your browser, no account needed"
featured: true
order: 2
draft: false
---
I wrote a brief for a fictional company's IT helpdesk. NexusDesk brings support requests, equipment records and staff accounts into one application. You can try it in your browser or download it, with 26 fictional tickets to explore.

## Follow a ticket through the system

An employee raises a ticket and can follow its replies and history. A technician picks it up and records what fixed it. The employee then confirms it's fixed, which closes it, or reopens it with a reason, which puts it back in the unassigned queue without losing the earlier resolution. Employees can only access their own tickets; technicians handle the queue, and administrators also manage accounts and equipment.

The 99-second silent walkthrough follows a ticket from the employee to the technician and back, then shows equipment being assigned and returned. You can follow the typing, clicks and scrolling as it happens.

<video controls playsinline preload="none" poster="/uploads/projects/nexusdesk-dashboard.png" aria-label="NexusDesk demo walkthrough; description follows" aria-describedby="nexusdesk-video-description">
  <source src="/uploads/projects/nexusdesk-walkthrough.mp4?v=20261105-paced" type="video/mp4">
  <a href="/uploads/projects/nexusdesk-walkthrough.mp4?v=20261105-paced">Download the walkthrough video</a>.
</video>

<p id="nexusdesk-video-description">An employee types a new support request and submits it. The technician opens the ticket, takes ownership and types a resolution. The employee confirms the fix, closing the ticket. The administrator then assigns equipment and returns it to stock, with both events shown in the assignment history.</p>

## What happens behind the forms

Ticket updates and their history are saved in the same database transaction. Conflicting edits are rejected, and one piece of equipment cannot have two current owners. Search and filters stay selected while moving between pages.

Spring Security handles sign-in and permissions. Passwords use PBKDF2-HMAC-SHA256, and repeated failed sign-ins trigger a temporary block. Existing passwords from version 0.1.0 are upgraded when their owner next signs in.

Version 0.2.2 passed 96 automated tests on Java 17, 21 and 25. A separate smoke test covers the running application, including sign-in, permissions, ticket changes, restart persistence and backup/restore. [View the release checks on GitHub](https://github.com/JamieP-205/NexusDesk/actions/runs/42025645488).

## Try it

**In your browser.** [Open the demo](https://nexusdesk-demo-1tl6.onrender.com) and choose a role. It's the same Spring Boot application, hosted on Render's free plan. Each visitor gets a private in-memory copy of the fictional data, so nothing you change affects anyone else. Each role starts with a **Things to try** checklist that ticks off as you go. Use **View as** to switch roles, for example to raise a ticket as the employee, resolve it as the technician and confirm the fix as the employee, and **Reset demo** to start again; your copy is deleted after an hour without activity. The service sleeps after 15 minutes without visitors, so the first visit after that takes about a minute.

**On your own computer.** [Version 0.2.2](https://github.com/JamieP-205/NexusDesk/releases/tag/v0.2.2) needs Java 17 or newer. Download `nexusdesk-0.2.2.jar` and run `java -jar nexusdesk-0.2.2.jar --demo`, which opens the demo in your browser. If Windows Smart App Control blocks the ZIP's unsigned `Start demo.cmd`, leave that protection on. The direct JAR command was tested without administrator rights on this machine; other managed devices may apply their own restrictions. Demo accounts use `Demo-password-123`.

This is a personal practice project based on my brief, with fictional people and records. The [README](https://github.com/JamieP-205/NexusDesk#readme) records how it was built and the setup instructions; the [code walkthrough](https://github.com/JamieP-205/NexusDesk/blob/main/docs/walkthrough.md) explains the main flows. Backups require stopping the app, sign-in attempt counts reset on restart, and there is no password-reset flow.
