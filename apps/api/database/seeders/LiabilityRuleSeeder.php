<?php

namespace Database\Seeders;

use App\Models\LiabilityRule;
use Illuminate\Database\Seeder;

/**
 * v1 scenario matrix (FR-F1). "MANUAL" is deliberately NOT a row here —
 * doc 04 §2.4 has fault_decisions.rule_id nullable specifically for the
 * manual case, so it's represented by rule_id = null, not a seeded rule.
 */
class LiabilityRuleSeeder extends Seeder
{
    public function run(): void
    {
        $scenarios = [
            [
                'scenario_code' => 'REAR_END',
                'description_ar' => 'اصطدام خلفي: السائق الذي صدم المركبة من الخلف يتحمل كامل المسؤولية لعدم ترك مسافة أمان كافية.',
                'fault_split_a' => 100,
                'fault_split_b' => 0,
            ],
            [
                'scenario_code' => 'PRIORITY_VIOLATION',
                'description_ar' => 'مخالفة الأولوية: عدم إعطاء الأولوية للمركبة القادمة من الاتجاه ذي الحق بالمرور.',
                'fault_split_a' => 100,
                'fault_split_b' => 0,
            ],
            [
                'scenario_code' => 'LANE_CHANGE',
                'description_ar' => 'تغيير مسار خاطئ: الانتقال إلى مسار آخر دون التأكد من خلوه، ما تسبب بالاصطدام.',
                'fault_split_a' => 100,
                'fault_split_b' => 0,
            ],
            [
                'scenario_code' => 'REVERSING',
                'description_ar' => 'الرجوع للخلف: السائق الذي كان يقود للخلف دون انتباه كافٍ يتحمل المسؤولية الكاملة.',
                'fault_split_a' => 100,
                'fault_split_b' => 0,
            ],
            [
                'scenario_code' => 'RED_LIGHT',
                'description_ar' => 'تجاوز الإشارة الضوئية الحمراء: عبور التقاطع أثناء الإشارة الحمراء.',
                'fault_split_a' => 100,
                'fault_split_b' => 0,
            ],
            [
                'scenario_code' => 'PARKED_HIT',
                'description_ar' => 'اصطدام بمركبة متوقفة: المركبة المتوقفة بشكل قانوني لا تتحمل أي مسؤولية.',
                'fault_split_a' => 100,
                'fault_split_b' => 0,
            ],
            [
                'scenario_code' => 'OPENING_DOOR',
                'description_ar' => 'فتح باب المركبة دون انتباه لحركة المرور، ما تسبب بإصابة مركبة أو دراجة عابرة.',
                'fault_split_a' => 100,
                'fault_split_b' => 0,
            ],
            [
                'scenario_code' => 'ROUNDABOUT',
                'description_ar' => 'حادث ضمن دوار مروري: المركبة الداخلة تتحمل الجزء الأكبر من المسؤولية لعدم إعطاء الأولوية للمركبة الموجودة داخل الدوار.',
                'fault_split_a' => 75,
                'fault_split_b' => 25,
            ],
            [
                'scenario_code' => 'OVERTAKING',
                'description_ar' => 'تجاوز خاطئ: تجاوز مركبة أخرى في مكان أو ظرف غير آمن.',
                'fault_split_a' => 100,
                'fault_split_b' => 0,
            ],
            [
                'scenario_code' => 'MERGING',
                'description_ar' => 'دمج مسارات: عدم التنسيق عند التقاء مسارين، وتقاسم المسؤولية بين الطرفين.',
                'fault_split_a' => 75,
                'fault_split_b' => 25,
            ],
        ];

        foreach ($scenarios as $scenario) {
            LiabilityRule::firstOrCreate(
                ['scenario_code' => $scenario['scenario_code'], 'version' => 1],
                [
                    'description_ar' => $scenario['description_ar'],
                    'fault_split_a' => $scenario['fault_split_a'],
                    'fault_split_b' => $scenario['fault_split_b'],
                    'effective_from' => now()->subYear()->toDateString(),
                    'effective_to' => null,
                ],
            );
        }
    }
}
