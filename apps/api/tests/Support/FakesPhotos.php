<?php

namespace Tests\Support;

use Illuminate\Http\UploadedFile;

/**
 * `UploadedFile::fake()->create()` always writes an empty temp file (its
 * $kilobytes only fakes the reported size for validation) and `->image()`
 * requires the GD extension, which isn't installed in this environment.
 * `mimes:jpg` validates by sniffing real file content, so both are useless
 * here — this writes a real, minimal, valid JPEG instead.
 */
trait FakesPhotos
{
    /**
     * A minimal valid 1x1 JPEG (real SOI/EOI structure), base64-encoded.
     */
    private const MINIMAL_JPEG_BASE64 = '/9j/4AAQSkZJRgABAQAAAQABAAD/2wBDAAMCAgICAgMCAgIDAwMDBAYEBAQEBAgGBgUGCQgKCgkICQkKDA8MCgsOCwkJDRENDg8QEBEQCgwSExIQEw8QEBD/2wBDAQMDAwQDBAgEBAgQCwkLEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBD/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAj/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCdABmX/9k=';

    /**
     * Trailing bytes after a JPEG's EOI marker don't affect MIME sniffing
     * (finfo only inspects the header), so appending random bytes gives
     * each photo a distinct SHA-256 while staying a validly-typed upload.
     * Pass a fixed $suffix to make two calls hash identically on purpose.
     */
    private function fakePhoto(string $name, ?string $suffix = null): UploadedFile
    {
        $path = tempnam(sys_get_temp_dir(), 'evidence');
        file_put_contents($path, base64_decode(self::MINIMAL_JPEG_BASE64).($suffix ?? random_bytes(16)));

        return new UploadedFile($path, $name, 'image/jpeg', null, true);
    }

    /**
     * @return list<UploadedFile>
     */
    private function fourPhotos(string $prefix = 'p'): array
    {
        return [
            $this->fakePhoto("{$prefix}1.jpg"),
            $this->fakePhoto("{$prefix}2.jpg"),
            $this->fakePhoto("{$prefix}3.jpg"),
            $this->fakePhoto("{$prefix}4.jpg"),
        ];
    }
}
