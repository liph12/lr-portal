<?php

namespace App\Services;

use GdImage;
use RuntimeException;

// A commission report slip — brokerage (Leuterio Realty) or rental (Rent.ph) — drawn as a PNG when the sale is encoded
// (it may carry details never stored elsewhere, like a property owner's name), and later signed by whoever received the
// commission. A white paper card on a light backdrop: branded header, three amounts as tiles, labelled sections, and a
// tear-off stub whose boxes sit a fixed distance from the bottom, so stamping finds them whatever the slip's length.
class CommissionSlipImage
{
    private const WIDTH = 1240;

    private const MARGIN_X = 70;

    private const MARGIN_TOP = 60;

    private const PAD = 64;

    private const RADIUS = 30;

    private const HEADER = 290;

    private const STATUS_PILL = [880, 270, 1106, 316];

    // The stub, measured up from the image's bottom edge: box top / bottom, card bottom.
    private const STUB_BOX_TOP = 340;

    private const STUB_BOX_BOTTOM = 160;

    private const CARD_BOTTOM = 60;

    private const LAYOUTS = [
        'brokerage' => ['title' => 'BROKERAGE COMMISSION', 'logo' => 'assets/lr-logo-white.png', 'plate' => false, 'band' => '#1f2b4d', 'band_soft' => '#2c3b66', 'accent' => '#d93025', 'heading' => '#d93025'],
        'rental' => ['title' => 'RENT COMMISSION', 'logo' => 'assets/rentph-logo.png', 'plate' => true, 'band' => '#0d4a91', 'band_soft' => '#1e5ca6', 'accent' => '#f7931e', 'heading' => '#d9730d'],
    ];

    private const COLORS = [
        'backdrop' => '#e9edf4',
        'paper' => '#ffffff',
        'on_band' => '#d5def0',
        'ink' => '#1f2430',
        'muted' => '#6b7280',
        'faint' => '#9aa1ad',
        'rule' => '#e5e8ef',
        'edge' => '#d9deea',
        'tile' => '#f3f6fc',
        'amber' => '#b45309',
        'amber_soft' => '#fef3c7',
        'green' => '#15803d',
        'green_soft' => '#dcfce7',
        'red' => '#b91c1c',
        'red_soft' => '#fee2e2',
    ];

