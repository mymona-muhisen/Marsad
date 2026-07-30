<?php

namespace Tests\Doubles;

use App\Contracts\SmsGateway;

class FakeSmsGateway implements SmsGateway
{
    /** @var array<int, array{phone: string, message: string}> */
    public array $sent = [];

    public function send(string $phone, string $message): void
    {
        $this->sent[] = ['phone' => $phone, 'message' => $message];
    }

    /** The whole message body, for assertions about links rather than codes. */
    public function lastMessage(): ?string
    {
        $last = end($this->sent);

        return $last === false ? null : $last['message'];
    }

    public function lastCode(): ?string
    {
        $last = end($this->sent);

        if ($last === false) {
            return null;
        }

        preg_match('/(\d{6})$/', $last['message'], $matches);

        return $matches[1] ?? null;
    }
}
