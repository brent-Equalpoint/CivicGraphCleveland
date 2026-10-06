/* How you line up, step 2 (docs/plan-alignment.md, phase A2): the question set. A SAMPLE, written by us from official text, so it is
   interpretive and needs a person's review.

   Everything between the ALIGN-TEXT markers is fingerprinted by build.py. Until a person reads every question against its sources and runs
       python build.py --mark-alignment-reviewed "Your Name"
   step 2 stays hidden in the app (CX_ALIGN_REVIEW.ok is false), and if the text changes after that review it is hidden again.

   How the sample was chosen (the same rules are in docs/plan-alignment.md, and scripts/test_alignment.js enforces the parts a machine can):
   - Only policy areas (the Congressional Research Service's, as Congress.gov labels each bill) with at least `threshold` recorded votes that
     decided a bill (final passage, or agreeing to a joint or concurrent resolution) in data/us-votes-2026.json. Nominations have no policy area
     and a confirmation is about a person, so they are not used.
   - 3 to 5 questions in each area that has enough single-subject bills; an area with fewer than 3 is skipped and listed below.
   - Each question is about one bill and maps to exactly one recorded vote in each chamber that voted on it, the vote that decided it.
   - A bill that bundles unrelated parts (appropriations, continuing resolutions, budget resolutions, the reconciliation act, defense
     authorizations, a bill whose text was replaced) is not used, because its direction means different things to different people.
   - Bills voted on in both chambers come first, so senators and representatives each have questions; then House-only bills. Votes were not
     chosen by how close they were or how anyone voted.
   - Each question asks whether you support what the measure does. A yea is support; a nay is opposition. "does" and "not" are written only
     from the source named, never from news or anyone's argument. "not" is filled only where the source says what the measure leaves out.
   The table between the markers is strict JSON: build.py reads it, checks it against data/us-votes-2026.json, and serves it as
   /us/align-2026.json, fetched only when step 2 opens. The page itself carries `null` here. */

