<?php

namespace App\Contracts;

interface SmsGateway
{
    /**
     * Send an SMS message to the given Syrian phone number.
     */
    public function send(string $phone, string $message): void;
}
