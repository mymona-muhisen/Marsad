<?php

namespace Database\Factories;

use App\Enums\NotificationChannel;
use App\Models\Notification;
use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

/**
 * @extends Factory<Notification>
 */
class NotificationFactory extends Factory
{
    /**
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'user_id' => User::factory(),
            'channel' => NotificationChannel::Sms->value,
            'template' => 'generic',
            'payload' => [],
            'sent_at' => now(),
            'read_at' => null,
        ];
    }
}
