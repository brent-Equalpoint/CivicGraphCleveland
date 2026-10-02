# Notes for the Spanish reviewer

The Spanish in `i18n/es.json` is a draft written by an AI translator from `i18n/glossary.md`. A Spanish-speaking, civic-literate resident has not read it. These are the places the translators themselves were unsure, and the choices that need one decision applied everywhere. Fix a wording in `i18n/manual.json` (it wins over the draft), then run `node scripts/i18n/merge.js`.

## Decisions that should be made once, for the whole app
1. **Names of agencies, boards, courts, and departments: translate or keep in English?** The draft keeps many in English (Cleveland Public Power, Public Utilities, Building & Housing, RTA Board of Trustees, CMSD Board of Education) and translates others (Corte Suprema de Ohio, Tribunal de Apelaciones del Octavo Distrito). It also says "Land Bank" both ways. A common practice is the Spanish name with the English in parentheses the first time. Pick a rule.
2. **"Still deciding" is "Aún no decido"** (glossary). An earlier draft said "Sigo decidiendo" in one sentence; it is being aligned.
3. **Terms with no Spanish equivalent:** township (the draft says "municipios rurales (townships)"), charter school ("escuela autónoma (charter)" or "escuela chárter"), write-in candidate, standing ("legitimación procesal", formal), ratepayers, docket ("registro del caso" or "expediente"), land bank ("banco de tierras").
4. **Product words:** "room" (a place on the map) is "sala"; "chamber" is "cámara"; "graph" is "gráfico"; "constellation" is "constelación"; "My alignment" is "Mis coincidencias" (a literal "alineación" sounds political, which the app avoids). The Bench role names (question framer, entity resolver, human publisher) were coined by the translator.
5. **Receipts** are "comprobantes". The status labels (Committed, Talking stage, Left on read, On pause) are plain descriptions in Spanish, not slang. A livelier set is possible.
6. **Dates and times** are converted by the app (1 de junio de 2026, 3:45 p. m.). Check a few on screen.

## Sentences assembled on screen
Some English is built from pieces around a bold word or a link, or around a name or number the app inserts. The draft translates the whole sentence where it can (marked with `<1>...</1>` tags in the dictionary). When a sentence still reads oddly on screen, look at it in context and fix it in `manual.json`:
- "The person who writes a proposal is the <lead>..." (profiles help text), and the other 43 whole sentences.
- "Printed in the City Record for {date}: {n} yea, {n} nay..." (what the placeholders hold depends on the screen).
- "{name}: {n} of {n} comparable records agree{suffix}".
- Relationship verbs on the map (treats & anchors, trains & transfers) were translated without seeing the phrase they sit in.

## Wording flagged by translators
- "Opposed/Support" choice labels: "A favor" / "En contra" (glossary).
- "Candidate snapshot" / "Issue snapshot" (links to a dated copy of data): "Instantánea de candidatos"; "Copia de los datos de candidatos" may read better.
- "Entries not available to choose": check what "entries" means on that ballot screen.
- "Residents & ratepayers": "Residentes y quienes pagan tarifas" is a long label.
- "Endorsements" is "contratos publicitarios" in one place, to avoid clashing with "patrocinio" for sponsorship.
- Gender: "Council President" is written in the masculine ("Presidente del Concejo"); the app has no gender field.

## More decisions raised across the batches
7. **"City Record"** is left in English everywhere (it has no Spanish name). Options: "Registro Municipal (City Record)" at first mention, or keep as is. "Federal Register" is also kept.
8. **"Bench"** (the agent pipeline) is "Mesa" in one place; every mention should match. Its role names were coined by the translator.
9. **Names of the app's views:** Index, Linked, Tree, Sky became "Índice", "Vinculada", "Árbol", "Cielo". **"Lever"** became "Mecanismo" (a label in the record facts) and "facultad" elsewhere; pick one. **"Signed off"** became "Firmado por". **"A reversal"** became "Un vuelco" ("Un giro" or "Una reversión" are options).
10. **Yes/no on a ballot issue:** "A yes vote means" is "Un voto de sí significa"; "Un voto a favor significa" or "Votar sí significa" may read better.
11. **Numeric dates like 1/3/29** are converted by the app to "3 de enero de 2029" (the source writes month/day/year).
12. **Place names and quoted record phrases** ("By Departmental Request", "Common Pleas") are kept in English with Spanish around them.
13. **Gender and number around inserted text.** Where the app inserts a name, a count, or a plural ending, the Spanish avoids an article or an adjective that would need to agree. Where it could not, check the screen: for example "{n} se aprobaron después de que un comité recomendara rechazarlas", "presentadas / retiradas", "informe{s} con decisión".
14. **Sentences the app builds from separate pieces** (often marked in translators' notes): "De City Record, {date} (edición)...", "Nada nuevo en la administración... desde...", "...nombra un lugar de {neighborhood}", "Renovación de {x} con {y}". These need a look on the real screen and a fix in `manual.json`.

## Official ballot wording stays in English
The Board of Elections' own question wording (charter amendments, tax levies, liquor options: "A majority affirmative vote is necessary for passage. Shall...?") is an official record and is kept in English in the app. The translator's draft Spanish for each is in `i18n/ballot-drafts.json`. Do not publish those as the ballot: the County Board of Elections provides its own Spanish ballots where required. Compare against theirs, and if the Board publishes Spanish question text, use it (add it to `manual.json` under `exact`).
