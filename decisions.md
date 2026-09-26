# Decision Log

This log records the design decisions made during sprint 1 and the
reasoning behind each one.

## D1 — SQLite for development, PostgreSQL proposed for production

SQLite was chosen for local development and automated testing because
it requires zero setup and runs in-process. For the production
deployment, PostgreSQL is proposed because it supports concurrent
writes, point-in-time recovery, and is offered as a managed add-on by
every hosting provider under consideration.

## D2 — Junior guardian rule enforced at two call sites

The rule "a junior cannot hold a complete registration without a
guardian" is enforced both when a registration is created and when
its status is later changed to `complete`. A single enforcement point
would allow a draft registration to be completed after the fact,
bypassing the rule.

## D3 — Guardian record rather than a name field on the child

A junior's guardian is stored as a foreign key to a `guardians` row,
not as typed text on the member. This means two siblings share one
parent record and updating that parent's mobile number updates it for
every child.

## D4 — Docker container with a health endpoint

The application exposes `GET /api/health` returning the current
environment and version. This endpoint is used by the Docker
healthcheck, by the CI container smoke test, and by the UI
configuration tab.

## D5 — Trunk-based branching

The team used `main`, `develop`, `release/vX.Y.Z`, and short-lived
`feature/*` branches. Every feature merged into `develop` via pull
request; releases were cut from `release/*` and merged into both
`develop` and `main`.
