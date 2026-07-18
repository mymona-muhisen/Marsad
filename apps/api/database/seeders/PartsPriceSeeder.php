<?php

namespace Database\Seeders;

use App\Models\PartsPrice;
use Illuminate\Database\Seeder;

/**
 * v1 reference price list (FR-CL3) — ~30 common repair parts, SYP.
 * Inflation-aware: new versions are added as new rows (see doc 04 G10 /
 * the liability_rules versioning pattern), never updated in place.
 */
class PartsPriceSeeder extends Seeder
{
    public function run(): void
    {
        $parts = [
            ['part_code' => 'FRONT_BUMPER', 'name_ar' => 'مصد أمامي', 'reference_price' => 850000],
            ['part_code' => 'REAR_BUMPER', 'name_ar' => 'مصد خلفي', 'reference_price' => 800000],
            ['part_code' => 'FRONT_WINDSHIELD', 'name_ar' => 'زجاج أمامي', 'reference_price' => 1200000],
            ['part_code' => 'REAR_WINDSHIELD', 'name_ar' => 'زجاج خلفي', 'reference_price' => 900000],
            ['part_code' => 'SIDE_MIRROR_L', 'name_ar' => 'مرآة جانبية يسار', 'reference_price' => 250000],
            ['part_code' => 'SIDE_MIRROR_R', 'name_ar' => 'مرآة جانبية يمين', 'reference_price' => 250000],
            ['part_code' => 'HEADLIGHT_L', 'name_ar' => 'كشاف أمامي يسار', 'reference_price' => 600000],
            ['part_code' => 'HEADLIGHT_R', 'name_ar' => 'كشاف أمامي يمين', 'reference_price' => 600000],
            ['part_code' => 'TAILLIGHT_L', 'name_ar' => 'كشاف خلفي يسار', 'reference_price' => 350000],
            ['part_code' => 'TAILLIGHT_R', 'name_ar' => 'كشاف خلفي يمين', 'reference_price' => 350000],
            ['part_code' => 'HOOD', 'name_ar' => 'غطاء المحرك', 'reference_price' => 1100000],
            ['part_code' => 'TRUNK_LID', 'name_ar' => 'غطاء الصندوق', 'reference_price' => 950000],
            ['part_code' => 'FRONT_DOOR_L', 'name_ar' => 'باب أمامي يسار', 'reference_price' => 1400000],
            ['part_code' => 'FRONT_DOOR_R', 'name_ar' => 'باب أمامي يمين', 'reference_price' => 1400000],
            ['part_code' => 'REAR_DOOR_L', 'name_ar' => 'باب خلفي يسار', 'reference_price' => 1300000],
            ['part_code' => 'REAR_DOOR_R', 'name_ar' => 'باب خلفي يمين', 'reference_price' => 1300000],
            ['part_code' => 'FENDER_FRONT_L', 'name_ar' => 'رفرف أمامي يسار', 'reference_price' => 700000],
            ['part_code' => 'FENDER_FRONT_R', 'name_ar' => 'رفرف أمامي يمين', 'reference_price' => 700000],
            ['part_code' => 'FENDER_REAR_L', 'name_ar' => 'رفرف خلفي يسار', 'reference_price' => 650000],
            ['part_code' => 'FENDER_REAR_R', 'name_ar' => 'رفرف خلفي يمين', 'reference_price' => 650000],
            ['part_code' => 'RADIATOR', 'name_ar' => 'المشع (الرادياتير)', 'reference_price' => 900000],
            ['part_code' => 'FRONT_AXLE', 'name_ar' => 'محور أمامي', 'reference_price' => 1500000],
            ['part_code' => 'SHOCK_ABSORBER_F', 'name_ar' => 'ممتص صدمات أمامي', 'reference_price' => 400000],
            ['part_code' => 'SHOCK_ABSORBER_R', 'name_ar' => 'ممتص صدمات خلفي', 'reference_price' => 400000],
            ['part_code' => 'WHEEL_RIM', 'name_ar' => 'جنط عجلة', 'reference_price' => 550000],
            ['part_code' => 'TIRE', 'name_ar' => 'إطار عجلة', 'reference_price' => 450000],
            ['part_code' => 'EXHAUST_SYSTEM', 'name_ar' => 'نظام العادم', 'reference_price' => 800000],
            ['part_code' => 'SIDE_PANEL_L', 'name_ar' => 'جانب هيكل يسار', 'reference_price' => 1600000],
            ['part_code' => 'SIDE_PANEL_R', 'name_ar' => 'جانب هيكل يمين', 'reference_price' => 1600000],
            ['part_code' => 'GRILLE', 'name_ar' => 'شبك المبرد الأمامي', 'reference_price' => 300000],
        ];

        foreach ($parts as $part) {
            PartsPrice::firstOrCreate(
                ['part_code' => $part['part_code'], 'version' => 1],
                [
                    'name_ar' => $part['name_ar'],
                    'reference_price' => $part['reference_price'],
                    'effective_from' => now()->subYear()->toDateString(),
                ],
            );
        }
    }
}