/* ALIGN-TEXT-START */
const CX_ALIGN_Q = {
 "about": "A sample of questions about bills that a recorded vote decided in the 119th Congress, 3 in each policy area that had enough of them. It is not everything Congress voted on.",
 "drafted": "2026-10-06",
 "threshold": 20,
 "per_area": [3, 5],
 "cra_note": {
  "text": "Under the Congressional Review Act, a rule overturned this way cannot be issued again in substantially the same form unless a later law allows it.",
  "label": "5 U.S.C. 801(b)(2), on govinfo.gov",
  "url": "https://www.govinfo.gov/content/pkg/USCODE-2023-title5/html/USCODE-2023-title5-partI-chap8-sec801.htm"
 },
 "questions": [
  {
   "id": "energy-water-heaters", "area": "Energy", "bill": "hjres20",
   "votes": { "senate": "s-119-1-207", "house": "h-119-1-53" },
   "q": "Do you support overturning the Energy Department's 2024 efficiency standard for gas-fired tankless water heaters used in homes?",
   "does": "It cancels the amended energy conservation standard the department adopted in December 2024 for consumer gas-fired instantaneous (tankless) water heaters. The department had set it at the most efficiency it found technologically feasible and economically justified.",
   "not": "",
   "cra": true,
   "src": { "label": "Congressional Research Service summary, as the law was enacted", "url": "https://www.govinfo.gov/bulkdata/BILLSUM/119/hjres/BILLSUM-119hjres20.xml", "read": "2026-10-06" }
  },
  {
   "id": "energy-alaska-reserve", "area": "Energy", "bill": "sjres80",
   "votes": { "senate": "s-119-1-599", "house": "h-119-1-296" },
   "q": "Do you support overturning the 2022 management plan for the National Petroleum Reserve in Alaska, which closed nearly half of the reserve to oil and gas leasing?",
   "does": "It cancels the Bureau of Land Management's 2022 plan for the reserve, about 23 million acres on Alaska's North Slope, and returns it to the 2020 plan. The 2022 plan had closed those areas to leasing to preserve other uses of the land, such as for wildlife and for the subsistence of nearby communities.",
   "not": "",
   "cra": true,
   "src": { "label": "Congressional Research Service summary, as the law was enacted", "url": "https://www.govinfo.gov/bulkdata/BILLSUM/119/sjres/BILLSUM-119sjres80.xml", "read": "2026-10-06" }
  },
  {
   "id": "energy-arctic-refuge", "area": "Energy", "bill": "hjres131",
   "votes": { "senate": "s-119-1-632", "house": "h-119-1-295" },
   "q": "Do you support overturning the 2024 decision that made about 1.2 million acres of the Arctic National Wildlife Refuge's coastal plain unavailable for oil and gas leasing?",
   "does": "It cancels the Bureau of Land Management's December 2024 record of decision for the coastal plain leasing program. That decision kept the legal minimum of 400,000 acres open for a lease sale. The 2020 decision it replaced had made the whole program area, about 1.6 million acres, available.",
   "not": "",
   "cra": true,
   "src": { "label": "Congressional Research Service summary, as the law was enacted", "url": "https://www.govinfo.gov/bulkdata/BILLSUM/119/hjres/BILLSUM-119hjres131.xml", "read": "2026-10-06" }
  },
  {
   "id": "env-california-cars", "area": "Environmental Protection", "bill": "hjres88",
   "votes": { "senate": "s-119-1-277", "house": "h-119-1-114" },
   "q": "Do you support revoking the federal waiver that let California enforce its Advanced Clean Cars II rules for low-emission and zero-emission vehicles?",
   "does": "It cancels the Environmental Protection Agency's January 2025 notice granting the waiver. The Clean Air Act generally bars states from setting their own vehicle emission standards, and California may ask for a waiver of that bar.",
   "not": "",
   "cra": true,
   "src": { "label": "Congressional Research Service summary, as the law was enacted", "url": "https://www.govinfo.gov/bulkdata/BILLSUM/119/hjres/BILLSUM-119hjres88.xml", "read": "2026-10-06" }
  },
  {
   "id": "env-methane-charge", "area": "Environmental Protection", "bill": "hjres35",
   "votes": { "senate": "s-119-1-97", "house": "h-119-1-52" },
   "q": "Do you support overturning the Environmental Protection Agency's 2024 rule on the yearly charge for oil and gas facilities whose methane emissions go over set limits?",
   "does": "It cancels the agency's November 2024 rule on how the waste emissions charge works under the Methane Emissions Reduction Program. The Congressional Research Service summary says this eliminates the yearly charge.",
   "not": "",
   "cra": true,
   "src": { "label": "Congressional Research Service summary, as the law was enacted", "url": "https://www.govinfo.gov/bulkdata/BILLSUM/119/hjres/BILLSUM-119hjres35.xml", "read": "2026-10-06" }
  },
  {
   "id": "env-tire-plants", "area": "Environmental Protection", "bill": "hjres61",
   "votes": { "senate": "s-119-1-232", "house": "h-119-1-58" },
   "q": "Do you support overturning the Environmental Protection Agency's 2024 limits on hazardous air pollutants from rubber processing at tire plants?",
   "does": "It cancels emission standards the agency set in November 2024 for the rubber processing part of the tire manufacturing industry. The agency wrote them after a 2020 court decision required it to address pollutants from that part of the industry that were not yet regulated.",
   "not": "It reaches only the standards this rule set for rubber processing.",
   "cra": true,
   "src": { "label": "Congressional Research Service summary, as the law was enacted", "url": "https://www.govinfo.gov/bulkdata/BILLSUM/119/hjres/BILLSUM-119hjres61.xml", "read": "2026-10-06" }
  },
  {
   "id": "lands-boundary-waters", "area": "Public Lands and Natural Resources", "bill": "hjres140",
   "votes": { "senate": "s-119-2-84", "house": "h-119-2-38" },
   "q": "Do you support reopening about 225,500 acres of national forest land in northeastern Minnesota, near the Boundary Waters Canoe Area Wilderness, to mineral and geothermal leasing?",
   "does": "It cancels Public Land Order 7917, which in 2023 withdrew this land in Cook, Lake, and Saint Louis Counties from mineral and geothermal leasing for 20 years to keep exploration and development away from the Rainy River watershed and the Boundary Waters. The land can again be leased.",
   "not": "",
   "cra": true,
   "src": { "label": "Congressional Research Service summary, as the law was enacted", "url": "https://www.govinfo.gov/bulkdata/BILLSUM/119/hjres/BILLSUM-119hjres140.xml", "read": "2026-10-06" }
  },
  {
   "id": "lands-wyoming-coal", "area": "Public Lands and Natural Resources", "bill": "hjres130",
   "votes": { "senate": "s-119-1-623", "house": "h-119-1-294" },
   "q": "Do you support overturning the 2024 plan change that ended new federal coal leasing in the Bureau of Land Management's Buffalo Field Office area in Wyoming?",
   "does": "It cancels the November 2024 amendment and returns the area to its 2015 resource management plan, under which federal coal is available for leasing. The bureau made the 2024 change after a court required it to weigh the climate effects of coal leasing there.",
   "not": "",
   "cra": true,
   "src": { "label": "Congressional Research Service summary, as the House passed it", "url": "https://www.govinfo.gov/bulkdata/BILLSUM/119/hjres/BILLSUM-119hjres130.xml", "read": "2026-10-06" }
  },
  {
   "id": "lands-glen-canyon", "area": "Public Lands and Natural Resources", "bill": "hjres60",
   "votes": { "senate": "s-119-1-239", "house": "h-119-1-110" },
   "q": "Do you support overturning the National Park Service's 2025 rule that limited off-road vehicles in parts of Glen Canyon National Recreation Area?",
   "does": "It cancels the January 2025 rule for the recreation area around Lake Powell in Arizona and Utah. The rule had closed an 8-mile stretch of the Poison Spring Loop to off-road vehicles, ended the park service's authority to open the upper Flint Trail to them, and limited their use from some roads to the lake shore.",
   "not": "",
   "cra": true,
   "src": { "label": "Congressional Research Service summary, as the law was enacted", "url": "https://www.govinfo.gov/bulkdata/BILLSUM/119/hjres/BILLSUM-119hjres60.xml", "read": "2026-10-06" }
  },
  {
   "id": "crime-fentanyl-class", "area": "Crime and Law Enforcement", "bill": "s331",
   "votes": { "senate": "s-119-1-127", "house": "h-119-1-166" },
   "q": "Do you support permanently placing fentanyl-related substances, as a class, in Schedule I of the Controlled Substances Act?",
   "does": "Schedule I is for drugs with a high potential for abuse and no currently accepted medical use. Offenses involving these substances get the same quantity thresholds and penalties as fentanyl analogues, such as a 10-year mandatory minimum prison term for 100 grams or more. It also changes the registration rules for research with Schedule I drugs.",
   "not": "",
   "src": { "label": "Congressional Research Service summary, as the law was enacted", "url": "https://www.govinfo.gov/bulkdata/BILLSUM/119/s/BILLSUM-119s331.xml", "read": "2026-10-06" }
  },
  {
   "id": "crime-epstein-records", "area": "Crime and Law Enforcement", "bill": "hr4405",
   "votes": { "house": "h-119-1-289" },
   "q": "Do you support requiring the Justice Department to publish its unclassified records on the investigation and prosecution of Jeffrey Epstein?",
   "does": "The records include material on Ghislaine Maxwell, flight logs and travel records, and the people named in the case, including government officials, published so they can be searched and downloaded. Within 15 days the department reports to Congress on what it released and what it withheld.",
   "not": "It does not require publishing victims' personal information or material that would put an active federal investigation at risk.",
   "src": { "label": "Congressional Research Service summary, as the law was enacted", "url": "https://www.govinfo.gov/bulkdata/BILLSUM/119/hr/BILLSUM-119hr4405.xml", "read": "2026-10-06" }
  },
  {
   "id": "crime-officer-carry", "area": "Crime and Law Enforcement", "bill": "hr2243",
   "votes": { "house": "h-119-1-128" },
   "q": "Do you support letting qualified active and retired law enforcement officers carry concealed firearms in more places, including school zones, national parks, and property open to the public?",
   "does": "It broadens the federal law that lets these officers carry concealed firearms across state lines. It also lets a state allow retired officers to meet the firearms qualification standard less often, as seldom as every 36 months instead of every 12.",
   "not": "",
   "src": { "label": "Congressional Research Service summary, as introduced", "url": "https://www.govinfo.gov/bulkdata/BILLSUM/119/hr/BILLSUM-119hr2243.xml", "read": "2026-10-06" },
   "text": { "label": "The text as the House passed it", "url": "https://www.govinfo.gov/content/pkg/BILLS-119hr2243eh/html/BILLS-119hr2243eh.htm", "read": "2026-10-06" }
  },
  {
   "id": "fin-stablecoins", "area": "Finance and Financial Sector", "bill": "s1582",
   "votes": { "senate": "s-119-1-318", "house": "h-119-1-200" },
   "q": "Do you support creating federal rules for payment stablecoins, digital assets that the issuer has to exchange back for a fixed amount of money?",
   "does": "Only approved issuers, supervised by a federal or state regulator, may issue them for use in the United States. Issuers hold reserves one for one in U.S. dollars or similar liquid assets, publish their reserves every month, and follow anti-money laundering law. Approved stablecoins are not treated as securities or commodities.",
   "not": "",
   "src": { "label": "Congressional Research Service summary, as the law was enacted", "url": "https://www.govinfo.gov/bulkdata/BILLSUM/119/s/BILLSUM-119s1582.xml", "read": "2026-10-06" }
  },
  {
   "id": "fin-overdraft-charges", "area": "Finance and Financial Sector", "bill": "sjres18",
   "votes": { "senate": "s-119-1-153", "house": "h-119-1-96" },
   "q": "Do you support overturning the Consumer Financial Protection Bureau's 2024 rule on overdraft charges at very large financial institutions?",
   "does": "The rule required those institutions to cap an overdraft charge at $5, set a higher cap they could justify, or treat overdrafts as credit with the disclosures the Truth in Lending Act requires. The resolution cancels the rule.",
   "not": "",
   "cra": true,
   "src": { "label": "Congressional Research Service summary, as the law was enacted", "url": "https://www.govinfo.gov/bulkdata/BILLSUM/119/sjres/BILLSUM-119sjres18.xml", "read": "2026-10-06" }
  },
  {
   "id": "fin-payment-apps", "area": "Finance and Financial Sector", "bill": "sjres28",
   "votes": { "senate": "s-119-1-106", "house": "h-119-1-95" },
   "q": "Do you support overturning the Consumer Financial Protection Bureau's 2024 rule that put large payment apps under its supervision?",
   "does": "The rule covered companies other than banks that run general-use digital payment apps, handle at least 50 million transactions a year, and are not small businesses. The resolution cancels the rule.",
   "not": "",
   "cra": true,
   "src": { "label": "Congressional Research Service summary, as the law was enacted", "url": "https://www.govinfo.gov/bulkdata/BILLSUM/119/sjres/BILLSUM-119sjres28.xml", "read": "2026-10-06" }
  },
  {
   "id": "com-ticket-prices", "area": "Commerce", "bill": "hr1402",
   "votes": { "house": "h-119-1-107" },
   "q": "Do you support requiring sellers of tickets to concerts, games, and other events to show the total price, with all fees, from the first time a ticket is shown?",
   "does": "Sellers also list the base price and each fee before purchase and cannot sell a ticket they do not have. Unless the cause is beyond their control, they refund the full price of a canceled event, and for a postponed one offer a replacement ticket, or a choice of a refund if it moves by more than six months. The Federal Trade Commission enforces it.",
   "not": "",
   "src": { "label": "Congressional Research Service summary, as introduced", "url": "https://www.govinfo.gov/bulkdata/BILLSUM/119/hr/BILLSUM-119hr1402.xml", "read": "2026-10-06" },
   "text": { "label": "The text as the House passed it", "url": "https://www.govinfo.gov/content/pkg/BILLS-119hr1402eh/html/BILLS-119hr1402eh.htm", "read": "2026-10-06" }
  },
  {
   "id": "com-ebike-batteries", "area": "Commerce", "bill": "hr973",
   "votes": { "house": "h-119-1-103" },
   "q": "Do you support making safety standards for the lithium-ion batteries and electrical systems in e-bikes and e-scooters mandatory federal rules?",
   "does": "The Consumer Product Safety Commission adopts the standards written by the American National Standards Institute, the Standards Council of Canada, and UL Solutions as consumer product safety standards that makers and sellers have to meet.",
   "not": "",
   "src": { "label": "Congressional Research Service summary, as introduced", "url": "https://www.govinfo.gov/bulkdata/BILLSUM/119/hr/BILLSUM-119hr973.xml", "read": "2026-10-06" },
   "text": { "label": "The text as the House passed it", "url": "https://www.govinfo.gov/content/pkg/BILLS-119hr973eh/html/BILLS-119hr973eh.htm", "read": "2026-10-06" }
  },
  {
   "id": "com-sodium-nitrite", "area": "Commerce", "bill": "hr1442",
   "votes": { "house": "h-119-1-108" },
   "q": "Do you support banning consumer products in which sodium nitrite is one tenth or more of the weight?",
   "does": "Such a product becomes a banned hazardous product under the Consumer Product Safety Act, 90 days after the bill becomes law.",
   "not": "It does not apply to drugs, medical devices, cosmetics, or food, or to commercial and industrial uses that are not sold to consumers.",
   "src": { "label": "Congressional Research Service summary, as introduced", "url": "https://www.govinfo.gov/bulkdata/BILLSUM/119/hr/BILLSUM-119hr1442.xml", "read": "2026-10-06" },
   "text": { "label": "The text as the House passed it", "url": "https://www.govinfo.gov/content/pkg/BILLS-119hr1442eh/html/BILLS-119hr1442eh.htm", "read": "2026-10-06" }
  },
  {
   "id": "gov-voter-citizenship", "area": "Government Operations and Politics", "bill": "hr22",
   "votes": { "house": "h-119-1-102" },
   "q": "Do you support requiring documentary proof of U.S. citizenship, such as a valid U.S. passport or a REAL ID that shows citizenship, to register to vote in federal elections?",
   "does": "States could not register an applicant without that proof and would set up another way for people to show citizenship with other evidence. States would also remove noncitizens from voter lists. An election official who registers someone without the proof could face criminal penalties and a private lawsuit.",
   "not": "",
   "src": { "label": "Congressional Research Service summary, as introduced", "url": "https://www.govinfo.gov/bulkdata/BILLSUM/119/hr/BILLSUM-119hr22.xml", "read": "2026-10-06" },
   "text": { "label": "The text as the House passed it", "url": "https://www.govinfo.gov/content/pkg/BILLS-119hr22eh/html/BILLS-119hr22eh.htm", "read": "2026-10-06" }
  },
  {
   "id": "gov-dc-tax-law", "area": "Government Operations and Politics", "bill": "hjres142",
   "votes": { "senate": "s-119-2-37", "house": "h-119-2-56" },
   "q": "Do you support overturning a 2025 District of Columbia law that kept several tax changes from the 2025 federal reconciliation act out of the District's income tax?",
   "does": "The District normally follows changes in federal tax law. Its council had opted out of changes such as the deductions for tips, overtime pay, car loan interest, and people 65 and older, and had restored a District child tax credit. The resolution cancels that law, so those federal changes apply in the District and the restored credit does not.",
   "not": "",
   "src": { "label": "Congressional Research Service summary, as the law was enacted", "url": "https://www.govinfo.gov/bulkdata/BILLSUM/119/hjres/BILLSUM-119hjres142.xml", "read": "2026-10-06" }
  },
  {
   "id": "gov-midnight-rules", "area": "Government Operations and Politics", "bill": "hr77",
   "votes": { "house": "h-119-1-41" },
   "q": "Do you support letting Congress overturn several federal rules in one vote when the rules were sent to it late in the final year of a President's term?",
   "does": "Under the Congressional Review Act today, each joint resolution can overturn only one rule. This bill lets one resolution cover several such rules.",
   "not": "",
   "src": { "label": "Congressional Research Service summary, as introduced", "url": "https://www.govinfo.gov/bulkdata/BILLSUM/119/hr/BILLSUM-119hr77.xml", "read": "2026-10-06" },
   "text": { "label": "The text as the House passed it", "url": "https://www.govinfo.gov/content/pkg/BILLS-119hr77eh/html/BILLS-119hr77eh.htm", "read": "2026-10-06" }
  },
  {
   "id": "def-fisa-702", "area": "Armed Forces and National Security", "bill": "s4465",
   "votes": { "house": "h-119-2-155" },
   "q": "Do you support extending the government's foreign intelligence surveillance powers under Title VII of the Foreign Intelligence Surveillance Act, including Section 702, until June 12, 2026?",
   "does": "Section 702 covers collecting the communications of people who are not U.S. persons and are believed to be outside the United States, to gather foreign intelligence. Information about U.S. persons, a legal term that includes citizens and permanent residents, can be collected along the way and later searched in some cases.",
   "not": "The official summary describes no change to how the surveillance works, only the new end date.",
   "src": { "label": "Congressional Research Service summary, as the law was enacted", "url": "https://www.govinfo.gov/bulkdata/BILLSUM/119/s/BILLSUM-119s4465.xml", "read": "2026-10-06" }
  },
  {
   "id": "def-va-gun-checks", "area": "Armed Forces and National Security", "bill": "hr1041",
   "votes": { "house": "h-119-2-190" },
   "q": "Do you support barring the Department of Veterans Affairs from sending a veteran's information to the federal gun background check system solely because the VA pays their benefits to a fiduciary?",
   "does": "A fiduciary is someone appointed to manage a person's benefits. The bar applies unless a judge or other judicial authority finds the person a danger to themselves or others. The House-passed text also has the VA tell the Attorney General that names it sent on this basis no longer qualify, and says a VA finding that someone is mentally incompetent or needs a fiduciary is not, by itself, a legal judgment of mental incompetence.",
   "not": "",
   "src": { "label": "Congressional Research Service summary, as introduced", "url": "https://www.govinfo.gov/bulkdata/BILLSUM/119/hr/BILLSUM-119hr1041.xml", "read": "2026-10-06" },
   "text": { "label": "The text as the House passed it", "url": "https://www.govinfo.gov/content/pkg/BILLS-119hr1041eh/html/BILLS-119hr1041eh.htm", "read": "2026-10-06" }
  },
  {
   "id": "def-st-louis-va", "area": "Armed Forces and National Security", "bill": "s2393",
   "votes": { "house": "h-119-2-180" },
   "q": "Do you support authorizing the Department of Veterans Affairs to carry out a major medical facility project in St. Louis, Missouri, in fiscal year 2026?",
   "does": "The project includes a new bed tower, an expanded clinical building, a combined administrative building and warehouse, a utility plant, and parking garages. The law sets the most that can be spent on it.",
   "not": "",
   "src": { "label": "Congressional Research Service summary, as the law was enacted", "url": "https://www.govinfo.gov/bulkdata/BILLSUM/119/s/BILLSUM-119s2393.xml", "read": "2026-10-06" }
  }
 ],
 "skipped": [
  { "area": "Economics and Public Finance", "why": "It has enough recorded votes, but nearly all are appropriations, continuing resolutions, budget resolutions, and the reconciliation act, which bundle many unrelated parts. The balanced budget amendment pairs a spending limit with a two-thirds vote for tax increases. Only one single-subject bill (H.R. 4, rescissions) was left, short of 3." },
  { "area": "Nominations", "why": "A confirmation has no policy area and is about a person, not a policy." }
 ],
 "dropped": [
  { "bill": "s1318", "why": "The House-passed version replaced the text with a surveillance law extension and a ban on a central bank digital currency: unrelated parts." },
  { "bill": "hr6047", "why": "It expands several veterans benefits and also raises some home loan fees: parts that pull in different directions." },
  { "bill": "hr8800", "why": "A defense authorization act: many unrelated parts. The same goes for S. 1071, S. 2296, and H.R. 3838." },
  { "bill": "hr471", "why": "Many parts: wildfire planning, limits on environmental review, and limits on lawsuits." },
  { "bill": "hr21", "why": "We could not write it in words that the two sides of the debate would both accept as plain." },
  { "bill": "hr9238", "why": "A second short surveillance law extension in the same area; left out so one subject does not get two questions." },
  { "bill": "sjres82", "why": "No Congressional Research Service summary was published when the sample was written." }
 ]
};
/* ALIGN-TEXT-END */
