<x-mail::message>
# Reset your password

Use this code, or the button below, to reset your Leuterio Realty password:

<x-mail::panel>
# {{ $code }}
</x-mail::panel>

<x-mail::button :url="$link">
Reset password
</x-mail::button>

Both work for {{ $minutes }} minutes. If you didn't ask for this, you can ignore this email — your password stays the same.

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
