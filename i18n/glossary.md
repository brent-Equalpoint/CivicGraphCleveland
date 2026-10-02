# Spanish glossary and style (draft, for translators and the reviewer)

Every Spanish string in `i18n/es.json` follows this. A Spanish-speaking, civic-literate resident should confirm or change these choices;
changing one here means changing it everywhere (the check in `scripts/i18n/check_dict.py` lists where each term is used).

## Voice
- Plain, neutral US Spanish that a Cleveland resident of any background reads easily. No regional slang.
- Address the reader as **usted** ("su distrito", "su boleta"). Buttons and menu items use the infinitive ("Buscar", "Cerrar", "Guardar").
- Same tone as the English: warm, direct, short sentences. Sentence case, like the English. No em dashes (use a period, comma, or colon).
- Keep numbers, dollar amounts, file numbers (1183-2026), and acronyms (TIF, HUD, CDC) as they are. Keep `{*}`, `{n}`, `{$}`, `{f}`, `{d}`, `{t}` placeholders exactly, the same number of them, in an order that reads naturally in Spanish.
- Do not translate: people's names, names of organizations, laws and ordinances by number, official titles of legislation, the product name "Civic Graph" / "Cleveland Civic Graph", the guide names Erie, Terry, and Cuy.

## Government and civic terms
| English | Spanish |
| --- | --- |
| ward | distrito (a Cleveland city-council district: "Distrito 3") |
| district (congressional, state) | distrito |
| City Council / Council | Concejo Municipal / el Concejo |
| council member | miembro del Concejo (concejal when the person is named and the gender is clear) |
| Mayor / the mayor's administration | alcalde (Mayor Bibb) / la administración del alcalde / la Alcaldía for the office |
| City Hall | el Ayuntamiento |
| city department | departamento de la ciudad |
| ordinance | ordenanza |
| resolution | resolución |
| emergency ordinance | ordenanza de emergencia |
| legislation / measure | legislación / medida |
| bill | proyecto de ley |
| sponsor / sponsorship | patrocinador / patrocinio ("patrocinar una propuesta no es votar") |
| led / joined (a proposal) | encabezó / se sumó a |
| committee | comité |
| vote / roll call | voto / votación nominal |
| yea / nay / absent | a favor / en contra / ausente |
| passed / adopted | aprobada / adoptada |
| tabled / laid on the table | puesta sobre la mesa (aplazada) |
| introduced | presentada |
| amended / as amended | enmendada / según fue enmendada |
| levy | gravamen de impuestos (impuesto a la propiedad) |
| Board of Elections | Junta Electoral |
| Cuyahoga County | Condado de Cuyahoga |
| ballot | boleta |
| Election Day | Día de las Elecciones |
| early voting | votación anticipada |
| voter registration / registration deadline | registro de votantes / fecha límite de registro |
| precinct | precinto |
| polling place | lugar de votación |
| candidate / contest | candidato / contienda |
| issue (on the ballot) | asunto (Asunto 3) |
| neighborhood | vecindario |
| record / official record | registro / registro oficial |
| source / official source | fuente / fuente oficial |
| receipt(s) (a record of who paid whom) | comprobante(s) |
| Neighborhood Equity Fund | Fondo de Equidad de los Vecindarios |
| casino revenue | ingresos de los casinos |
| tax increment financing (TIF) | financiamiento por incremento de impuestos (TIF) |
| public records / "no scores" | registros públicos / "sin puntajes" |
| dictionary / civic dictionary | diccionario / diccionario cívico |
| Resident check | Verificación para residentes |
| Decision ledger | Libro de decisiones |
| Easy mode | Modo fácil |
| Read it to me | Escuchar |
| Read as text | Leer como texto |
| Settings | Ajustes |
| My place | Mi lugar |
| My priorities | Mis prioridades |

## The status labels on receipts (English slang, written plainly)
| English | Spanish |
| --- | --- |
| Committed (passed) | Aprobada |
| Talking stage (still in review) | En revisión |
| Left on read (tabled) | Puesta sobre la mesa |
| On pause (held) | En pausa |
The English labels are playful on purpose. In Spanish the first three say what the status is. The reviewer may prefer a livelier set.

## Phrases that carry a rule (the reviewer checks these word by word)
- "Sponsorship is not a vote" → "Patrocinar una propuesta no es votar."
- "A missing record is not a no" → "La falta de un registro no significa que la respuesta sea no."
- "Absent is not a no and not an abstention" → "Ausente no significa en contra ni abstención."
- "Receipts, not scores" → "Comprobantes, no puntajes."
- "Nothing personal leaves your browser" → "Nada personal sale de su navegador."

## How to handle things that are not plain text
- A string that is only a person's name, an organization, a file number, a URL, or code: set status `keep` (leave as is) or `skip` (not shown to people).
- Fragments such as "finds it." or "It's a" are pieces of a sentence assembled on screen. Translate each piece so the pieces read well in order; if a piece cannot stand alone, still give the best Spanish for it.

## Labels that repeat across the app (use these exact words everywhere, including inside sentences)
| English | Spanish |
| --- | --- |
| Most important / Important / Still deciding / Skip (priority choices) | Lo más importante / Importante / Aún no decido / Omitir |
| Support / Oppose (a policy choice) | A favor / En contra |
| Yes / No / It depends / Still learning | Sí / No / Depende / Sigo aprendiendo |
| Led / Joined / Signed for a city department | Encabezó / Se sumó / Firmó por un departamento de la ciudad |
| Official source / Recorded action / Organization source / Interpretation / Record needed | Fuente oficial / Acción registrada / Fuente de una organización / Interpretación / Falta el registro |
| Back / Next / Close / Search / Skip to content | Atrás / Siguiente / Cerrar / Buscar / Saltar al contenido |
| Learn more / Read the record / Open | Más información / Leer el registro / Abrir |

## Dates, times, and numbers
Write dates the Spanish way ("1 de junio de 2026", "el 22 de septiembre", "martes 3 de noviembre"), not the English order. Use "a. m." and "p. m." for times. Keep digits and dollar amounts as written. A placeholder {d} (date) or {t} (time) is converted by the app; leave it where it is.

## Whole sentences with a bold word or a link
Some entries are one sentence in which a bold word or a link is written as `<1>...</1>`, `<2>...</2>`. Translate the whole sentence naturally, and keep every tag exactly as written: the same tags, each once, **in the same order** (1 before 2 before 3), because the page cannot reorder its elements. You may move the words around the tags and change what is inside them (the bold word becomes its Spanish word). Do not add or remove tags. Pieces that appear inside such a sentence are also listed on their own, so a lone piece should still read well by itself.

