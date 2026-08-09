# Daily 5 — Spec Addendum v1.1
**Scope note:** This document covers ONLY the changes below. It amends specific sections of `daily5_product_spec.md` (v1.0) — cross-references are noted. Do not re-implement anything outside this list; everything else in v1.0 stands as-is.

---

## A. Sign Up / Sign In — Full Flow Incl. Email Verification
*(Replaces v1.0 Sections 3.3–3.5 with full detail)*

### A.1 Signup — Step by Step
1. **Entry method choice screen:** "Continue with Apple," "Continue with Google," "Continue with Email" — OAuth options listed first/above the fold.
2. **Email path:** Email field → Password field (min 8 characters, one number — show live strength bar, no red/alarm colors per v1.0 tone rules) → "Create Account" CTA.
3. **Email verification (required before first Home access):**
   - Immediately after account creation, navigate to **Verify Your Email** screen: "We sent a 6-digit code to [email]."
   - 6-digit OTP input (auto-advancing boxes, auto-submit on 6th digit entered).
   - **Resend code** link — disabled for 30 seconds after each send, shown as a countdown ("Resend in 0:24"), then becomes active.
   - **Change email** link — routes back to the email field with the value pre-filled, in case of a typo.
   - On correct code: success checkmark animation (`dur-fast`, simple scale+fade, no 3D flourish — this is a utility moment, not a hero moment) → auto-navigate to Onboarding/Home.
   - On incorrect code: shake animation on the input row (reuse the field-shake pattern from v1.0 §3.5), inline error "That code didn't match. Try again." Field clears automatically after 3 failed attempts and prompts a fresh resend.
   - **Code expiry:** 10 minutes. Expired-code entry shows "This code has expired — send a new one" with the resend link auto-focused.
4. **OAuth path (Apple/Google):** No separate email verification step needed — provider's verified email is trusted directly. Skip straight to Onboarding/Home after provider auth succeeds.
5. **Encryption consent screen** (from v1.0 §3.3) still occurs, positioned after verification succeeds, before first Home load.

### A.2 Signin
- Same entry method choices as Signup.
- Email/password → if account is unverified (edge case: user closed app mid-verification during a prior session), route to the same Verify Your Email screen before Home, not into Home directly.
- **Forgot password:** email field → "reset link sent" confirmation state → user resets via emailed link (web view or deep link back into app) → returns to Signin with a success toast.
- **Biometric quick-unlock:** offered once after first successful signin (per v1.0 §3.5), applies on all subsequent app opens as a pre-Home gate if enabled.

### A.3 Edge Cases (additive to v1.0 §3.5)
- User signs up with an email that exists but is unverified from a prior abandoned signup: do not create a duplicate account — resend a fresh verification code to the existing unverified account and route into the same Verify screen.
- User requests resend more than 5 times in an hour: soft rate-limit, message: "Too many attempts — try again in [time]."
- No internet during verification: preserve the entered code locally, show offline toast, auto-retry submission on reconnect rather than forcing manual re-entry.

---

## B. Entry Composer — Photos, Word Cap, Placeholder Copy
*(Replaces v1.0 Section 4.2, step 3 in full)*

### B.1 Photos — Max 2 Per Moment
- Each of the 5 slots supports **0, 1, or 2 photos** — never more.
- Composer photo area: shows an empty add-photo tile initially; after adding one, a second smaller add-photo tile appears beside it; once 2 are added, no further add affordance shows (replace by tapping an existing photo, or remove via a small "x" on long-press/tap-to-select).
- If 2 photos are attached, book-page layout (v1.0 §6.3) renders them as a small side-by-side pair within that single slot's space — the slot's total footprint on the page does not grow to accommodate 2 photos; they share the space one photo would otherwise take, to preserve the equal-weighting rule in Section D below.

### B.2 Text — Length Cap for Visual Consistency
- **Hard cap: 3 lines at the default composer font size**, which translates to an approximate character budget the agent should enforce as a live counter rather than a hard block-on-type — recommend **~110–130 characters** as the practical cap at 16–17pt on a 390pt-wide screen (verify empirically against final type choice; the *rule*, not the exact number, is what must hold: text must reliably fit 3 lines in the fixed-height book-page slot at every supported device width from v1.0 §1B.2).
- **UX pattern:** show a small unobtrusive counter ("42/120") only once the user is within ~20% of the cap — don't clutter the composer with a counter from the first keystroke. At the hard limit, stop accepting further characters (no truncation-after-the-fact; prevent overflow at input time) and give a single gentle inline note: "Keep it to the highlights — 3 lines max."
- This cap applies **per moment**, independent of whether photos are attached.

### B.3 Placeholder Copy — Rotating Prompts
- Each empty slot's text field shows placeholder text (not a fixed instruction, but an *example*, styled in the standard placeholder-gray, disappearing on focus) — rotate through a pool so repeat use doesn't feel scripted. Maintain a pool covering the full emotional range established in v1.0 §0.2 (positive, neutral, difficult) so the placeholder itself reinforces "anything counts." Example pool for the agent to seed (expand freely, keep each within the 3-line cap):
  - "Had coffee with someone who made me laugh."
  - "Twisted my ankle running for the bus — worth it, still made the train."
  - "Learned that sourdough actually likes a cold fridge overnight."
  - "Fought with my sister about something small. We'll be fine."
  - "Watched the sunset from the balcony, alone, and it was enough."
  - "Got told 'good job' by someone whose opinion actually matters to me."
