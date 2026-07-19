<?php

namespace App\Services\Cases;

use App\Enums\EvidenceType;
use App\Models\AccidentCase;
use App\Models\CaseParty;
use App\Models\EvidenceItem;
use App\Models\FraudFlag;
use App\Models\User;
use Illuminate\Http\UploadedFile;

/**
 * Evidence is append-only (CLAUDE.md rule #3): corrections happen via a new
 * row + `superseded_by` on the old one, never update/delete.
 */
class EvidenceService
{
    /**
     * @param  list<UploadedFile>  $files
     * @return list<EvidenceItem>
     */
    public function storePhotos(
        AccidentCase $case,
        ?CaseParty $party,
        User $uploader,
        array $files,
        ?float $lat,
        ?float $lng,
    ): array {
        return array_map(
            fn (UploadedFile $file) => $this->storeOne($case, $party, $uploader, EvidenceType::Photo, $file, $lat, $lng),
            $files,
        );
    }

    public function storeOne(
        AccidentCase $case,
        ?CaseParty $party,
        User $uploader,
        EvidenceType $type,
        UploadedFile $file,
        ?float $lat,
        ?float $lng,
    ): EvidenceItem {
        $hash = hash_file('sha256', $file->getRealPath());
        $path = $file->store('evidence', 'public');

        $evidence = EvidenceItem::create([
            'case_id' => $case->id,
            'party_id' => $party?->id,
            'uploaded_by' => $uploader->id,
            'type' => $type,
            'file_path' => $path,
            'sha256' => $hash,
            'lat' => $lat,
            'lng' => $lng,
            'captured_at' => now(),
        ]);

        $this->flagIfDuplicate($case, $evidence);

        return $evidence;
    }

    public function supersede(EvidenceItem $original, User $uploader, UploadedFile $file): EvidenceItem
    {
        $replacement = $this->storeOne(
            $original->case,
            $original->party,
            $uploader,
            $original->type,
            $file,
            $original->lat !== null ? (float) $original->lat : null,
            $original->lng !== null ? (float) $original->lng : null,
        );

        $original->forceFill(['superseded_by' => $replacement->id])->save();

        return $replacement;
    }

    private function flagIfDuplicate(AccidentCase $case, EvidenceItem $evidence): void
    {
        $match = EvidenceItem::query()
            ->where('sha256', $evidence->sha256)
            ->where('case_id', '!=', $case->id)
            ->where('id', '!=', $evidence->id)
            ->first();

        if (! $match) {
            return;
        }

        FraudFlag::create([
            'case_id' => $case->id,
            'evidence_item_id' => $evidence->id,
            'matched_evidence_item_id' => $match->id,
            'reason' => 'duplicate_photo_hash',
        ]);
    }
}
