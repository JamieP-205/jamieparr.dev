---
title: "Coast Internet Radio"
summary: "A website for a radio station in Newry, with live listening, track information and an editor the presenter can use himself."
tech: ["HTML", "CSS", "JavaScript", "Netlify Functions", "Cloudflare Workers", "Python", "Flask", "SQLAlchemy", "pytest"]
links:
  - { label: "Visit coastinternetradio.com", url: "https://coastinternetradio.com", primary: true }
  - { label: "Try the request board", url: "https://coast-requests-demo.onrender.com" }
  - { label: "Website code", url: "https://github.com/JamieP-205/coast-radio" }
  - { label: "Coast Requests code", url: "https://github.com/JamieP-205/coast-requests" }
image: "/uploads/projects/coast-home.webp"
imageAlt: "The Coast Internet Radio homepage, with a Listen live button and the song playing now with its album cover"
proof:
  - "Live at coastinternetradio.com, with a request board the presenter uses on air"
  - "Signed webhooks, CSRF tokens and a Content-Security-Policy on the request board"
  - "24 site tests and 37 pytest tests"
featured: true
order: 1
draft: false
---
Coast Internet Radio is a small station in Newry run by a family member, playing country, Irish country and classic hits 24 hours a day. Most of its listeners are older and not very confident with technology, so the site has to be simple to use.

### The website

- A live player that keeps playing as you move between pages, and shows the song playing now with its album cover.
- The station's stream and track information are only available over HTTP. Two Cloudflare Workers serve them over HTTPS so they play on the secure site.
- An editor at `/admin/` where the presenter changes the words, photos, colours, home page layout, news and show times himself, with preview, publish and undo.
- Plain HTML, CSS and JavaScript on Netlify. Sign-in, saving and publishing use Netlify Functions and Blobs, with a hashed password and a signed sign-in cookie. 24 tests run before each deploy.

I built the first version in May 2026 using online tutorials, my class notes and some help from AI tools, and rebuilt it in October 2026 with Claude Code assisting with the code. I worked out with the presenter what he needed, made the design decisions, tested each change on the live site and moved the domain over.

### Coast Requests

**The problem.** Song requests only arrived by email, so during a live show the presenter had to search his inbox to find them.

**The fix.** A request board. Each request appears in one list, oldest first, and he taps **Played** as he goes. The board checks for new requests every 20 seconds and reloads only when something has changed.

![The Coast Requests board with three requests waiting and a Played button beside each](/uploads/projects/coast-requests-board.webp)

**How it works.**

1. A listener fills in the request form on coastinternetradio.com.
2. Netlify Forms emails it to the station as before, and also sends it to the Flask app as a signed webhook.
3. The app checks Netlify's signature over the exact request body, refuses anything unsigned, then stores the request in SQLite through SQLAlchemy.
4. The presenter signs in and works through the list.

**Try it.** The [request board demo](https://coast-requests-demo.onrender.com) is a separate copy with fictional requests. Each visitor gets their own board, and it has no connection to the station, so it can't see real requests or listener details. It sleeps after 15 minutes without visitors, so the first visit after that takes about a minute.

<h3 id="request-walkthrough">Follow a request in about a minute</h3>

This silent, captioned recording follows a fictional request through the working demo: enter a song, find it on the presenter's board, mark it Played, then put it back with Not played yet.

<video controls playsinline preload="none" poster="/uploads/projects/coast-requests-walkthrough.webp" aria-label="Coast Requests walkthrough, with on-screen captions" aria-describedby="coast-video-description">
  <source src="/uploads/projects/coast-requests-walkthrough.mp4" type="video/mp4">
  <a href="/uploads/projects/coast-requests-walkthrough.mp4">Download the walkthrough</a>.
</video>

<p id="coast-video-description">A demo listener requests Wildflowers by Tom Petty, with a dedication. The board opens at that request, keeping the oldest requests first. Played moves it to Played recently. Not played yet returns it to the waiting list. The demo stores the request directly in a private database; it does not demonstrate the live Netlify delivery step, send email or play a song on air.</p>

**The improvement.** The demo originally added a randomly selected sample. It now lets visitors type their own fictional request and follow it through the board. The form keeps entered details after a validation error and opens the board at the new request. Codex assisted with implementing and checking this update. [Before-and-after notes and checks](https://github.com/JamieP-205/coast-requests/blob/main/docs/listener-walkthrough.md).

**Testing and security.** 37 pytest tests cover the webhook signature, duplicate and unwanted submissions, sign-in, CSRF protection, marking requests played, escaping listeners' text, UK times, keeping each demo visitor's board private and the new listener form. Tests run on GitHub Actions. The form and board were also checked in a browser at desktop and phone widths. The password is stored only as a hash, every form has a CSRF token, and a Content-Security-Policy allows only the app's own files. The station's board is hosted on PythonAnywhere, and Claude Code assisted with the original code.

**Next steps.** Pause sign-in after several wrong passwords, and add a "can't play this one" option with a reason.
