---
description: Set up ongoing accessibility monitoring for a user journey, from verifying the domain through drafting and dry-running a flow, and know where to stop and hand it to a person.
---

A scan checks one page you can already reach by URL. A flow exists for
everything else: the checkout that only appears after something is in the
basket, the settings screen behind a sign-in, the search results that only exist
after a query. A flow is re-walked on a schedule, so a regression shows up as a
change rather than as a complaint.

## The sequence

1. `list_domains`. A flow can only target a verified domain.
2. If it is missing, `add_domain`, then relay the DNS TXT record exactly as
   given. Only a person can add it at the registrar. Members of a Google
   Workspace org verify their own org domain instantly, so try this before
   assuming a wait.
3. `generate_flows` with one plain sentence per journey.
4. Poll `get_draft` until its state is no longer `running`.
5. `run_flow` with `dry_run: true`, then `get_run` to read what happened.
6. Report, and stop. See below.

While DNS propagates, `scan_page` still works and is the useful thing to do
with the wait.

## Choose journeys that carry weight

Monitor the paths where a failure costs someone something: signing up, signing
in, searching and filtering, adding to a basket and checking out, contacting
support, changing account settings. A journey is worth its slot if breaking it
would generate a complaint.

Skip what a plain scan already covers. If the whole journey is "load the
homepage", scan the homepage instead and keep the flow budget for the paths a
scan cannot reach. Accounts have a flow cap, and refusals name it.

## Write the prose the way a person would say it

Each journey is one sentence describing what a person does, in the words the
site itself uses: `search for a product and add it to the basket`. Name what
someone would look for on screen, not selectors, ids or classes. Leave out
anything that changes between visits, such as a specific product name, a price
or a date, since a sentence pinned to today's content ages into a false alarm.

## Read a dry run as feedback on the sentence

A dry run tells you whether the steps actually work. When a step fails to
resolve, the usual cause is that the sentence described something other than
what a person really does, for example a step that is skipped when an item is
already in the basket, or a cookie banner nobody mentioned. Rewrite the journey
and generate again. Do not treat a failed dry run as a finding about the site.

A dry run records no findings, so it costs the site nothing and proves only that
the path is walkable.

## Stop before approval, and say so

Drafting and dry-running is the whole of your part. Monitoring begins only when
a person approves the dry run in the AccessLint web app, and no tool here can do
it for them. Close out by saying what you drafted, what the dry run showed, and
that it is waiting for their approval, with a link to the app where that
happens. Never describe a drafted flow as monitoring, scheduled or set up.
