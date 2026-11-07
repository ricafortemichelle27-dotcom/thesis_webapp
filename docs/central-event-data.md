# Central event data implementation

This stage uses the existing Express backend, central MySQL database, and Cloudinary account. No tables or columns were added or recreated. Fingerprint integration, local kiosk storage, and synchronization were not implemented.

## Data flow

1. Admin creates or edits basic event details through the existing `/api/events` endpoints. Eligibility edits now participate in the same database transaction as the basic event update.
2. Opening **View Event** retrieves the full current event, eligibility, and ordered speakers from `GET /api/events/:id`.
3. **Save Kiosk Settings** sends multipart data to `PUT /api/events/:id/configuration`. This saves description, theme mode, logo, background, speakers, speaker photos/order, and photobooth times together. The endpoint checks the existing application's requesting-user role and event ownership. Configuration can be saved on approved events without changing their approval status or basic details.
4. Images use the existing Multer-memory/Cloudinary approach. MySQL stores persistent HTTPS URLs. Files in React state are only unsaved selections/previews. Failed saves attempt to clean up newly uploaded images; the database transaction rolls back.
5. Kiosk React calls the existing Express backend at `GET /api/kiosk/events` and `GET /api/kiosk/events/:id`. These return approved events only; the detailed kiosk response excludes approval/certificate documents and admin identity fields.
6. `EventLayout` shares the selected event with its pages and header/footer. The event date is returned as `YYYY-MM-DD` to avoid UTC serialization shifting the calendar date.

## Using the implementation

- Create an event normally, then open **View Event** to configure its kiosk content. Add or edit speakers, change their order with **Move up/down**, and remove speakers as needed. **Save Kiosk Settings** saves the entire configuration, including speakers.
- Images support JPEG, PNG, and WebP, up to 5 MB each, with at most 20 speakers. Existing PDF upload handling and its 10 MB limit are retained.
- Uncheck **Photobooth available** to save both schedule fields as `NULL`. Enabling it requires both times, with the end later than the start.
- The kiosk Home page shows database-backed event links. **View all** opens the approved-event chooser. A direct event URL is `/event?eventId=123`; navigation retains that event ID.
- Optional kiosk `VITE_EVENT_ID` selects a fixed event by default. `VITE_API_URL` is the backend origin, such as `http://localhost:5000`, without `/api`. It is the only connection setting the React app needs; no database credentials belong in Vite variables.
- When the backend's existing `FRONTEND_URL` allowlist is configured, it must include both the Admin and kiosk origins, separated by commas. On a different physical kiosk machine, use the reachable backend hostname/IP instead of `localhost`. Restart Vite after changing its environment configuration.
- **Refresh event** in the event header, a page reload, or returning focus to the kiosk retrieves current configuration again. This implementation does not push live updates or synchronize offline data.
- WIS colors are defined in the kiosk frontend. Custom mode uses its existing locally configured color palette. The database logo works in either mode; only Custom mode applies the database background image. Styles remain scoped to the event layout.
- Photobooth scheduling uses the event date and Philippine time (`UTC+08:00`), including on devices set to another timezone. The start is inclusive and the end is exclusive. Closed schedules do not mount the camera component; closing the schedule stops its active streams and timers.

## Files changed for this stage

Paths below are relative to the repository root. Existing unrelated working-tree edits were preserved.

