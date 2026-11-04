{{-- Email clients ignore CSS variables and stylesheets: inline styles and the brand's hex values (app.css light tokens). --}}
@php
    $c = ['primary' => '#0055b3', 'accent' => '#d7141a', 'text' => '#0f1419', 'body' => '#2b313a', 'muted' => '#5b6472', 'border' => '#e3e7ee', 'page' => '#f2f4f8', 'soft' => '#f6f7f9', 'old' => '#2a78d6', 'new' => '#eb6834'];
    $verdicts = ['good' => ['#1e8e3e', 'Good'], 'watch' => ['#b06000', 'Watch'], 'risk' => ['#c62828', 'Risk']];
    $impacts = ['high' => ['#0055b3', '#e9f1fb'], 'medium' => ['#2b313a', '#eef1f5'], 'low' => ['#5b6472', '#eef1f5']];
    $old = $facts['contribution']['old'];
    $new = $facts['contribution']['new'];
    $h2 = "margin:28px 0 8px;font-size:17px;font-weight:700;color:{$c['text']};";
    $p = "margin:8px 0;font-size:14px;line-height:1.6;color:{$c['body']};";
    $small = "font-size:12px;color:{$c['muted']};";
    $first = $leader ? explode(' ', $leader['name'])[0] : null;
@endphp
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Recruits Progress AI analysis</title>
</head>
<body style="margin:0;padding:0;background:{{ $c['page'] }};font-family:Inter,'Segoe UI',Roboto,Arial,sans-serif;">
<div style="display:none;max-height:0;overflow:hidden;">{{ $ai['summary'] }}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:{{ $c['page'] }};">
<tr><td align="center" style="padding:24px 12px;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:680px;background:#ffffff;border:1px solid {{ $c['border'] }};border-radius:12px;overflow:hidden;">
    <tr><td style="background:{{ $c['primary'] }};padding:20px 28px;">
        <img src="{{ url('/assets/lr-logo-white.png') }}" alt="Leuterio Realty & Brokerage" height="34" style="display:block;height:34px;border:0;">
    </td></tr>
    <tr><td style="padding:28px;">
        <p style="margin:0;font-size:12px;font-weight:700;letter-spacing:.6px;text-transform:uppercase;color:{{ $c['accent'] }};">Recruits Progress · AI analysis</p>
        <h1 style="margin:6px 0 2px;font-size:24px;line-height:1.25;color:{{ $c['text'] }};">{{ $group }}</h1>
        <p style="margin:0;{{ $small }}font-size:13px;">{{ ucfirst($kind) }} · {{ $range }}</p>

        @if ($audience === 'superadmins')
            <p style="{{ $p }}margin-top:20px;">Hello,</p>
            <p style="{{ $p }}">Here is the analysis of {{ $group }}'s sales, new agents and training for {{ $range }}, sent by {{ $sender }}.</p>
            <p style="margin:12px 0;padding:10px 12px;border-radius:8px;background:#fef7e0;font-size:13px;line-height:1.5;color:{{ $c['body'] }};">
                <strong>Superadmins only.</strong> This copy went to the superadmins; it was not sent to the {{ $kind === 'team' ? 'team leader' : 'unit manager' }}{{ $leader ? ' ('.$leader['name'].')' : '' }}.
            </p>
        @else
            <p style="{{ $p }}margin-top:20px;">Hi {{ $first }},</p>
            <p style="{{ $p }}">Here is the analysis of your {{ $kind }}'s sales, new agents and training for {{ $range }}, sent by {{ $sender }}. The superadmins received a copy.</p>
        @endif

        {{-- Summary --}}
        <h2 style="{{ $h2 }}">Summary</h2>
        <p style="{{ $p }}">{{ $ai['summary'] }}</p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
            @foreach ($ai['highlights'] as $h)
                @php([$color, $label] = $verdicts[$h['verdict']] ?? $verdicts['watch'])
                <tr>
                    <td valign="top" style="padding:5px 10px 5px 0;width:62px;"><span style="display:inline-block;padding:2px 8px;border-radius:99px;font-size:11px;font-weight:700;color:#ffffff;background:{{ $color }};">{{ $label }}</span></td>
                    <td style="padding:5px 0;font-size:14px;line-height:1.5;color:{{ $c['body'] }};">{{ $h['text'] }}</td>
                </tr>
            @endforeach
        </table>

        {{-- Contribution --}}
        <h2 style="{{ $h2 }}">Contribution KPI: old vs new agents</h2>
        <p style="margin:0 0 10px;{{ $small }}">Valid sales reserved {{ $range }}. New agents are members who signed up in that range; old agents are everyone else.</p>
        <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="border-collapse:collapse;font-size:13px;color:{{ $c['body'] }};">
            <tr style="background:{{ $c['soft'] }};">
                <th align="left" style="padding:8px 10px;border-bottom:1px solid {{ $c['border'] }};{{ $small }}font-weight:700;"></th>
                <th align="right" style="padding:8px 10px;border-bottom:1px solid {{ $c['border'] }};color:{{ $c['old'] }};">Old agents</th>
                <th align="right" style="padding:8px 10px;border-bottom:1px solid {{ $c['border'] }};color:{{ $c['new'] }};">New agents</th>
            </tr>
            @foreach ([
                ['Sales', $peso($old['value']), $peso($new['value'])],
                ['Share of the '.$kind."'s sales", $old['share_pct'].'%', $new['share_pct'].'%'],
                ['Number of sales', number_format($old['sales']), number_format($new['sales'])],
                ['Agents who made a sale', number_format($old['sellers']).' of '.number_format($old['agents']), number_format($new['sellers']).' of '.number_format($new['agents'])],
                ['Productivity (agents who made a sale)', $old['productivity_pct'].'%', $new['productivity_pct'].'%'],
                ['Sales per seller', $pesoShort($old['per_seller']), $pesoShort($new['per_seller'])],
            ] as [$label, $a, $b])
                <tr>
                    <td style="padding:8px 10px;border-bottom:1px solid {{ $c['border'] }};">{{ $label }}</td>
                    <td align="right" style="padding:8px 10px;border-bottom:1px solid {{ $c['border'] }};font-weight:600;color:{{ $c['text'] }};white-space:nowrap;">{{ $a }}</td>
                    <td align="right" style="padding:8px 10px;border-bottom:1px solid {{ $c['border'] }};font-weight:600;color:{{ $c['text'] }};white-space:nowrap;">{{ $b }}</td>
                </tr>
            @endforeach
        </table>
        @if ($facts['contribution']['total'] > 0)
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:12px;border-radius:99px;overflow:hidden;">
                <tr>
                    @if ($old['share_pct'] > 0)<td style="height:12px;background:{{ $c['old'] }};width:{{ $old['share_pct'] }}%;font-size:0;line-height:0;">&nbsp;</td>@endif
                    @if ($new['share_pct'] > 0)<td style="height:12px;background:{{ $c['new'] }};width:{{ $new['share_pct'] }}%;font-size:0;line-height:0;">&nbsp;</td>@endif
                </tr>
            </table>
            <p style="margin:6px 0 0;{{ $small }}"><span style="color:{{ $c['old'] }};">■</span> Old agents {{ $old['share_pct'] }}% &nbsp; <span style="color:{{ $c['new'] }};">■</span> New agents {{ $new['share_pct'] }}% of {{ $peso($facts['contribution']['total']) }} in sales</p>
        @endif
        <p style="{{ $p }}">{{ $ai['contribution'] }}</p>

        {{-- Next 3 months --}}
        <h2 style="{{ $h2 }}">The next 3 months</h2>
        <p style="{{ $p }}">To double sales, the {{ $kind }} needs <strong>{{ $peso($facts['double']['target_monthly']) }} a month</strong>, twice the last 3 months' average of {{ $peso($facts['double']['baseline_monthly']) }}.
            @if ($facts['capacity']['sellers_needed'])
                In the last 3 months {{ number_format(round($facts['capacity']['sellers_per_month'])) }} agents made a sale each month, at {{ $pesoShort($facts['capacity']['value_per_seller_month']) }} each; at that rate the target needs about <strong>{{ number_format($facts['capacity']['sellers_needed']) }} sellers a month</strong>.
            @endif
        </p>
        @foreach ($facts['forecast'] as $i => $f)
            @php($o = $ai['outlook'][$i] ?? null)
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:12px;border:1px solid {{ $c['border'] }};border-radius:10px;background:{{ $c['soft'] }};">
                <tr><td style="padding:14px 16px;">
                    <p style="margin:0;font-size:13px;font-weight:700;color:{{ $c['primary'] }};">{{ $month($f['month']) }}</p>
                    <p style="margin:2px 0;font-size:20px;font-weight:700;color:{{ $c['text'] }};">{{ $pesoShort($f['value']) }} <span style="{{ $small }}font-weight:400;">forecast</span></p>
                    <p style="margin:0;{{ $small }}">Likely {{ $pesoShort($f['low']) }} – {{ $pesoShort($f['high']) }} · {{ $pesoShort(max(0, $facts['double']['target_monthly'] - $f['value'])) }} below the target of {{ $pesoShort($facts['double']['target_monthly']) }}</p>
                    @if ($o)
                        <p style="{{ $p }}margin-bottom:4px;">{{ $o['expectation'] }}</p>
                        <p style="margin:6px 0 2px;font-size:14px;font-weight:700;color:{{ $c['text'] }};">Focus: {{ $o['focus'] }}</p>
                        <ul style="margin:4px 0 0;padding-left:20px;font-size:14px;line-height:1.55;color:{{ $c['body'] }};">
                            @foreach ($o['actions'] as $action)<li>{{ $action }}</li>@endforeach
                        </ul>
                    @endif
                </td></tr>
            </table>
        @endforeach

        {{-- Training --}}
        <h2 style="{{ $h2 }}">NAO &amp; FIRE</h2>
        <p style="{{ $p }}">{{ $ai['training'] }}</p>

        {{-- Strategies --}}
        <h2 style="{{ $h2 }}">10 strategies to double the {{ $kind }}'s sales</h2>
        <p style="margin:0 0 6px;{{ $small }}">From {{ $peso($facts['double']['baseline_monthly']) }} to {{ $peso($facts['double']['target_monthly']) }} a month, highest impact first.</p>
        @foreach ($ai['strategies'] as $i => $s)
            @php([$ink, $tint] = $impacts[$s['impact']] ?? $impacts['medium'])
            <table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin-top:10px;border:1px solid {{ $c['border'] }};border-radius:10px;">
                <tr>
                    <td valign="top" style="padding:14px 0 14px 14px;width:30px;">
                        <div style="width:28px;height:28px;line-height:28px;border-radius:99px;background:{{ $c['primary'] }};color:#ffffff;text-align:center;font-size:13px;font-weight:700;">{{ $i + 1 }}</div>
                    </td>
                    <td style="padding:14px 16px 14px 12px;">
                        <p style="margin:0;font-size:15px;font-weight:700;color:{{ $c['text'] }};">{{ $s['title'] }}
                            <span style="display:inline-block;margin-left:6px;padding:2px 8px;border-radius:99px;font-size:10px;font-weight:700;letter-spacing:.4px;text-transform:uppercase;color:{{ $ink }};background:{{ $tint }};vertical-align:middle;">{{ $s['impact'] }} impact</span>
                        </p>
                        <p style="margin:6px 0;font-size:14px;line-height:1.55;color:{{ $c['body'] }};">{{ $s['detail'] }}</p>
                        <p style="margin:0;font-size:12.5px;color:{{ $c['muted'] }};"><strong>Owner:</strong> {{ ucfirst($s['owner']) }} &nbsp;·&nbsp; <strong>KPI:</strong> {{ $s['kpi'] }}</p>
                    </td>
                </tr>
            </table>
        @endforeach

        <table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;">
            <tr><td style="border-radius:99px;background:{{ $c['primary'] }};">
                <a href="{{ $portalUrl }}" style="display:inline-block;padding:12px 22px;font-size:14px;font-weight:700;color:#ffffff;text-decoration:none;">Open in Recruits Progress</a>
            </td></tr>
        </table>
    </td></tr>
    <tr><td style="padding:16px 28px;border-top:1px solid {{ $c['border'] }};background:{{ $c['soft'] }};">
        <p style="margin:0;{{ $small }}line-height:1.5;">The figures are calculated by the portal from valid sales and are exact. The commentary was written by AI ({{ $model }}) from the {{ $kind }}'s totals on {{ \Carbon\CarbonImmutable::parse($ai['generated_at'])->format('M j, Y g:i A') }}; no names or personal details were shared. Review it before acting on it.</p>
        <p style="margin:8px 0 0;{{ $small }}">Leuterio Realty &amp; Brokerage · sent by {{ $sender }} from the portal</p>
    </td></tr>
</table>
</td></tr>
</table>
</body>
</html>