    /**
     * @param  'brokerage'|'rental'  $kind
     * @param  array{serial: string, date_label: string, date: ?string, tiles: list<array{0: string, 1: ?string, 2: string}>, sections: list<array{0: string, 1: list<array{0: string, 1: ?string}>}>}  $slip
     */
    public function render(string $kind, array $slip): string
    {
        $layout = self::LAYOUTS[$kind];
        $rows = array_sum(array_map(fn ($s) => (int) ceil(count($s[1]) / 2), $slip['sections']));
        $contentEnd = self::MARGIN_TOP + 570 + count($slip['sections']) * 62 + $rows * 92;
        $height = $contentEnd + 110 + self::STUB_BOX_TOP;

        $image = imagecreatetruecolor(self::WIDTH, $height);
        imagealphablending($image, true);
        $c = $this->palette($image, $layout);
        imagefill($image, 0, 0, $c['backdrop']);
        [$left, $top, $right, $bottom] = [self::MARGIN_X, self::MARGIN_TOP, self::WIDTH - self::MARGIN_X, $height - self::CARD_BOTTOM];
        $inner = [$left + self::PAD, $right - self::PAD];

        // The paper: a faint, even shadow and a hairline edge, then the card.
        for ($i = 10; $i >= 1; $i--) {
            $this->roundedRect($image, $left - $i, $top - $i + 6, $right + $i, $bottom + $i + 6, self::RADIUS + $i, imagecolorallocatealpha($image, 31, 43, 77, 126));
        }
        $this->roundedRect($image, $left - 1, $top - 1, $right + 1, $bottom + 1, self::RADIUS + 1, $c['edge']);
        $this->roundedRect($image, $left, $top, $right, $bottom, self::RADIUS, $c['paper']);

        // Header band (rounded at the top only), the brand and the title.
        $this->roundedRect($image, $left, $top, $right, $top + self::HEADER, self::RADIUS, $c['band']);
        imagefilledrectangle($image, $left, $top + self::HEADER - 30, $right, $top + self::HEADER, $c['band']);
        imagefilledrectangle($image, $left, $top + self::HEADER - 6, $right, $top + self::HEADER, $c['accent']);
        if ($layout['plate']) {
            // A coloured logo needs a light plate on the band.
            $this->roundedRect($image, $inner[0], $top + 44, $inner[0] + 320, $top + 162, 18, $c['paper']);
            $this->logo($image, $layout['logo'], $inner[0] + 22, $top + 58, 276);
        } else {
            $this->logo($image, $layout['logo'], $inner[0], $top + 40, 290);
        }
        $this->textRight($image, $layout['title'], 30, $inner[1], $top + 92, $c['paper'], true);
        $this->textRight($image, 'Report Slip', 24, $inner[1], $top + 132, $c['on_band']);
        $serial = 'No. '.$slip['serial'];
        $pillWidth = $this->width($serial, 18, true) + 44;
        $this->roundedRect($image, $inner[1] - $pillWidth, $top + 152, $inner[1], $top + 194, 21, $c['band_soft']);
        $this->textRight($image, $serial, 18, $inner[1] - 22, $top + 180, $c['paper'], true);
        $dateLabel = mb_strtoupper($slip['date_label']);
        $this->text($image, $dateLabel, 14, $inner[0], $top + 244, $c['on_band'], true);
        $this->text($image, $slip['date'] ?? '—', 22, $inner[0] + $this->width($dateLabel, 14, true) + 18, $top + 246, $c['paper'], true);
        $this->statusPill($image, 'awaiting', $c['band']);

        // The amounts.
        $y = $top + 340;
        $gap = 22;
        $tileWidth = (int) floor(($inner[1] - $inner[0] - 2 * $gap) / 3);
        foreach ($slip['tiles'] as $i => [$label, $amount, $hint]) {
            $x1 = $inner[0] + $i * ($tileWidth + $gap);
            $this->roundedRect($image, $x1, $y, $x1 + $tileWidth, $y + 170, 20, $c['tile']);
            imagefilledrectangle($image, $x1 + 24, $y + 30, $x1 + 30, $y + 54, $i === 0 ? $c['accent'] : $c['band']);
            $this->fit($image, mb_strtoupper($label), 13, $x1 + 42, $y + 50, $tileWidth - 66, $c['muted'], true);
            $this->fit($image, $amount ?? '—', 30, $x1 + 24, $y + 112, $tileWidth - 48, $amount ? $c['ink'] : $c['faint'], true);
            $this->fit($image, $hint, 14, $x1 + 24, $y + 148, $tileWidth - 48, $c['faint']);
        }

        // The details, two to a row.
        $y += 230;
        foreach ($slip['sections'] as [$title, $fields]) {
            $y = $this->section($image, $c, $title, $fields, $y, $inner);
        }

        // The stub: a perforated tear line with notches cut into the paper's edges, then the receipt boxes.
        $tear = $height - self::STUB_BOX_TOP - 90;
        for ($x = $left + 30; $x < $right - 30; $x += 22) {
            imagefilledrectangle($image, $x, $tear - 1, $x + 11, $tear + 1, $c['rule']);
        }
        imagefilledellipse($image, $left, $tear, 44, 44, $c['backdrop']);
        imagefilledellipse($image, $right, $tear, 44, 44, $c['backdrop']);
        [$received, $dated] = $this->stubBoxes($height);
        $this->text($image, 'RECEIVED & SIGNED BY', 14, $received[0], $received[1] - 18, $c['muted'], true);
        $this->text($image, 'DATE RECEIVED', 14, $dated[0], $dated[1] - 18, $c['muted'], true);
        $this->roundedRect($image, ...[...$received, 16, $c['tile']]);
        $this->roundedRect($image, ...[...$dated, 16, $c['tile']]);
        $this->text($image, 'Generated by LR Portal · keep with the sale\'s records', 13, $inner[0], $bottom - 34, $c['faint']);

        return $this->png($image);
    }

