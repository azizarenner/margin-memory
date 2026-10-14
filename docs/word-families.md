# Word families and phrases

Select a personal Atlas meaning and expand **Word families & phrases**. The main
graph and reading workflow do not change. This feature is read-only and works
with existing captures without sending another request to an AI provider.

## Dictionary relatives

The bundled reference is a modified extraction of Princeton WordNet 3.0, obtained
from the NLTK data repository. Only explicit `+` derivational lexical pointers
are included, retaining source and target synset offsets, word positions,
definitions and parts of speech. It has 25,882 word entries and 55,199 directional
links. It is not an inflection generator or an exhaustive etymological dictionary.
No relationship is guessed from shared spelling or a stripped suffix.

Lookup uses the saved English lemma and part of speech. Dictionary senses are
not automatically aligned to the app's sense definitions; related reference
meanings are disclosed so users can compare them. Relatives are grouped by word,
with at most six displayed. A saved marker indicates that the word exists in the
reader's captures, not that a particular dictionary meaning is known. Dictionary
words are never inserted into personal history or added as graph edges by GET.

The extraction and its license are packaged inside the API wheel/image, so runtime
does not download a dictionary or require another service. Regenerate with:

```sh
curl --fail --location https://raw.githubusercontent.com/nltk/nltk_data/gh-pages/packages/corpora/wordnet.zip --output /tmp/wordnet.zip
python3 scripts/build-word-families.py /tmp/wordnet.zip
```

The generator verifies SHA-256
`cbda5ea6eef7f36a97a43d4a75f85e07fccbb4f23657d27b4ccbc93e2646ab59`
before parsing and writes deterministic compressed JSON. The original archive
is not needed at runtime. The full WordNet notice accompanies the derived data
in `services/api/app/reference/WORDNET-LICENSE.txt`; the reference data retains
its WordNet license rather than the project's MIT license.

- [WordNet license](https://wordnet.princeton.edu/license-and-commercial-use)
- [WordNet database format](https://wordnet.princeton.edu/documentation/wndb5wn)
- [NLTK reference archive](https://github.com/nltk/nltk_data/blob/gh-pages/packages/corpora/wordnet.zip)

## Phrases from reading

Phrase candidates come from stored collocations for the selected sense across
the latest 200 owned captures linked to that sense. At most 12 collocations per
snapshot are considered. Candidates are deduplicated ignoring case/spacing;
single words and strings longer than 120 characters are omitted. At most six
phrases appear, with observed matches first. A bounded-history notice appears
when older captures were omitted.

The system checks those candidates against the original private sentences using
whole-word boundaries, ignoring case/spacing. It excludes evidence from captures
where the reader explicitly chose another meaning. One original sentence and
its source are displayed per matched phrase; counts describe distinct captures.
A match is textual evidence, not validation of the candidate's meaning or a
claim that the phrase is generally common. A missing match does not mean the
reader has never seen it. This is not unrestricted phrase extraction from text.

Private sentences stay in reader-scoped responses and are never copied into the
public dictionary reference. All family/phrase reads are non-mutating. There is
no database migration, automatic review, mastery score or additional AI call.
