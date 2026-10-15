<?php

// The legacy database (connection `legacy`) and how it becomes this portal's data: `legacy:dump` / `legacy:restore` bring
// it over without the tables below, `legacy:migrate` runs the steps in order (see docs/legacy-migration/README.md).
return [
    // Never copied: activity logs, the old inbox and API tokens (rewritten at every sign-in / sign-out) — nothing imports them,
    // and they are ~800MB of the ~1.2GB dump.
    'excluded_tables' => array_values(array_filter(array_map('trim', explode(',', (string) env(
        'LEGACY_EXCLUDED_TABLES',
        'activity_tracker,inbox_improved,personal_access_tokens',
    ))))),

    // Where dumps are written and looked for.
    'dump_dir' => storage_path('app/private/legacy'),

    // The CLI PHP that runs a migration started from the page (the web server's own binary may be php-fpm).
    'php_binary' => env('LEGACY_PHP_BINARY'),

    // The import, in order: artisan command => what it does. Every legacy:* command must be listed here or in
    // `not_in_migration` (LegacyMigrationPlanTest), so a new importer can't be forgotten on deploy day.
    'steps' => [
        'legacy:import-members' => 'Members → users, agents, profiles, NAO / FIRE attributes',
        'legacy:fill-existing-accounts' => 'Fill in accounts that existed before the import (the seeded team)',
        'legacy:import-registration-status' => 'Registration stepper status (fully registered = 4)',
        'legacy:import-agent-types' => 'Country, agent type and the Global Partner role',
        'legacy:import-lr-joined' => 'Date joined Leuterio Realty',
        'legacy:import-partner-confirmations' => 'Global partners confirmed by their sponsor',
        'legacy:import-last-activity' => 'Last active date',
        'agents:assign-areas' => 'Branch (area) from each agent\'s address',
        'legacy:import-offices' => 'Offices, their areas and secretaries',
        'legacy:import-teams' => 'Teams, sub-teams and memberships (history kept)',
        'legacy:import-brokers' => 'Brokers; old Broker role holders → team leader / unit manager / agent (needs teams)',
        'legacy:import-sales-cutoffs' => 'Monthly sales cutoffs',
        'legacy:import-developers' => 'Property types, developers and their projects (the sales point at them)',
        'legacy:import-sales' => 'Sales report → project, rental and brokerage sales',
        'legacy:import-sale-links' => 'Fill in any sale\'s missing developer, project or property type',
        'legacy:import-client-names' => 'Client names (the client, not the agent)',
        'legacy:import-client-ages' => 'Client ages',
        'legacy:import-international-sales' => 'International sales of global partners',
        'legacy:import-documents' => 'Agents\' requirement documents',
        'rentals:link-unregistered-agents' => 'Link rentals of agents who had no account yet',
        'agents:refresh-activity' => 'Active / dormant agents (6 months without a sale)',
    ],

    // legacy:* commands that are tools, not import steps.
    'not_in_migration' => ['legacy:dump', 'legacy:restore', 'legacy:migrate', 'legacy:rehearse'],
];