    // Signs the stub: the receiver's signature above their name, the date beside it, and the status pill turned green.
    // The boxes are cleared first, so signing again (e.g. a corrected date) replaces what was there.
    public function stampReceived(string $png, string $receivedBy, string $date, ?string $signaturePng = null): string
    {
        $image = imagecreatefromstring($png) ?: throw new RuntimeException('The stored slip is not an image.');
        imagealphablending($image, true);
        $c = $this->palette($image);
        [[$x1, $y1, $x2, $y2], [$dx1, $dy1, $dx2, $dy2]] = $this->clearStub($image);
        if ($signaturePng && ($signature = $this->trimmed($signaturePng))) {
            $this->placeInside($image, $signature, $x1 + 24, $y1 + 12, $x2 - $x1 - 48, 104);
        }
        imageline($image, $x1 + 24, $y2 - 58, $x2 - 24, $y2 - 58, $c['edge']);
        $this->fit($image, $receivedBy, 22, $x1 + 24, $y2 - 24, $x2 - $x1 - 48, $c['ink'], true);
        $this->fit($image, $date, 24, $dx1 + 24, (int) (($dy1 + $dy2) / 2) + 10, $dx2 - $dx1 - 48, $c['ink'], true);
        // The band colour behind the pill, read from the slip itself.
        $this->statusPill($image, 'received', imagecolorat($image, self::STATUS_PILL[0] - 6, self::STATUS_PILL[1] + 20));

        return $this->png($image);
    }

    // Marks the slip disapproved: a red pill, and who disapproved it, when and why in the stub.
    public function stampDisapproved(string $png, string $by, string $date, string $reason): string
    {
        $image = imagecreatefromstring($png) ?: throw new RuntimeException('The stored slip is not an image.');
        imagealphablending($image, true);
        $c = $this->palette($image);
        [[$x1, $y1, $x2, $y2], [$dx1, $dy1, $dx2, $dy2]] = $this->clearStub($image);
        $this->text($image, 'DISAPPROVED', 18, $x1 + 24, $y1 + 44, $c['red'], true);
        foreach (array_slice($this->wrap($reason, 18, $x2 - $x1 - 48), 0, 3) as $i => $line) {
            $this->text($image, $line, 18, $x1 + 24, $y1 + 82 + $i * 28, $c['ink']);
        }
        $this->fit($image, "By {$by}", 16, $x1 + 24, $y2 - 14, $x2 - $x1 - 48, $c['muted'], true);
        $this->fit($image, $date, 24, $dx1 + 24, (int) (($dy1 + $dy2) / 2) + 10, $dx2 - $dx1 - 48, $c['ink'], true);
        $this->statusPill($image, 'disapproved', imagecolorat($image, self::STATUS_PILL[0] - 6, self::STATUS_PILL[1] + 20));

        return $this->png($image);
    }

    /**
     * Empties the two stub boxes and returns them.
     *
     * @return array{0: array{0: int, 1: int, 2: int, 3: int}, 1: array{0: int, 1: int, 2: int, 3: int}}
     */
    private function clearStub(GdImage $image): array
    {
        $c = $this->palette($image);
        $boxes = $this->stubBoxes(imagesy($image));
        foreach ($boxes as $box) {
            $this->roundedRect($image, ...[...$box, 16, $c['tile']]);
        }

        return $boxes;
    }

    /**
     * @return list<string>
     */
    private function wrap(string $text, int $size, int $room): array
    {
        $lines = [''];
        foreach (preg_split('/\s+/', trim($text)) ?: [] as $word) {
            $try = trim(end($lines).' '.$word);
            if ($this->width($try, $size) <= $room || end($lines) === '') {
                $lines[array_key_last($lines)] = $try;
            } else {
                $lines[] = $word;
            }
        }

        return $lines;
    }

