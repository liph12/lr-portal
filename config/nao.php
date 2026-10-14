<?php

// New Agents Orientation (NAO). Agents who didn't attend one face to face watch the New Agents Webinar instead.
return [
    'webinar' => [
        'video_id' => env('NAO_WEBINAR_VIDEO', 'BRhXiqvyXVs'),
        // The video's length decides the % on the server, so a client can't claim 100% by sending its own duration.
        'seconds' => (int) env('NAO_WEBINAR_SECONDS', 2963),
    ],
];
