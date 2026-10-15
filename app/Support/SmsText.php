<?php

namespace App\Support;

// Text-message arithmetic shared by sending and its checks: how many SMS parts a message takes (each part of each recipient
// is one credit), and Philippine mobile numbers in the 09XXXXXXXXX form Semaphore takes. helpers/smsParts.ts mirrors it.
class SmsText
{
    // Longest message: three parts (459 plain characters, or 201 with emoji / other Unicode).
    public const MAX_PARTS = 3;

    // GSM 7-bit characters; the extension ones count twice.
    private const GSM = "@£\$¥èéùìòÇ\nØø\rÅåΔ_ΦΓΛΩΠΨΣΘΞÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà";

    private const GSM_EXTENDED = '^{}\\[~]|€';

    public static function parts(string $message): int
    {
        if ($message === '') {
            return 0;
        }
        $chars = mb_str_split($message);
        $length = 0;
        foreach ($chars as $c) {
            if (str_contains(self::GSM_EXTENDED, $c)) {
                $length += 2;
            } elseif (str_contains(self::GSM, $c)) {
                $length++;
            } else {
                // One character outside GSM makes the whole message Unicode: 70 a part, 67 when split.
                $length = count($chars);

                return $length <= 70 ? 1 : (int) ceil($length / 67);
            }
        }

        return $length <= 160 ? 1 : (int) ceil($length / 153);
    }

    // A Philippine mobile number as 09XXXXXXXXX, from the shapes the records hold (+63 / 63 / 9…, dashes, spaces; "a / b" =
    // the first); null when it isn't one.
    public static function mobile(?string $value): ?string
    {
        $first = preg_split('/[\/,;]/', (string) $value)[0] ?? '';
        $digits = preg_replace('/\D/', '', $first);

        return match (true) {
            strlen($digits) === 11 && str_starts_with($digits, '09') => $digits,
            strlen($digits) === 12 && str_starts_with($digits, '639') => '0'.substr($digits, 2),
            strlen($digits) === 10 && str_starts_with($digits, '9') => '0'.$digits,
            default => null,
        };
    }

    /**
     * Typed-in numbers (separated by commas, new lines or spaces): the valid ones, normalised and unique, and the rest.
     *
     * @return array{valid: string[], invalid: string[]}
     */
    public static function numbers(?string $text): array
    {
        $valid = $invalid = [];
        // Commas, semicolons and new lines separate numbers; spaces may sit inside one ("0917 123 4567") or between several.
        foreach (preg_split('/[,;\r\n]+/', trim((string) $text), -1, PREG_SPLIT_NO_EMPTY) as $token) {
            if ($n = self::mobile($token)) {
                $valid[$n] = $n;

                continue;
            }
            foreach (preg_split('/\s+/', trim($token), -1, PREG_SPLIT_NO_EMPTY) as $raw) {
                ($n = self::mobile($raw)) ? $valid[$n] = $n : $invalid[] = $raw;
            }
        }

        return ['valid' => array_values($valid), 'invalid' => $invalid];
    }
}
