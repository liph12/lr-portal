<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Activity Log
    |--------------------------------------------------------------------------
    |
    | Every state-changing request (POST, PUT, PATCH, DELETE) is written to
    | the activity_logs table by the LogActivity middleware. GET requests are
    | skipped unless ACTIVITY_LOG_GET is on, since page views would bury the
    | actions worth tracing.
    |
    */

    'enabled' => env('ACTIVITY_LOG_ENABLED', true),

    'log_get_requests' => env('ACTIVITY_LOG_GET', false),

    // Rows older than this are deleted by the scheduled `model:prune`.
    'retention_days' => (int) env('ACTIVITY_LOG_RETENTION_DAYS', 365),

    // Request keys whose values are never stored (matched case-insensitively, at any depth).
    'redact' => [
        'password',
        'password_confirmation',
        // The emailed sign-up code (agent registration).
        'code',
        'current_password',
        'new_password',
        '_token',
        'token',
        'secret',
        'api_key',
        'otp',
        'pin',
        // A brokerage property owner's name goes on the generated commission slip only, never into the database.
        'property_owner',
        // A drawn signature (a large image as text); the stored file is logged by the service instead.
        'signature',
    ],

    // Longer string values are cut so one request can't bloat the table.
    'max_string_length' => 1000,

    // Routes too noisy or sensitive to log at all.
    'except_paths' => [
        'up',
    ],

];
