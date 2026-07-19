<?php

namespace Tests\Unit\Architecture;

use PHPUnit\Framework\TestCase;
use RecursiveDirectoryIterator;
use RecursiveIteratorIterator;

/**
 * CLAUDE.md rule #1: controllers are thin (FormRequest -> Service -> API
 * Resource); business logic and Eloquent queries live in app/Services.
 *
 * Type-hinting a Model for route-model binding (e.g. `Vehicle $vehicle`) is
 * expected and allowed — this only flags controllers that actually *query*
 * or *mutate* via a Model's static Eloquent methods or the DB facade.
 */
class ControllersDoNotUseEloquentDirectlyTest extends TestCase
{
    private const ELOQUENT_METHODS = [
        'where', 'create', 'find', 'findOrFail', 'query', 'firstOrCreate',
        'updateOrCreate', 'onlyTrashed', 'withTrashed', 'paginate', 'all', 'first',
    ];

    private const DB_FACADE_METHODS = ['table', 'select', 'statement', 'insert', 'update', 'delete'];

    public function test_controllers_never_query_or_mutate_via_eloquent_or_the_db_facade_directly(): void
    {
        $controllersPath = dirname(__DIR__, 3).'/app/Http/Controllers';
        $modelsPath = dirname(__DIR__, 3).'/app/Models';

        $this->assertDirectoryExists($controllersPath);
        $this->assertDirectoryExists($modelsPath);

        $modelNames = array_map(
            fn (string $file) => basename($file, '.php'),
            glob($modelsPath.'/*.php') ?: [],
        );

        $this->assertNotEmpty($modelNames);

        $violations = [];
        $files = new RecursiveIteratorIterator(new RecursiveDirectoryIterator($controllersPath));

        $eloquentPattern = '/\b('.implode('|', $modelNames).')::('.implode('|', self::ELOQUENT_METHODS).')\s*\(/';
        $dbFacadePattern = '/\bDB::('.implode('|', self::DB_FACADE_METHODS).')\s*\(/';

        foreach ($files as $file) {
            if (! $file->isFile() || $file->getExtension() !== 'php') {
                continue;
            }

            $source = file_get_contents($file->getPathname());

            if (preg_match($eloquentPattern, $source) || preg_match($dbFacadePattern, $source) || preg_match('/extends\s+Model\b/', $source)) {
                $violations[] = $file->getPathname();
            }
        }

        $this->assertEmpty(
            $violations,
            "Controllers must not query/mutate via Eloquent or DB directly — put that logic in app/Services instead:\n"
            .implode("\n", $violations),
        );
    }
}
