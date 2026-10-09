<?php

namespace Database\Seeders;

use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use App\Models\Entities\ProjectPropertyType;

class ProjectPropertyTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $categories = array(
        array('id' => '1','orderby' => '0','parentid' => '0','catname' => 'Condominiums','color' => '#5FBED7'),
        array('id' => '3','orderby' => '0','parentid' => '0','catname' => 'Commercial','color' => '#54626F'),
        array('id' => '4','orderby' => '0','parentid' => '0','catname' => 'Industrial','color' => '#6ADA8E'),
        array('id' => '8','orderby' => '10','parentid' => '0','catname' => 'Apartment','color' => '#702670'),
        array('id' => '9','orderby' => '0','parentid' => '0','catname' => 'Beach House','color' => '#D65282'),
        array('id' => '10','orderby' => '0','parentid' => '0','catname' => 'House & Lot','color' => '#4F42B5'),
        array('id' => '11','orderby' => '0','parentid' => '0','catname' => 'Townhouse','color' => '#7B4259'),
        array('id' => '14','orderby' => '0','parentid' => '0','catname' => 'Lot Only','color' => '#F1CC79'),
        array('id' => '15','orderby' => '0','parentid' => '0','catname' => 'Farm Land','color' => '#01ae01'),
        array('id' => '16','orderby' => '0','parentid' => '0','catname' => 'Warehouse','color' => '#5FBED7'),
        array('id' => '17','orderby' => '0','parentid' => '0','catname' => 'Colombary','color' => '#F1CC79'),
        array('id' => '18','orderby' => '0','parentid' => '0','catname' => 'Dormitory','color' => '#F1CC79'),
        array('id' => '19','orderby' => '0','parentid' => '0','catname' => 'Office Space','color' => '#54626F'),
        array('id' => '20','orderby' => '0','parentid' => '0','catname' => 'Parking','color' => '#5FBED7')
        );

        foreach($categories as $cat)
        {
            ProjectPropertyType::create([
                'id' => $cat['id'],
                'name' => $cat['catname'],
                'status' => 'active'
            ]);
        }
    }
}
