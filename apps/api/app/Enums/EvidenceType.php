<?php

namespace App\Enums;

enum EvidenceType: string
{
    case Photo = 'photo';
    case Voice = 'voice';
    case Sketch = 'sketch';
    case Document = 'document';
}
