<x-mail::message>
# Confirm your email

Use this code to continue your Leuterio Realty registration:

<x-mail::panel>
# {{ $code }}
</x-mail::panel>

It works for {{ $minutes }} minutes. If you didn't ask for it, you can ignore this email.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
