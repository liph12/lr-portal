<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Third Party Services
    |--------------------------------------------------------------------------
    |
    | This file is for storing the credentials for third party services such
    | as Mailgun, Postmark, AWS and more. This file provides the de facto
    | location for this type of information, allowing packages to have
    | a conventional file to locate the various service credentials.
    |
    */

    // FIRE training modules and exams (FireTrainingService): the realestatetraining.ph integration API, called from the server only.
    'fire' => [
        'url' => env('FIRE_API_URL', 'https://realestatetraining.ph/api/integration/agent'),
        'key' => env('FIRE_API_KEY'),
        // The endorsement letter agents download, sign and upload before FIRE opens for them.
        'endorsement_template' => env('FIRE_ENDORSEMENT_TEMPLATE', "https://realestatetraining.ph/Agent's%20Endorsement%20Letter.pdf"),
    ],

    // FIRE training certificates by email (FireCertificateService).
    'fire_certificates' => [
        'url' => env('FIRE_CERTIFICATES_URL', 'https://realestatetraining.ph/get-certificates'),
    ],

    'postmark' => [
        'key' => env('POSTMARK_API_KEY'),
    ],

    'resend' => [
        'key' => env('RESEND_API_KEY'),
    ],

    'ses' => [
        'key' => env('AWS_ACCESS_KEY_ID'),
        'secret' => env('AWS_SECRET_ACCESS_KEY'),
        'region' => env('AWS_DEFAULT_REGION', 'us-east-1'),
    ],

    'slack' => [
        'notifications' => [
            'bot_user_oauth_token' => env('SLACK_BOT_USER_OAUTH_TOKEN'),
            'channel' => env('SLACK_BOT_USER_DEFAULT_CHANNEL'),
        ],
    ],

];
