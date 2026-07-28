<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Written street location for the many reports that arrive without a GPS fix.
 *
 * `lat`/`lng` stay NOT NULL — the heatmap and black-spot analytics depend on
 * every case having coordinates — but coordinates derived from a governorate
 * choice are city-scale and useless to a dispatched surveyor on their own.
 * This column carries what a human actually needs ("أوتوستراد المزة، مقابل
 * مشفى الشامي"), and the service layer requires it whenever
 * `location_verified` is false.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('accident_cases', function (Blueprint $table) {
            $table->string('location_description', 255)->nullable()->after('location_verified');
        });
    }

    public function down(): void
    {
        Schema::table('accident_cases', function (Blueprint $table) {
            $table->dropColumn('location_description');
        });
    }
};