| File | Change |
| --- | --- |
| `backend-thesis/controllers/eventConfigurationController.js` | New validation, ownership checks, image uploads, transactional configuration/speaker saving, and failure cleanup. |
| `backend-thesis/controllers/eventController.js` | Validate and pass eligibility edits into the event update. |
| `backend-thesis/models/eventModel.js` | Read existing configuration fields and ordered speakers; return date-only values; update basic event data and eligibility transactionally. |
| `backend-thesis/middleware/eventConfigurationUpload.js` | New bounded image multipart handling, separate from the existing PDF middleware. |
| `backend-thesis/utils/cloudinary.js` | Add image uploads and image-aware cleanup while retaining raw PDF behavior. |
| `backend-thesis/routes/eventRoutes.js` | Register configuration saving. |
| `backend-thesis/routes/kioskRoutes.js` | New approved-event list/detail endpoints with an explicit kiosk response field list. |
| `backend-thesis/server.js` | Register `/api/kiosk`. |
| `frontend-thesis/src/pages/Events/Events.jsx` | Load complete event details, preserve configuration fields, send configuration saves, reload saved results, and surface eligibility-load errors. |
| `frontend-thesis/src/components/Modal/ViewEvent/ViewEvent.jsx` | Persist all settings, show image previews, add/edit/remove/reorder speakers, and enable/disable photobooth schedules. |
| `frontend-thesis/src/components/Modal/ViewEvent/ViewEvent.css` | Small additions for image previews, speaker ordering, and availability controls. |
| `kiosk-frontend/src/utils/api.js` | Backend requests, explicit errors, and stored asset URL resolution. |
| `kiosk-frontend/src/utils/eventData.js` | Date/time formatting and Philippine-time photobooth availability. |
| `kiosk-frontend/src/utils/eventTheme.js` | Frontend-owned WIS event palette. Existing local Custom colors remain supported. |
| `kiosk-frontend/src/layouts/EventLayout/EventLayout.jsx` | Select/load/refresh an event, share context, scope theme/assets, and show loading/error states. |
| `kiosk-frontend/src/layouts/EventLayout/EventLayout.css` | Scoped event chooser/error styling, including failed custom-background loading; share footer visibility/height with the attendance scan pointer. |
| `kiosk-frontend/src/components/Events/EventHeader/EventHeader.jsx` | Event title/logo and refresh/change-event actions. |
| `kiosk-frontend/src/components/Events/EventHeader/EventHeader.css` | Compact event identity styling. |
| `kiosk-frontend/src/components/Events/EventFooter/EventFooter.jsx` | Event-aware navigation label and photobooth schedule tooltip. |
| `kiosk-frontend/src/components/Events/EventFooter/EventFooter.css` | Shared footer-height variable so the attendance pointer tracks the exact expanded footer boundary. |
| `kiosk-frontend/src/pages/Events/WelcomePage/WelcomePage.jsx` | Real event name/date/times/location/logo and navigation retaining event selection. |
| `kiosk-frontend/src/pages/Events/WelcomePage/WelcomePage.css` | Preserve uploaded logo proportions. |
| `kiosk-frontend/src/pages/Events/Information/Infrmation.jsx` | Display database description, ordered speakers, stored photo URLs, and honest empty/error text. |
| `kiosk-frontend/src/pages/Events/Information/Information.css` | Use the event palette for previously fixed main colors without changing layout. |
| `kiosk-frontend/src/pages/Attendance/Attendance.jsx` | Event identity/date/times/location from context; retain the subsequently supplied attendance UI and move its scan pointer outside the action flow. Fingerprint callbacks remain UI placeholders. |
| `kiosk-frontend/src/pages/Attendance/Attendance.css` | Theme-aware scanner box fixed at the kiosk's bottom right, moving above the expanded footer and to the screen edge when retracted. |
| `kiosk-frontend/src/pages/Events/Photobooth/Photobooth.jsx` | Event schedule gating and camera cleanup at closing; preserve the current photo UI. |
| `kiosk-frontend/src/pages/Events/Highlights/Highlights.jsx` | Preserve selected event on its existing back button. No highlights storage feature added. |
| `kiosk-frontend/src/pages/Home/Home.jsx` | Replace sample event tiles with approved database event links; retain the global kiosk design. |
| `backend-thesis/tests/event-flow.integration.mjs` | Opt-in live MySQL/Cloudinary/API test with temporary fixture cleanup. |
| `kiosk-frontend/tests/eventData.test.mjs` | Seven date/schedule boundary tests. |
| `docs/central-event-data.md` | Implementation, operating instructions, file inventory, verification, and limitations. |

## Verification performed

