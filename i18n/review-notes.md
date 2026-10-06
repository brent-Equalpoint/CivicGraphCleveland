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

## Levies and taxes guide (added Oct 2, 2026)
The countywide write-ups for Issues 10 and 11 (`ext/cx-levies.jsx`, between the LEVY-TEXT markers) are translated too. Things to check:
- **Quotations** from news coverage (Amber Gibbs, Leslie Linaevers, Dale Miller, Yvonne Conwell, Mike O'Malley) are machine-translated from the English quotes. Where a person's exact words matter, compare with the original article.
- **Department names** in the county's list of possible cuts ("Servicios para Niños y Familias", "Servicios para Personas Mayores y Adultos", "Servicios de Empleo y Familia") are translated so readers can follow them; the English names are in the source article. This is decision 1 again.
- **Titles that carry gender** are written without one ("presidencia del Concejo del Condado", "integrante del Concejo del Condado", "persona que recibe servicios", "CEO").
- **"Mill"** is kept as "mill" in the heading "Qué es un mill (milésimo)"; "milésimo" is the textbook word but few residents use it.
- **The purposes in the ballot wording** (for example "current expenses") are translated when short and left in English when they are long, because the ballot's own words are official.
- **"The coverage we read does not quote anyone opposing Issue 10..."** keeps the line "a missing record is not a no" in the Spanish; confirm it still reads as intended.

## State Issue 3 and county Issues 12, 13 and 14 (added Oct 5, 2026)
The stories for the other questions on every ballot in the county (`ext/cx-levies.jsx`, `CX_ISSUE_TEXT`, between the LEVY-TEXT markers) are translated by hand in `i18n/manual.json`. Things to check:
- **The Board of Elections now publishes its own Spanish for every question** in the issue list (the PDF linked from each story, 51 pages, English and Spanish side by side). It calls the county charter "los Estatutos del Condado", the law director "el Director Legal", the prosecutor "el Fiscal", and the commission "la Comisión de Revisión de los Estatutos". The app says "la carta del condado", "el director de asuntos legales", "el fiscal", and "la Comisión de Revisión de la Carta", to match words it already used. Decide whether to switch to the Board's words so a reader recognizes them on the ballot. The official wording itself stays in English in the app (Issue 3's text was being translated by the draft; it is now on the keep list like Issues 10 to 14).
- **Quotations** (Theresa Gavarone, Sunny Simon, Martin Sweeney, Nora Hurley, Marcell Strbich, Marisa Nahem, the ACLU of Ohio, The Vindicator, and the two official arguments on Issue 3) are translated from the English. Compare with the original articles where exact words matter.
- **Titles written without a gender:** "integrante del Concejo del Condado", "integrante del Senado estatal", "vocería", "quien tiene la candidatura demócrata". Check that they read naturally.
- **"Attorney General"** is "Fiscal General", as elsewhere in the app; Ohio's own Spanish materials may say "Procurador General".

## What each committee does, and what the committee roles mean (Oct 6, 2026)
About 480 new entries in `i18n/manual.json`: our two lines for 49 committees and 169 subcommittees (`ext/cx-us-text.jsx`), the six role notes (Chair, Ranking member, Vice chair, Ex officio, Cochair, Member), and the story "How a committee works". The official words of each committee stay in English (they are marked `lang="en"` and not translated), like the ballot wording. Things to check:
1. **Agency, office, law, and committee names stay in English**, with the article of the Spanish noun ("el Defense Department", "la Clean Air Act", "la Federal Aviation Administration"). Military branches, the United Nations, NATO, the European Union, the IMF, and the Helsinki Accords are translated. This is decision 1 above again.
2. **House and Senate:** "la Cámara" and "el Senado"; "House Rule X" is "la Regla X de la Cámara", "Senate Rule XXV" is "la Regla XXV del Senado". "U.S." is "EE. UU.".
3. **The 119th Congress** is written "{n}.º Congreso" here; an older line says "Congreso {n}.º". Pick one.
4. **Titles without gender:** Chair is "la presidencia" ("Presidencia" on the role button), Ranking member is "miembro de mayor rango". The note for Chair says that Chair, Chairman, and Chairwoman are the same post and keeps those English record words; on a Spanish screen the button shows "Presidencia", so "each row keeps the record's own word" reads oddly. Decide whether the role buttons should show the record's English word in Spanish too.
5. **Uncertain terms:** "report a bill" as "enviar al pleno", "markup" as "sesión de enmiendas", "clean bill" as "una versión nueva y limpia", "homeland security" as "seguridad interior", "food safety" as "inocuidad de los alimentos", "stablecoins" as "monedas estables"; "Congressional Record" stays in English.

