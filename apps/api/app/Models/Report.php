<?php

namespace App\Models;

use App\Enums\ReportStatus;
use Database\Factories\ReportFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Support\Carbon;

/**
 * @property ReportStatus $status
 * @property Carbon $issued_at
 */
class Report extends Model
{
    /** @use HasFactory<ReportFactory> */
    use HasFactory;

    protected $fillable = [
        'case_id',
        'report_no',
        'pdf_path',
        'qr_token',
        'signed_hash',
        'status',
        'superseded_by',
        'issued_at',
    ];

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'status' => ReportStatus::class,
            'issued_at' => 'datetime',
        ];
    }

    /**
     * @return BelongsTo<AccidentCase, $this>
     */
    public function case(): BelongsTo
    {
        return $this->belongsTo(AccidentCase::class, 'case_id');
    }

    /**
     * @return BelongsTo<Report, $this>
     */
    public function supersededByReport(): BelongsTo
    {
        return $this->belongsTo(Report::class, 'superseded_by');
    }
}