- Placeholder selection can be random per slot per day (no need to be deterministic/matched to slot number).

---

## C. "Tonight's 5" Card — Expanded Detail
*(Amends v1.0 Section 4.1, "not yet logged today" state)*

Card must surface enough context to make **recall easier at day's end**, not just an empty CTA. Include, top to bottom on the card:
- **Day of week, full date** — large/prominent (e.g., "Sunday, July 19").
- **A short recall cue line** — small, secondary text, e.g., "Your last entry was 1 day ago" or, if applicable, "You logged 4 moments yesterday" — gives a light anchor point without shame/streak framing.
- **Book progress line** (already in v1.0): "Page 14 of ~30 this month," paired with the small growing-spine visual.
- The CTA button itself ("Log tonight's 5") sits below this context block, not above it — user reads the context first, then acts.
- If device/OS permission allows and is granted, optionally show **today's weather or general location** as a small subtle recall aid (e.g., "Rainy, Bengaluru") — must be clearly optional/toggleable in Settings, never required, and never logged as part of the encrypted entry content itself unless the user explicitly adds it.

---

## D. Equal Weighting of the 5 Slots on the Day Page
*(Clarifies/amends v1.0 Section 6.3 page layout)*

- The day's book page must render all **5 slots at identical size and visual weight**, regardless of how much or little content each contains (1 line of text vs. 3 lines + 2 photos vs. empty). Achieve this via a **fixed-height slot container** per moment: shorter content vertically centers within its slot rather than shrinking the slot around it, and the character cap in Section B.2 exists specifically so no slot's content can force a taller container than its neighbors.
- An empty (unused) slot still renders as a visually intentional blank space matching the others' dimensions (consistent with the "blank page, not an error" principle in v1.0 §9.3) — never collapse or hide unused slots, since that would break the equal-grid layout the book depends on.

---

## E. Homepage — "A Page" Concept
*(Amends v1.0 Section 4.1 overall visual treatment)*

