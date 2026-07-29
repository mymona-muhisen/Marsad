<?php

namespace Database\Seeders;

use App\Enums\OrganizationType;
use App\Enums\RoleName;
use App\Models\Organization;
use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * Dev-only fixed sign-ins, one per role.
 *
 * Without these, trying the platform as anyone but a citizen means assigning
 * roles by hand in tinker after every fresh migration — the first user to
 * register gets `citizen` and nothing else, and the admin console that would
 * hand out roles is itself unbuilt.
 *
 * These are not credentials: sign-in is still phone + OTP, and the code is
 * random and only reachable from the log (or a real SMS in production, where
 * this seeder never runs). What the fixed phone buys you is a known account
 * that already holds a role and an organization.
 */
class DemoUserSeeder extends Seeder
{
    /**
     * Phone => [role, display name, organization type or null].
     *
     * Numbers are sequential on purpose: easy to read off a slide, and
     * impossible to confuse with a real Syrian mobile number.
     */
    public const ACCOUNTS = [
        '0900000001' => [RoleName::Citizen, 'مواطن تجريبي', null],
        '0900000002' => [RoleName::Surveyor, 'خبير ميداني تجريبي', null],
        '0900000003' => [RoleName::Adjudicator, 'مراجع مسؤولية تجريبي', null],
        '0900000004' => [RoleName::SeniorAdjudicator, 'عضو لجنة اعتراضات تجريبي', null],
        '0900000005' => [RoleName::InsurerAgent, 'موظف شركة تأمين تجريبي', OrganizationType::Insurer],
        '0900000006' => [RoleName::InsurerAdmin, 'مدير شركة تأمين تجريبي', OrganizationType::Insurer],
        '0900000007' => [RoleName::Assessor, 'خبير تقدير أضرار تجريبي', OrganizationType::AssessorOffice],
        '0900000008' => [RoleName::Workshop, 'ورشة إصلاح تجريبية', OrganizationType::Workshop],
        '0900000009' => [RoleName::Regulator, 'مراقب هيئة الإشراف تجريبي', OrganizationType::Regulator],
        '0900000010' => [RoleName::Authority, 'موظف مديرية المرور تجريبي', OrganizationType::Authority],
        '0900000011' => [RoleName::CallCenter, 'موظف مركز اتصال تجريبي', null],
        '0900000012' => [RoleName::Admin, 'مدير المنصة تجريبي', null],
        '0900000013' => [RoleName::SuperAdmin, 'مالك تقني تجريبي', null],
    ];

    /** The demo citizen owns the demo cases and claims — see DemoSeeder. */
    public const CITIZEN_PHONE = '0900000001';

    public const SURVEYOR_PHONE = '0900000002';

    public const ADJUDICATOR_PHONE = '0900000003';

    public function run(): void
    {
        foreach (self::ACCOUNTS as $phone => [$role, $name, $organizationType]) {
            $user = User::firstOrCreate(
                ['phone' => $phone],
                [
                    'full_name' => $name,
                    // Never used: the OTP flow is the only way in. A random
                    // hash keeps the column non-null without creating a
                    // password anyone could guess.
                    'password' => Hash::make(Str::random(40)),
                    'phone_verified_at' => now(),
                    'locale' => 'ar',
                    'status' => 'active',
                ],
            );

            $organizationId = $organizationType
                ? Organization::query()->where('type', $organizationType->value)->value('id')
                : null;

            $user->forceFill([
                'organization_id' => $organizationId,
                // Zone-scoped dispatch needs the surveyor to sit in a zone that
                // actually matches a case region (config/zones.php).
                'zone' => $role === RoleName::Surveyor ? config('zones.zones')[0] : null,
            ])->save();

            // Re-running must not stack duplicate role rows, and a role removed
            // by hand should come back on the next seed.
            $user->syncRoles([$role->value]);
        }

        $this->publishTable();
    }

    /**
     * Laravel's own Seeder guards this property with `isset` rather than a null
     * check — it is unset, not null, when a seeder is instantiated directly
     * instead of run through `db:seed`.
     */
    private function publishTable(): void
    {
        if (! isset($this->command)) {
            return;
        }

        $this->command->newLine();
        $this->command->info('Demo sign-ins (phone + OTP; the code is printed in storage/logs/laravel.log):');
        $this->command->table(
            ['Phone', 'Role', 'Name'],
            collect(self::ACCOUNTS)
                ->map(fn (array $account, string $phone) => [$phone, $account[0]->value, $account[1]])
                ->values()
                ->all(),
        );
    }
}
