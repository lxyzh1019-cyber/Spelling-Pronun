# Curriculum extraction

How `src/data/curriculum.alberta.elal.json` was built, kept so the mapping can be rebuilt or checked
rather than taken on trust.

The Alberta ELAL (K–6) PDF is not in this repository — it is a government publication the parent
supplied on 2026-09-18, because this container cannot reach `curriculum.learnalberta.ca`. Point the
first step at your own copy.

```
node tools/extract2.mjs <alberta-elal-k6.pdf> k6.json   # text items with x/y positions
node tools/g56.mjs      k6.json g56.json                # Grade 5 and Grade 6, split by column
node tools/build_map.mjs g56.json src/data/curriculum.alberta.elal.json
```

**Why the positions matter.** Grade 5 and Grade 6 share a page in two columns. Read as flat text they
interleave, and every statement risks being attributed to the wrong grade — a mapping that is quietly
false rather than obviously broken. `columns.mjs` assigns each text item to a column by its x position,
and splits statements on the column's left margin, because a bullet's wrapped continuation is
indistinguishable from the start of a new statement without knowing the indent.

`build_map.mjs` holds the coverage decisions. The statements are the curriculum's words and come from
the PDF; the coverage state and note beside each one are a judgement, and `test/curriculumMapping.test.js`
requires the file to say so until a person has checked them.