## How you line up: Compare members and the sample questions (Oct 6, 2026)
About 180 new entries in `i18n/manual.json` for `ext/cx-align.jsx` (Compare members, the counts in each policy area on a member's sheet and profile) and `ext/cx-align-text.jsx` (24 sample questions, what each bill does and does not do, and why two areas were skipped). The sample questions are hidden from residents until a person reviews the English (`python build.py --mark-alignment-reviewed "Name"`), so their Spanish is seen only in the preview the checks use. Things to check:
1. **The 31 policy areas of the Congressional Research Service** are now translated wherever they show (Compare members, Votes by topic, Solo, a profile's "Policy areas voted in"), for example "Delitos y cumplimiento de la ley", "Tierras públicas y recursos naturales", "Nativos americanos". They are category names, not official titles; decide whether to keep them translated. "Law" was already "Asuntos legales".
2. **"How you line up on what you picked"** is "Cómo se comparan sus respuestas en lo que eligió". The words "coincidir" and "coincidencias" were avoided here on purpose, because they read as a match.
3. **Counts:** "A favor {n} En contra {n} No votó {n}" keeps the commas the English has, because the translator treats "6," as one number. "Not in the roll for this vote" is "No estaba en la lista de esta votación"; "no vote on this" is "no hay voto en esto".
4. **Bill titles, vote results ("Joint Resolution Passed"), and organization names stay in English**, as elsewhere ("la Environmental Protection Agency", "el Bureau of Land Management", "la Clean Air Act"). "Schedule I" is "la Lista I (Schedule I)"; "stablecoins" are "monedas estables" as in the committee lines; "U.S. persons" is "personas estadounidenses (U.S. persons)".
5. **Firearms "qualification standard"** is "norma de aptitud con armas de fuego", not "calificación", because "calificación" also means a rating, which this feature never shows.
## The privacy policy (Oct 6, 2026)
About 100 new entries in `i18n/manual.json` for the privacy policy page (`ext/cx-privacy.jsx`), the Settings row that opens it ("Política de privacidad", "Qué guarda este sitio, y dónde"), and "Leer la política de privacidad" on How this is built. The English page is itself a draft that a lawyer and a person have not read; if they change the English, the Spanish changes with it. Things to check:
1. **The draft line** ("Esta política es un borrador. Una persona todavía no la ha aprobado.") must stay as plain as the English. It is the first thing on the page.
2. **"Analytics"** is "análisis de visitas" (the bench note already said "ni análisis"). **"Cookies"** stays "cookies". **"IP address"** is "dirección IP". **"Host"** is "proveedor de alojamiento" in the heading and "servicio de alojamiento web" in the text; one word may read better.
3. **Control names are quoted as the Spanish screen shows them:** Recordar este dispositivo, Recordar en este dispositivo, Guardar en este navegador, Borrar mis elecciones, Borrar mis datos de práctica, Borrar la boleta de práctica y las respuestas, Usar esto en mi boleta, Encontrar mis distritos, Compartir esta pantalla, Ir a, Borrar recientes, Modo fácil, Texto más grande. If any of those labels changes, the sentence must change too.
4. **The storage names** (`cx-lang`, `cx-place`, `cleveland-practice-ballot-2026-v1` and the rest) are code and stay as they are; they are never translated.
5. **"Children"** already had the app-wide Spanish "Niñez", so the heading reads "Niñez". "Niños" may be more natural for this heading, but one English word has one Spanish word in the dictionary.
6. **"Issue" on GitHub** is "reporte", the word the profile pages already use for a mistake report; GitHub's own Spanish screen says "propuesta" or keeps "issue".
7. **The sentence with the place limits** is a pattern: the number of days and the last day come from the code ("Se conservan hasta {n} días, y nunca después del {d}, una semana después del Día de las Elecciones."). Read it with the date filled in.
8. **"City Record"** stays in English here too, as decided for the rest of the app until the reviewer chooses.
9. **Two place lines were corrected in English at the same time**, with new Spanish: the place picker's fine print now names the switch "Recordar este dispositivo", and Easy mode's line is "Elija su vecindario. Se queda en este dispositivo y nunca se envía."
## Votes, actions, and positions on city records (Oct 6, 2026)
About 120 new entries in `i18n/manual.json` for `ext/cx-record.jsx` and `ext/cx-votes-text.jsx`: a city record's Votes & actions, Positions, and Where to read it, a person's Votes & actions list on a profile, and the ward view (My place on the phone, My local context on a computer). The English plain words are themselves not yet reviewed (`python build.py --mark-votes-text-reviewed "Name"`); if a person changes them, the Spanish changes too. Things to check:
1. **The record's own words stay with their Spanish.** The count line reads "14 a favor (Yea), 0 en contra (Nay), 1 ausente (Absent)", so a reader sees the printed word. "Recusal" is "Inhibición (Recusal)"; "recusación" is the other choice.
2. **What happened, in plain words:** "El comité recomendó aprobarla", "El Concejo la aprobó con cambios", "Leída por primera vez y enviada a comité", "Entró en vigor". A record is a feminine "la" throughout (la ordenanza, la resolución); a communication or an item reads well enough with it, but check.
3. **"Sponsorship is not a vote"** keeps the app's wording "Patrocinar no es votar". **"A missing record is not a no"** is "La falta de un registro no significa un no", and **"Absent is not a no"** is "Ausente no significa un no".
4. **The Clerk's action words** ("recommended for approval") and the printed sentences ("Referred to the Directors of ...") stay in English, in quotation marks after "En el registro:" and "Tal como se publicó:", because they are the record's own words. Committee names stay in English as elsewhere.
5. **"Pulled"** is "obtenido el {d}", as in the other source lines. **"City Record"** and **"Legistar"** stay in English.
6. **Filters:** "Todos los tipos de registro", "Todos los tipos", "Todos los años", "Patrocinios ({n})", "Votos ({n})". The counts are per kind only; there is no total, in either language.

## Explore on the phone: the guide, the rail, and the room cards (Oct 6, 2026)
31 new entries in `i18n/manual.json` for `ext/cxm-explore.jsx`.
1. **The rail's six ticks** are named in whole sentences: "Ir a su cuadra", "Ir a su distrito", "Ir a su ciudad", "Ir al condado y los tribunales", "Ir a Ohio y la nación", "Ir al panorama general" (they read "Ir a your block" when "Jump to" was translated alone).
2. **The line under each room card** is one whole line for each singular and plural, for example "6 registros · 5 fuentes oficiales · 1 ley o propuesta" and "34 registros · 21 fuentes oficiales · 6 leyes o propuestas" (it read "5 fuente oficials").
3. **The first sentence of each room's answer** (shown on the highlighted card) is the first sentence of the draft of that whole answer, word for word, so the card and the room say the same thing. "Public Health" stays in English inside "El departamento de Public Health de Cleveland", as in the whole answer.
4. **The guide's lines** ("Esta es su cuadra. ...") were already in the dictionary; the bubble is now drawn in Spanish from its first frame. The guide's name (Erie, Terry, Cuy) is a name and stays as it is.

## The United States Index (Oct 6, 2026)
66 new entries in `i18n/manual.json` for `ext/cx-us-index.jsx` (36 exact, 30 patterns). Names from the record (people, committees, agencies, courts) stay as the record writes them and are marked so the translator leaves them alone; policy area names and state names are translated as elsewhere.
1. **Counts beside a group** are one whole phrase for each singular and plural: "5 comités", "12 subcomités", "1 senador o senadora", "15 representantes", "289 líderes y agencias", "951 tribunales y jueces", "17 miembros del Congreso". A count is a fact, never a strength.
2. **The row's word is the record's word**, translated as on the profile: "Miembro", "Presidencia" (for Chair, Chairman, and Chairwoman alike: one post), "Miembro de mayor rango", "Vicepresidencia", "Por razón de su cargo" (Ex officio), "Copresidencia", "Distrito 11", "Por todo el estado", "Comisionado Residente".
3. **Group names:** "Presidencia y líderes", "Miembros del Senado", "Miembros de la Cámara", "Agencias bajo ella", "Dirigida por" (an agency is feminine), "Nombrado o nombrada por". Check that "Agencias bajo ella" reads naturally; "Agencias que dependen de ella" is an alternative.
4. **A president's count** reads "234 jueces nombrados" and, for one, "1 nombramiento de juez o jueza", to avoid guessing a judge's gender.
5. **Moving around:** "Elija un grupo y luego un nombre.", "Elija un nombre para seguir.", "Volver al inicio", "Dónde está" (the crumbs, read by a screen reader), "Ahora se muestra" (spoken after each move), and "y 525 más · página 1 de 39" for a long list on a computer.
6. **The details card:** "Por qué está vinculado", "Abrir el perfil del comité", "Sitio web oficial".
