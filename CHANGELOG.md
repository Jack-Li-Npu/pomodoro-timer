# Changelog

## 2.0.0 — 2026-09-09

Rebuilt the original fixed-interval timer as **Pomo Studio**, a bilingual personal focus workspace.

### Added

- Task planning, estimates, editing, completion and local persistence.
- Per-task return tickets, a thought inbox and thought-to-task conversion.
- Energy-based one-session durations, flow extensions and partial-session accounting.
- Configurable focus/break durations, cycle length and daily intention.
- Seven-day activity summaries and a session journal.
- English / 简体中文 UI, light/dark themes, mobile layout and built-in guide.
- Validated JSON backup import with review, exports and unreadable-data recovery.
- Web Locks ownership and synchronization for multiple tabs where supported.
- Production service-worker cache and visible installation status; see the documented embedded-browser offline limitation.
- Illustrated bilingual documentation, architecture guide, automated tests, CI and manual Pages deployment.

### Changed

- Timer restoration now uses an absolute deadline instead of relying on one-second decrements.
- Every phase starts manually; a closed/suspended browser never generates unattended cycles.
- Dedicated CSS replaces the old Tailwind setup; obsolete timer component and configuration removed.
- Dependency updates and an MIT license file matching the original README declaration.