- Live central MySQL and API tests: event creation, both PDF uploads, configuration save, fresh GET after saving, direct SQL verification, multiple speaker records/order/photos, ownership rejection, invalid schedule/file rejection, basic event editing, eligibility replacement, approved-event configuration, and unavailable schedules represented by `NULL`.
- Live kiosk API tests: pending events excluded from list/detail, approved-event data returned, correct calendar date, ordered speakers and eligibility preserved, invalid ID handling, and exclusion of administrative fields/documents.
- Real Cloudinary image downloads returned HTTP 200 and image content types. Browser image tests also confirmed successful decoding of logo and speaker URLs. Custom background styling used its stored uploaded URL, and WIS mode suppressed it.
- Browser decoding of the uploaded background also succeeded (1159 × 1358 pixels). PDF uploads and URL persistence passed, but direct delivery of both test PDFs returned HTTP 401 with Cloudinary's `deny or ACL failure` message. PDF preview/delivery is therefore not claimed as passing.
- Chrome Admin tests: save a description, fully refresh, reopen the event, and verify persistence; upload logo/background/speaker photos; add/edit/reorder/remove speakers; save times and theme; refresh and verify all values again.
- Chrome kiosk tests: event selection, Home links, Welcome data, descriptions updated after Admin saving and kiosk retrieval, ordered speakers, stored images, eligibility display, header refresh/logo, WIS logo retention, Custom background selection, and no background in WIS mode.
- Browser schedule tests used a controlled clock and a deliberately rejected camera permission request: camera initialization occurs while scheduled open; advancing beyond the end removes the camera view. An unavailable schedule mounts no video. No actual fingerprint or camera capture was required for these tests.
- Injected API failure: the kiosk displayed the server error without placeholder event content, and Retry recovered after restoring the endpoint.
- Follow-up Attendance layout verification: the new scanner box matched the expanded footer's top exactly and reached the viewport bottom when retracted. Checked WIS/Custom colors, 720 × 1100 portrait, 390 × 844 compact, and 1920 × 1080 wide layouts. The user's revised attendance presentation was retained; it consumes central event metadata, while eligibility remains available in the shared event context.
- Both frontend production builds passed. Seven schedule/date unit tests passed. Targeted lint passed for the changed kiosk code and Admin modal.
- Broader lint still reports pre-existing findings: the Admin Events page has a hook after its role-based early return and an effect dependency warning; kiosk `EventPageTheme.jsx` has three unused-assignment errors. These are separate from the new data flow.

Run schedule tests from `kiosk-frontend` with `node --test tests/eventData.test.mjs`. Run live API tests from `backend-thesis` with `node --use-system-ca tests/event-flow.integration.mjs --live`. The live test writes temporary events/users/uploads to the configured services and cleans up only its own fixtures. `--serve` optionally keeps a loopback test server/fixture available for browser checks; POST to its `/__test/finish` endpoint to finish and clean up. The test fixture JSON is temporary and should not be committed.

The local test environment required Node's `--use-system-ca` for Cloudinary TLS trust, and an isolated Chrome process with network permission for hosted-image checks. Certificate verification remained enabled.

## Remaining limitations

- Cloudinary currently denies PDF delivery with HTTP 401 (`deny or ACL failure`). The same response was confirmed for a pre-existing event PDF, so this is not limited to new test uploads. PDF uploads still succeed, their URLs are preserved, and the existing PDF upload code is unchanged. Delivery/access configuration needs investigation in the existing Cloudinary account; no storage provider or account policy was changed here.
- Actual fingerprint attendance and fingerprint hardware remain unimplemented. The photobooth's existing final-photo/highlights storage behavior is unchanged; this stage adds configuration and schedule consumption only.
- No local kiosk database, offline fallback, sync queue, sync worker, or synchronization was added. API failures are shown to the user.
- This uses the existing application's actor-ID authorization convention. It checks roles/ownership but does not add cryptographically authenticated sessions; the existing trust model still needs separate hardening before an untrusted deployment.
- Successfully replaced/removed image assets are not automatically deleted from Cloudinary, to avoid deleting a URL still used elsewhere. Failed saves attempt cleanup of their newly uploaded images. Database references always point to the saved files.
- Schedules are same-day schedules. Overnight photobooth windows are not supported by the current validation.
