<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
    <meta charset="UTF-8">
    <title>تقرير حادث {{ $case->case_no }}</title>
    <style>
        body { font-family: sans-serif; direction: rtl; text-align: right; font-size: 12px; }
        h1 { font-size: 18px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th, td { border: 1px solid #999; padding: 6px; text-align: right; }
        .muted { color: #555; font-size: 10px; }
    </style>
</head>
<body>
    <h1>تقرير حادث مروري</h1>
    <p>رقم الملف: {{ $case->case_no }}</p>
    <p>تاريخ الحادث: {{ $case->occurred_at->format('Y-m-d H:i') }}</p>
    <p>المنطقة: {{ $case->region }}</p>

    <h2>القرار</h2>
    <p>السيناريو: {{ $decision->rule?->scenario_code ?? 'MANUAL' }}</p>
    <p>وصف القاعدة: {{ $decision->rule?->description_ar ?? 'تحديد يدوي من قبل المحكِّم' }}</p>
    @if ($decision->was_overridden)
        <p>تم التعديل على الاقتراح. المبرر: {{ $decision->justification }}</p>
    @endif

    <h2>توزيع المسؤولية</h2>
    <table>
        <thead>
            <tr>
                <th>الطرف</th>
                <th>النسبة</th>
            </tr>
        </thead>
        <tbody>
            @foreach ($decision->allocations as $allocation)
                <tr>
                    <td>{{ $allocation->party->role->value }}</td>
                    <td>{{ $allocation->percentage }}%</td>
                </tr>
            @endforeach
        </tbody>
    </table>

    <p class="muted">تم إصدار هذا التقرير آلياً عبر منصة مرصد. يمكن التحقق من صحته عبر مسح رمز QR.</p>
</body>
</html>
