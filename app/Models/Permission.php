<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Permission extends Model
{
    protected $fillable = ['name', 'label'];

    // Section headings on Settings › Roles & permissions, in display order; anything unlisted falls under "Other".
    public const SECTIONS = [
        'Dashboard & sales' => ['view_dashboard', 'record_sales', 'record_international_sales', 'sales_validation', 'view_leaderboards'],
        'Reports' => ['view_reports', 'create_report'],
        'Statistics' => ['view_statistics', 'view_global_partner_statistics'],
        'Documentation' => ['manage_documents'],
        'Users & settings' => ['view_profile', 'search_user', 'edit_user', 'edit_settings', 'use_preferences'],
    ];

    public const OTHER_SECTION = 'Other';

    // Every report_* permission (one per report card) belongs to Reports.
    public static function sectionOf(string $name): string
    {
        if (str_starts_with($name, 'report_')) {
            return 'Reports';
        }

        foreach (self::SECTIONS as $section => $names) {
            if (in_array($name, $names, true)) {
                return $section;
            }
        }

        return self::OTHER_SECTION;
    }

    public function roles()
    {
        return $this->belongsToMany(Role::class);
    }
}
