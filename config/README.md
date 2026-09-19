# Index configuration

`index-settings.json` is an export, not an input.

The index is configured by hand in the Algolia dashboard (Index > Configuration).
`../scripts/06-export-settings.sh` reads the live settings back from the API and writes them
here, so the configuration is versioned, diffable and reviewable alongside the code.

Nothing in this repo writes settings to the index.

What was set, and why, is explained in the root README and in `../prep/relevance-testing.md`.