- Redesign the Today tab itself to read as **a physical open journal page**, not a generic app screen with cards floating on a background — this extends the paper-texture/book metaphor (v1.0 §5.1) from the book viewer into the home screen itself, so the whole app feels like one continuous object rather than "utility screens + a special book feature."
- Concretely: the Today tab's background carries the same warm paper texture as book pages; the date header is set in a hand-set/editorial typeface treatment reminiscent of a journal heading (distinct from the clean UI type used in forms/settings); a subtle **left-margin rule line or stitching/binding graphic** runs down one edge of the screen, echoing a notebook's inner margin — this is a static decorative layer, not interactive.
- "Tonight's 5" (Section C) and the "On This Day" card (Section F below) sit on this page-textured background as if written/pasted onto the page, rather than as opaque white cards with hard shadows — soft, minimal shadow only, consistent with the book's material language.
- This treatment is scoped to the **Today tab only** in v1.1 — Library, Profile, and Settings remain clean utility-style screens (per v1.0 §1B.5's "boring 90%" principle) unless a future version extends it further.

---

## F. Dummy/Demo Data — Requirements for Agent-Seeded Content
*(New — supports demoing the app; not user-facing production logic, but a required seed dataset for prototype/demo builds)*

### F.1 Scope
Seed a demo account with **3–4 fully completed, locked monthly books**, each with realistic variety, so reviewers can see the product's payoff without manually logging a real month.

### F.2 Per-Month Requirements
For each of the 3–4 demo months:
- **25–31 days**, the large majority filled (aim for ~80–90% of days populated — leave a few genuinely blank days too, to demonstrate the "blank page is fine" principle from v1.0 §9.3, not just a perfect record).
- Each populated day: **1–5 moments**, varied count across days (don't make every day exactly 5 — variation sells realism and demonstrates the "up to 5, not exactly 5" rule from v1.0 §0.2).
- Moment content: short (within the 3-line cap from Section B.2), varied tone — mix mundane, joyful, and difficult entries per the placeholder pool in Section B.3 (e.g., a work win, a minor injury, a meal, a friend meetup, a small disappointment) — avoid an all-positive demo dataset, since that would misrepresent the product's actual philosophy to anyone evaluating it.
- **Photos:** attach 1–2 photos (per the Section B cap) to roughly half the moments; use royalty-free/generic placeholder imagery categorized to match the moment's tag (coffee, travel, people, food, etc. — reuse the category set from v1.0 §5.2). Leave the other half text-only, since real usage is mixed.
- **Extras:** on at least 3–5 days per demo month, seed 1–3 additional entries beyond the 5-slot cap, so the Extras/"back of the page" flow (v1.0 §6.4) has real content to demonstrate, not an empty state.
- **Book cover:** each demo month should generate its distinct procedural cover (v1.0 §5.3) so the Library shelf view shows visually differentiated spines across the 3–4 books, not repeats.

### F.3 "On This Day, Last Year" Dummy Data
- Seed at least one full year-prior month (i.e., if the demo's "current" month is set to, say, July, seed a July of the prior year with matching day-of-month entries) so the "On This Day" card (v1.0 §4.1/§4.5) has real resurfaced content to show for each day the demo is viewed on, rather than an empty/no-data state.
- These entries should follow the same content variety rules as F.2.

### F.4 Current (Unlocked) Month
- In addition to the 3–4 fully locked demo books, seed a **currently in-progress, unlocked month** (partially filled, consistent with "today" in the demo's simulated date) so reviewers can also see the pre-lock, editable list view (v1.0 §4.4) and log a new entry themselves into a realistic, populated context rather than a blank slate.

---

## G. Light Mode as Default
*(Corrects v1.0 §5.1, which allowed both — this addendum makes light mode the required default)*

- **Light/paper mode is the default and primary experience** for all screens, effective immediately — the current dark-mode build must be switched. Warm off-white paper background (#F7F4EF or similar, per v1.0 §5.1), dark ink-toned text, single warm accent color for interactive elements and category icons.
- Dark mode remains available but only as an **opt-in choice**, not the default — surfaced in Profile → Appearance (see Section H.4 below), defaulting to "Light" (or "System" defaulting to whatever the device is set to only if the user explicitly picks that option — do not auto-detect and silently apply dark mode without the user choosing it).

---

## H. Profile Page — Full Flow Deep Dive
*(New — expands v1.0's brief mention of a Profile tab into full detail)*

### H.1 Profile Home (top-level screen)
Sections listed top to bottom, each navigating to its own sub-screen:
1. **Account header** — avatar (tap to change/upload photo), display name, email (masked/partial if desired for privacy on-screen), "Edit Profile" affordance.
2. **Notifications**
3. **Appearance**
4. **Data & Privacy**
5. **Orders** (print order history/status, from v1.0 §7)
6. **Gifting** (view sent/received gifts, from v1.0 §8.3)
7. **Help & Support**
8. **About** (version, legal, licenses)
9. **Sign Out** (confirmation prompt before executing)
10. **Delete Account** (visually de-emphasized/separated from the rest, per v1.0 §3.5's deletion flow requirements)

### H.2 Edit Profile Sub-Screen
- Editable: avatar photo (upload/replace/remove), display name.
- Email change: requires re-verification via the same OTP flow as Section A — new email isn't active until the code sent to it is confirmed; old email stays active until then and a warning explains this.
- Password change: requires current password re-entry before allowing a new one.

### H.3 Notifications Sub-Screen
Toggles, each independently controllable:
- **Nightly reminder** — on/off, plus a **time picker** (default 9:00 PM local) for when the "log tonight's 5" push notification fires. Respect device Do Not Disturb; do not re-notify multiple times same night if already logged.
- **"On This Day" resurfacing alert** — on/off (a gentle daily nudge showing a past memory, separate from the logging reminder).
- **Month-lock/cover-ready alert** — on/off (notifies when a book has completed and its cover is ready to view, per v1.0 §6.2).
- **Print order updates** — on/off (shipping/delivery status).
- **Gifting notifications** — on/off (received a gift, gift redeemed).
- First time any toggle is turned on, trigger the OS-level notification permission prompt if not already granted; if the user previously denied OS permission, tapping a toggle should deep-link to the device's app notification settings rather than silently failing.

### H.4 Appearance Sub-Screen
- **Theme selector:** Light (default, selected) / Dark / System — simple segmented control or radio list, live-previews the change immediately on selection (no separate "Apply" step).
- Optional (flag as nice-to-have, not required for v1.1): accent color choice, if multiple palette options are ever offered beyond the single default warm accent from v1.0 §5.1 — not required to build now, just leave the settings screen structurally able to accommodate it later.

### H.5 Data & Privacy Sub-Screen
- Encryption explainer (short, re-surfacing the consent-screen language from v1.0 §3.3, so users can re-read it anytime, not just at signup).
- **Export my data** action (per v1.0 §9.7).
- **Delete Account** entry point (routes to the confirmation flow, v1.0 §3.5).
- Biometric unlock toggle (on/off), if enabled during signin per v1.0 §3.5.

### H.6 Help & Support / About
- Standard: FAQ/contact link, app version number, licenses/legal, links to Terms & Privacy Policy.

---

## Summary of Files/Sections This Addendum Touches
| Area | v1.0 Reference | Status |
|---|---|---|
| Signup/Signin + email verification | §3.3–3.5 | Expanded (Section A) |
| Entry composer: photos + text cap + placeholders | §4.2 | Expanded (Section B) |
| Tonight's 5 card detail | §4.1 | Expanded (Section C) |
| Equal slot weighting on day page | §6.3 | Clarified (Section D) |
| Home screen "as a page" treatment | §4.1, §5.1 | New visual direction (Section E) |
| Demo/dummy data | — | New (Section F) |
| Light mode default | §5.1 | Corrected (Section G) |
| Profile page full flows | — (was unspecified) | New (Section H) |