    // The drawn signature cropped to its ink (pads come with lots of empty space); null if nothing was drawn.
    public function trimmed(string $png): ?GdImage
    {
        $source = @imagecreatefromstring($png);
        if (! $source) {
            return null;
        }
        [$w, $h] = [imagesx($source), imagesy($source)];
        [$minX, $minY, $maxX, $maxY] = [$w, $h, -1, -1];
        for ($y = 0; $y < $h; $y += 2) {
            for ($x = 0; $x < $w; $x += 2) {
                // Alpha 127 = fully transparent; anything less is ink.
                if (((imagecolorat($source, $x, $y) >> 24) & 0x7F) < 100) {
                    [$minX, $minY, $maxX, $maxY] = [min($minX, $x), min($minY, $y), max($maxX, $x), max($maxY, $y)];
                }
            }
        }
        if ($maxX < 0) {
            return null;
        }
        $crop = imagecrop($source, ['x' => max(0, $minX - 4), 'y' => max(0, $minY - 4), 'width' => min($w, $maxX - $minX + 10), 'height' => min($h, $maxY - $minY + 10)]);
        if ($crop) {
            imagesavealpha($crop, true);
        }

        return $crop ?: null;
    }

    /**
     * @return array{0: array{0: int, 1: int, 2: int, 3: int}, 1: array{0: int, 1: int, 2: int, 3: int}}
     */
    private function stubBoxes(int $height): array
    {
        $y1 = $height - self::STUB_BOX_TOP;
        $y2 = $height - self::STUB_BOX_BOTTOM;
        $x1 = self::MARGIN_X + self::PAD;
        $x2 = self::WIDTH - self::MARGIN_X - self::PAD;

        return [[$x1, $y1, $x1 + 626, $y2], [$x2 - 316, $y1, $x2, $y2]];
    }

    /**
     * @param  array<string, int>  $c
     * @param  list<array{0: string, 1: ?string}>  $fields
     * @param  array{0: int, 1: int}  $inner
     */
    private function section(GdImage $image, array $c, string $title, array $fields, int $y, array $inner): int
    {
        [$x1, $x2] = $inner;
        $column = (int) (($x2 - $x1 - 40) / 2);
        $heading = mb_strtoupper($title);

        $this->text($image, $heading, 15, $x1, $y + 4, $c['heading'], true);
        imageline($image, $x1 + $this->width($heading, 15, true) + 16, $y - 2, $x2, $y - 2, $c['rule']);
        $y += 44;

        foreach (array_chunk($fields, 2) as $row) {
            foreach ($row as $i => [$label, $value]) {
                $x = $x1 + $i * ($column + 40);
                $this->text($image, mb_strtoupper($label), 13, $x, $y, $c['muted'], true);
                $this->fit($image, $value ?: '—', 24, $x, $y + 40, $column, $value ? $c['ink'] : $c['faint']);
                imageline($image, $x, $y + 58, $x + $column, $y + 58, $c['rule']);
            }
            $y += 92;
        }

        return $y + 18;
    }

    private function statusPill(GdImage $image, string $state, int $band): void
    {
        $c = $this->palette($image);
        [$x1, $y1, $x2, $y2] = self::STATUS_PILL;
        [$label, $fg, $bg] = match ($state) {
            'received' => ['RECEIVED', $c['green'], $c['green_soft']],
            'disapproved' => ['DISAPPROVED', $c['red'], $c['red_soft']],
            default => ['AWAITING RECEIPT', $c['amber'], $c['amber_soft']],
        };
        // Repaint the band behind it first, so a stamp fully replaces the earlier pill.
        imagefilledrectangle($image, $x1 - 2, $y1 - 2, $x2 + 2, $y2 + 2, $band);
        $this->roundedRect($image, $x1, $y1, $x2, $y2, 25, $bg);
        $width = $this->width($label, 15, true);
        $this->text($image, $label, 15, (int) ($x1 + ($x2 - $x1 - $width) / 2), $y1 + 33, $fg, true);
    }

