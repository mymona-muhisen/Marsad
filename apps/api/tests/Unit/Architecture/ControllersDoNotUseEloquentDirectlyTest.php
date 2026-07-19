<?php

namespace Tests\Unit\Architecture;

use PHPUnit\Framework\TestCase;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;

/**
 * CLAUDE.md rule #1: controllers are thin (FormRequest -> Service -> API
 * Resource); business logic and Eloquent access live in app/Services.
 */
class ControllersDoNotUseEloquentDirectlyTest extends TestCase
{
    public function test_controllers_never_import_app_models_or_the_eloquent_base_class(): void
    {
        $controllersPath = dirname(__DIR__, 3).'/app/Http/Controllers';

        $this->assertDirectoryExists($controllersPath);

        $violations = [];
        $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($controllersPath));

        foreach ($files as $file) {
            if (! $file->isFile() || $file->getExtension() !== 'php') {
                continue;
            }

            $source = file_get_contents($file->getPathname());

            if (preg_match('/^use App\\\\Models\\\\/m', $source)
                || str_contains($source, 'Illuminate\\Database\\Eloquent')
                || preg_match('/extends\s+Model\b/', $source)) {
                $violations[] = $file->getPathname();
            }
        }

        $this->assertEmpty(
            $violations,
            "Controllers must not touch Eloquent directly — put that logic in app/Services instead:\n"
            .implode("\n", $violations),
        );
    }
}
