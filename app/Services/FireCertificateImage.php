<?php

namespace App\Services;

use GdImage;
use Illuminate\Support\Carbon;
use RuntimeException;

// An agent's certificate, drawn on its template (resources/certificates): a FIRE module's Certificate of Completion (the
// course title is part of each module's template) or Rent.ph's Rent Manager Certificate of Accreditation. Text is placed by
// proportion of the template, so a re-exported template of another size still lines up.
class FireCertificateImage
{
    // Module id => template file. Modules without one have no certificate yet (their templates are still to come).
    public const TEMPLATES = [
        1 => 'fire-1-resa-law.jpg',
        2 => 'fire-2-documentation-titling.jpg',
        3 => 'fire-3-code-of-ethics.jpg',
        FireTrainingService::RENT_MODULE => 'rent-manager.jpg',
    ];

    public static function has(int $module): bool
    {
        return isset(self::TEMPLATES[$module]);
    }

    // FIRE: the name between "This is to certify that" and "has successfully completed the course", and the date after "Given this".
    public function fire(int $module, string $name, ?Carbon $givenOn): string
    {
        $image = $this->template($module);
        [$w, $h] = [imagesx($image), imagesy($image)];
        $navy = imagecolorallocate($image, 0x13, 0x2c, 0x4b);
        $ink = imagecolorallocate($image, 0x22, 0x22, 0x22);

        $this->centered($image, $name, $w * 0.5, $h * 0.522, $w * 0.62, $w * 0.031, $navy, 'LibreBaskerville-Bold');
        if ($givenOn) {
            $this->text($image, $givenOn->format('jS').' day of '.$givenOn->format('F Y'), $w * 0.4725, $h * 0.6715, $w * 0.0158, $ink, 'Roboto-Regular');
        }

        return $this->jpeg($image);
    }

    // Rent Manager: the name above the line, then date issued, valid until and the certificate number on their lines.
    public function rentManager(string $name, Carbon $issuedOn, Carbon $validUntil, string $number): string
    {
        $image = $this->template(FireTrainingService::RENT_MODULE);
        [$w, $h] = [imagesx($image), imagesy($image)];
        $brown = imagecolorallocate($image, 0x5c, 0x4a, 0x30);

        $this->centered($image, $name, $w * 0.5, $h * 0.508, $w * 0.5, $w * 0.029, $brown, 'LibreBaskerville-Bold');
        $size = $w * 0.0102;
        $this->text($image, $issuedOn->format('F j, Y'), $w * 0.205, $h * 0.8255, $size, $brown, 'Roboto-Bold');
        $this->text($image, $validUntil->format('F j, Y'), $w * 0.205, $h * 0.8485, $size, $brown, 'Roboto-Bold');
        $this->text($image, $number, $w * 0.231, $h * 0.8715, $size, $brown, 'Roboto-Bold');

        return $this->jpeg($image);
    }

    private function template(int $module): GdImage
    {
        $file = self::TEMPLATES[$module] ?? null;
        $image = $file ? @imagecreatefromjpeg(resource_path("certificates/{$file}")) : false;
        if (! $image instanceof GdImage) {
            throw new RuntimeException("No certificate template for module {$module}.");
        }

        return $image;
    }

    // Centred on x at baseline y, shrunk to fit maxWidth (long names).
    private function centered(GdImage $image, string $text, float $x, float $y, float $maxWidth, float $size, int $color, string $font): void
    {
        $path = $this->font($font);
        $width = fn (float $s) => ($box = imagettfbbox($s, 0, $path, $text)) ? $box[2] - $box[0] : 0;
        while ($size > 10 && $width($size) > $maxWidth) {
            $size -= 1;
        }
        imagettftext($image, $size, 0, (int) round($x - $width($size) / 2), (int) round($y), $color, $path, $text);
    }

    private function text(GdImage $image, string $text, float $x, float $y, float $size, int $color, string $font): void
    {
        imagettftext($image, $size, 0, (int) round($x), (int) round($y), $color, $this->font($font), $text);
    }

    private function font(string $name): string
    {
        return resource_path("fonts/{$name}.ttf");
    }

    private function jpeg(GdImage $image): string
    {
        ob_start();
        imagejpeg($image, null, 92);

        return (string) ob_get_clean();
    }
}