    private function roundedRect(GdImage $image, int $x1, int $y1, int $x2, int $y2, int $r, int $color): void
    {
        $r = min($r, (int) (($x2 - $x1) / 2), (int) (($y2 - $y1) / 2));
        imagefilledrectangle($image, $x1 + $r, $y1, $x2 - $r, $y2, $color);
        imagefilledrectangle($image, $x1, $y1 + $r, $x1 + $r, $y2 - $r, $color);
        imagefilledrectangle($image, $x2 - $r, $y1 + $r, $x2, $y2 - $r, $color);
        foreach ([[$x1 + $r, $y1 + $r], [$x2 - $r, $y1 + $r], [$x1 + $r, $y2 - $r], [$x2 - $r, $y2 - $r]] as [$cx, $cy]) {
            imagefilledellipse($image, $cx, $cy, $r * 2, $r * 2, $color);
        }
    }

    private function placeInside(GdImage $image, GdImage $picture, int $x, int $y, int $maxWidth, int $maxHeight): void
    {
        $scale = min($maxWidth / imagesx($picture), $maxHeight / imagesy($picture), 1.5);
        $width = (int) (imagesx($picture) * $scale);
        $height = (int) (imagesy($picture) * $scale);
        imagecopyresampled($image, $picture, $x, $y + (int) (($maxHeight - $height) / 2), 0, 0, $width, $height, imagesx($picture), imagesy($picture));
    }

    private function logo(GdImage $image, string $path, int $x, int $y, int $width): void
    {
        $logo = @imagecreatefrompng(resource_path($path));
        if (! $logo) {
            return;
        }
        $height = (int) round(imagesy($logo) * $width / imagesx($logo));
        imagecopyresampled($image, $logo, $x, $y, 0, 0, $width, $height, imagesx($logo), imagesy($logo));
    }

    // Shrinks long values to fit their space rather than running past it.
    private function fit(GdImage $image, string $text, int $size, int $x, int $y, int $room, int $color, bool $bold = false): void
    {
        while ($size > 12 && $this->width($text, $size, $bold) > $room) {
            $size--;
        }
        $this->text($image, $text, $size, $x, $y, $color, $bold);
    }

    private function textRight(GdImage $image, string $text, int $size, int $right, int $y, int $color, bool $bold = false): void
    {
        $this->text($image, $text, $size, $right - $this->width($text, $size, $bold), $y, $color, $bold);
    }

    private function text(GdImage $image, string $text, int $size, int $x, int $y, int $color, bool $bold = false): void
    {
        imagettftext($image, $size, 0, $x, $y, $color, $this->font($bold), $text);
    }

    private function width(string $text, int $size, bool $bold = false): int
    {
        $box = imagettfbbox($size, 0, $this->font($bold), $text);

        return (int) abs($box[2] - $box[0]);
    }

    private function font(bool $bold): string
    {
        return resource_path('fonts/Roboto-'.($bold ? 'Bold' : 'Regular').'.ttf');
    }

    /**
     * @param  array<string, mixed>|null  $layout  the brand colours (band, accent, heading) for a fresh slip
     * @return array<string, int>
     */
    private function palette(GdImage $image, ?array $layout = null): array
    {
        $colors = self::COLORS + ($layout ? array_intersect_key($layout, array_flip(['band', 'band_soft', 'accent', 'heading'])) : []);

        return array_map(function (string $hex) use ($image) {
            [$r, $g, $b] = sscanf($hex, '#%02x%02x%02x');

            return imagecolorallocate($image, $r, $g, $b);
        }, $colors);
    }

    private function png(GdImage $image): string
    {
        ob_start();
        imagepng($image, null, 6);

        return (string) ob_get_clean();
    }
}
