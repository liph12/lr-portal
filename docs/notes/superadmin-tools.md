---
title: Superadmin tools
tags: [superadmin]
---

# Superadmin tools

Sign in as a user (impersonation), View as role. Related: [[management]] · back to [[README|index]].

- **Sign in as a user** (superadmin only; Management › Agents row action, agent profile button): `POST /impersonate/{user}`,
  `DELETE /impersonate` (safe to repeat: with nothing to stop it just goes home; a stray `GET /impersonate` too), `ImpersonationService` (session key `impersonator_id`; each switch moves to a new session id and **retires the old one** —
  every response re-sends the session cookie, so a slow background request still on the old session would put it back and
  undo the switch; `DropRetiredSessionCookie` (outermost web middleware) drops such a response's cookie and the row it re-saved, and answers a
  GET with a redirect to itself so the page is rebuilt for the current session; `AppFeedback` flushes prefetched pages after every
  finished write (per visit) and whenever `auth.id` / `auth.impersonator` changes). Never on superadmins or inactive users; `ImpersonationBanner` in `AppLayout`;
  activity logs get `impersonated_by`. Shared: `auth.impersonator`, `auth.can.impersonate`.
- **View as role** (superadmin testing): profile menu → "View the portal as …" (`POST/DELETE /view-as`,
  `ViewAsService`, encrypted cookie `lr_view_as` — **not** the session: the database session is rewritten whole by
  every request, so a slow background request would end the preview). `ApplyViewAsRole` middleware (before
  `HandleInertiaRequests`) calls `User::viewAs($role)`, after which `hasRole`, `hasAnyRole`, `portal`,
  `permissions` and every gate/policy act as that role; `User::reallyHasRole()` ignores the preview (only
  for starting/stopping it). Shared: `auth.viewing_as`, `auth.view_as_roles`, `auth.can.view_as`;
  `ViewAsBanner` (in `AppLayout`) offers the way back. Never check roles another way than these methods.
