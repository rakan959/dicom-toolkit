Test assets (optional)

You can place real DICOM Part-10 sample files here to exercise the compressed decode path end-to-end during tests.

Expected filenames (feel free to use your own names, but update tests accordingly):

- compressed/rle_mono16_small.dcm (Transfer Syntax: 1.2.840.10008.1.2.5)
- compressed/jpegls_mono8_small.dcm (Transfer Syntax: 1.2.840.10008.1.2.4.80 or .81)
- compressed/j2k_rgb8_small.dcm (Transfer Syntax: 1.2.840.10008.1.2.4.90 or .91)

Note: The repository’s unit tests don’t require these files. When present, tests will attempt to decode them using the pluggable decoder registry. If JPEG-LS or JPEG 2000 codecs are not available, the tests will fallback to dataset injection/mocks.

Supplying codecs at runtime

- JPEG-LS: set globalThis.**DTK_CODEC_CHARLS** = require('@cornerstonejs/codec-charls') or a compatible module exposing decode(Uint8Array, opts)
- JPEG2000: set globalThis.**DTK_CODEC_OPENJPEG** = require('@cornerstonejs/codec-openjpeg') or similar exposing decode(Uint8Array)

In the app/site, you can attach these on window before rendering the app to enable real decoding.
