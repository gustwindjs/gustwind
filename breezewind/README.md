# Breezewind - Breezing fast templating

Breezewind is a simple templating engine used by Gustwind. It's designed to be fast and extensible. Its primary purpose is to convert JSON structures into HTML/XML.

## Usage

The API is available through `breezewind` and `breezewind/extensions`. For now, it's best to examine the tests and this project for exact usage as some details may change until the API is considered stable.

## Publishing

1. `vr build:breezewind <VERSION>` where `VERSION` is `0.1.0` for example
2. `cd breezewind/npm`
3. `npm publish`. You may need to pass `--otp` here as well (preferred for security)
