<?php

namespace App\Support;

/**
 * Builds a `column IN (...)` fragment from a PHP backed enum, so every
 * migration's CHECK constraint (CLAUDE.md rule #6 — VARCHAR + CHECK, never
 * MySQL ENUM) reads its allowed values from the same enum the app code uses.
 *
 * @param  class-string<\BackedEnum>  $enumClass
 */
class EnumCheck
{
    public static function in(string $column, string $enumClass): string
    {
        $values = array_map(
            fn (\BackedEnum $case) => "'{$case->value}'",
            $enumClass::cases(),
        );

        return "{$column} IN (".implode(', ', $values).')';
    }
}
