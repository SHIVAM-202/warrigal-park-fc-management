# Architecture Overview

Warrigal Park FC Management System — ISYS3001 Assessment 2

## Layers

The application is organised in four layers, each with a single
responsibility:

| Layer | Location | Responsibility |
|---|---|---|
| Routes | `src/routes/*.js` | HTTP endpoints. Parse requests, call the matching service, return JSON. |
| Services | `src/services/*.js` | Business logic. Enforce domain rules. |
| Database | `src/db/*` | SQLite connection, schema, and seed data. |
| Client | `src/public/*` | Single-page UI consuming the REST API. |

## Request flow

1. The client sends a request to a route (for example, `POST /api/registrations`).
2. The route validates the request shape and calls the matching service method.
3. The service applies domain rules, reads or writes the database, and returns
   a result or throws an error.
4. The route serialises the result as JSON with a consistent `success` / `error`
   envelope.
5. The client renders the result and surfaces any error message to the user.

## The junior guardian rule

The club's most important rule — *a member under 18 cannot hold a complete
registration without at least one linked guardian* — lives in exactly one
place: `src/services/registrationService.js`.

It is enforced at **two call sites**:

1. `createRegistration()` refuses a new registration with status `complete`
   when the member is under 18 and no guardian is linked.
2. `updateRegistrationStatus()` re-checks the same rule when a draft
   registration transitions to `complete`.

The second call site matters because a rule that only guards creation can
be bypassed by a later status change. Expressing the rule in one module and
calling it from two places is what makes it enforceable rather than merely
documented.

## Configuration

Configuration is loaded from environment variables by
`src/config/index.js` using the Twelve-Factor App pattern. A
`.env.<NODE_ENV>` file is loaded based on the current environment; no route
or service hard-codes a value.

## Deployment

The application is deployed as a container. The `Dockerfile` produces a
single image; `docker-compose.yml` runs that image with a named volume for
the SQLite file and a healthcheck that probes `/api/health`. The same image
runs in every environment; only the injected environment variables differ.
