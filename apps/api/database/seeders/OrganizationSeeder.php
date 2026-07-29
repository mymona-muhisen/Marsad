<?php

namespace Database\Seeders;

use App\Enums\OrganizationType;
use App\Models\Organization;
use Illuminate\Database\Seeder;

class OrganizationSeeder extends Seeder
{
    /**
     * Seed the pilot organizations: 2 insurers, 1 regulator, 1 authority,
     * 2 workshops, 1 assessor office.
     */
    public function run(): void
    {
        $organizations = [
            ['name_ar' => 'الشركة السورية للتأمين', 'name_en' => 'Syrian Insurance Company', 'type' => OrganizationType::Insurer, 'license_no' => 'INS-001'],
            ['name_ar' => 'شركة العقيلة للتأمين', 'name_en' => 'Al-Aqeelah Insurance', 'type' => OrganizationType::Insurer, 'license_no' => 'INS-002'],
            ['name_ar' => 'الهيئة السورية للإشراف على التأمين', 'name_en' => 'Syrian Insurance Supervisory Commission', 'type' => OrganizationType::Regulator, 'license_no' => 'REG-001'],
            ['name_ar' => 'مديرية المرور العامة', 'name_en' => 'Traffic Directorate', 'type' => OrganizationType::Authority, 'license_no' => 'AUTH-001'],
            ['name_ar' => 'ورشة دمشق لتصليح المركبات', 'name_en' => 'Damascus Auto Repair Workshop', 'type' => OrganizationType::Workshop, 'license_no' => 'WS-001'],
            ['name_ar' => 'ورشة الشام للسيارات', 'name_en' => 'Al-Sham Auto Workshop', 'type' => OrganizationType::Workshop, 'license_no' => 'WS-002'],
            // The `assessor` role is organization-scoped (doc 01 §B.4) but no
            // assessor office was ever seeded, so an assessor user had nothing
            // to belong to.
            ['name_ar' => 'مكتب الخبرة الفنية للمركبات', 'name_en' => 'Vehicle Technical Assessment Office', 'type' => OrganizationType::AssessorOffice, 'license_no' => 'ASM-001'],
        ];

        foreach ($organizations as $organization) {
            Organization::firstOrCreate(
                ['type' => $organization['type']->value, 'license_no' => $organization['license_no']],
                [
                    'name_ar' => $organization['name_ar'],
                    'name_en' => $organization['name_en'],
                    'status' => 'active',
                ],
            );
        }
    }
}
