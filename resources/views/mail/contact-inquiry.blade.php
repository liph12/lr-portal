<x-mail::message>
# New inquiry from your contact page

Hi {{ $agentName }}, **{{ $inquiry->fullName() }}** sent you a message through your contact page.

<x-mail::panel>
{{ $inquiry->message }}
</x-mail::panel>

| | |
|:--|:--|
| **Inquiring as** | {{ $inquiry->inquirer_role }} |
| **Inquiry type** | {{ $inquiry->inquiry_type }} |
| **Email** | {{ $inquiry->email }} |
| **Contact number** | {{ $inquiry->contact_number }} |
| **Sent** | {{ $inquiry->created_at->timezone(config('app.timezone'))->format('M j, Y g:i A') }} |

Reply to this email to answer them directly.

<x-mail::button :url="'mailto:'.$inquiry->email">
Reply to {{ $inquiry->first_name }}
</x-mail::button>

Thanks,<br>
{{ config('app.name') }}
</x-mail::message>
