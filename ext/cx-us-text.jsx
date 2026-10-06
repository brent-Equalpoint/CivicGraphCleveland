/* What each committee and subcommittee does, what the committee roles mean, and how a committee works, in two short lines each
   (docs/plan-explain-committees-and-seats.md, phases 3 and 4). The official words these lines are written from are in
   data/us-explainers-2026.json (scripts/fetch_explainers.py); the page shows them one tap below our lines, with their source and the day
   they were pulled, and says which Congress they are from.

   Two lines, never more: "What it does" (one sentence, 20 words at most) and "Why it matters" (one sentence, 15 words at most, a fact about
   the job from the official text or the chamber's rules, never a judgment of importance). No ranking, no party, no dashes. Where a line
   cannot be grounded in the official text there is no line: the page shows the official words, or "No description on file".

   The site loads the committee lines with the official words (build.py serves both as /us/explainers-2026.json), only when a committee, a
   subcommittee, or the Index, Linked, or Tree view first needs them, so nothing here is downloaded when the app opens. The role notes and
   the story are small and travel with the page. */

/* US-TEXT-START
   Interpretive text: everything from here to US-TEXT-END. A person reads it against the official words (in the app, one tap below each
   line, or in data/us-explainers-2026.json) and then runs:  python build.py --mark-us-text-reviewed "Your Name"
   Until then, and again after any change here, every place these lines show says a person has not reviewed them. */
const CX_US_ROLE_TEXT = {
  chair: { words: [`Chair`, `Chairman`, `Chairwoman`], title: `Chair`, what: `Presides over the committee or subcommittee and sets its schedule.`, why: `Chairs are chosen by the House majority party, and by seniority in the Senate.`, same: `Chair, Chairman, and Chairwoman are the same post. Each row keeps the record's own word.` },
  ranking: { words: [`Ranking Member`], title: `Ranking member`, what: `The minority party member with the highest rank on a committee or subcommittee.`, why: `Often helps manage the committee's bills on the floor and oversees the minority staff.`, same: `` },
  vice: { words: [`Vice Chair`, `Vice Chairman`, `Vice Chairwoman`], title: `Vice chair`, what: `Presides over a meeting when the chair is absent.`, why: `In the House the full committee's chair names a majority member to the post.`, same: `Vice Chair, Vice Chairman, and Vice Chairwoman are the same post. Each row keeps the record's own word.` },
  exofficio: { words: [`Ex Officio`], title: `Ex officio`, what: `A seat that comes with another post, such as a committee's chair or ranking member.`, why: `Under Senate rules, these seats on subcommittees carry no vote.`, same: `` },
  cochair: { words: [`Cochairman`, `Cochair`, `Co-Chair`, `Cochairwoman`], title: `Cochair`, what: `Shares the lead of the Helsinki Commission with its chairman.`, why: `The two posts rotate between the Senate and the House with each new Congress.`, same: `Cochair and Cochairman are the same post. Each row keeps the record's own word.` },
  member: { words: [`Member`], title: `Member`, what: `Holds a seat on a committee, and each chamber elects its committee members.`, why: `A committee can report a bill only when a majority of its members is present.`, same: `` },
};
/* "How a committee works": a story in the story engine (ext/cx-story.jsx), five steps and the one rule not to misread. Each step names the
   official words it rests on (a step of "process" in data/us-explainers-2026.json). */
const CX_US_HOW_TEXT = {
  name: `How a committee works`,
  when: `Five steps, from the House and Senate rules`,
  frames: [
    { k: `Step 1`, big: `A bill is sent to a committee.`, small: `House and Senate rules send each bill to the committee whose subjects it covers.`, step: `referral` },
    { k: `Step 2`, big: `A hearing.`, small: `Members hear from witnesses, such as officials, experts, and business and labor groups.`, step: `hearing` },
    { k: `Step 3`, big: `A markup.`, small: `After its hearings, the committee marks up the bill and often prepares a clean bill.`, step: `markup` },
    { k: `Step 4`, big: `A vote to report it.`, small: `A majority of the committee must be present. In the House, the report goes to a calendar.`, step: `report` },
    { k: `Step 5`, big: `Then the floor.`, small: `The full House votes on it, and a bill that passes moves to the Senate.`, step: `floor` },
    { k: `Remember`, big: `A committee's vote is not the chamber's vote.`, small: `A committee's vote sends a bill on. The full House or Senate still has to vote.`, step: `floor` },
  ],
};
/* US-LINES: the committee and subcommittee lines, by the record's id. build.py takes this table out of the page and serves it with the
   official words, so the page does not carry it until a committee opens. Strict JSON: double quotes, no trailing comma.
   [what it does, why it matters] */
const CX_US_LINES = {
"HSAG": ["Handles farm policy, crop insurance, forests, rural development, and human nutrition.", "House bills on crop prices, farm credit, and meat inspection go to it."],
"HSAG15": ["Handles forestry policy and national forests, plus fruits, vegetables, nuts, and ornamental plants.", "Bees, organic farming, and marketing and promotion orders also fall under it."],
"HSAG22": ["Works on laws and policies for commodity exchanges and for rural development.", "Its scope also includes energy and rural electrification."],
"HSAG16": ["Covers farm commodities such as corn, soybeans, wheat, cotton, rice, peanuts, and sugar, plus farm credit.", "Federal crop insurance and the Commodity Credit Corporation fall under it too."],
"HSAG29": ["Handles policy and markets for livestock, poultry, dairy, and seafood, including how they are inspected and marketed.", "Aquaculture, animal welfare, and grazing are also part of its work."],
"HSAG14": ["Deals with resource conservation, pest and disease management including pesticides, and biotechnology.", "Bioterrorism, quarantine matters, and research, education, and extension also fall under it."],
"HSAG03": ["Handles nutrition policy, including the Supplemental Nutrition Assistance Program and distributing commodities within the country.", "Foreign agricultural assistance and trade promotion also fall under it."],
"HSAP": ["Handles the bills that pay for the federal government, and canceling or moving that money.", "House bills that appropriate federal money go to it under House Rule X."],
"HSAP01": ["Covers funding for the Department of Agriculture, except the Forest Service, and the Food and Drug Administration.", "The Commodity Futures Trading Commission and Farm Credit Administration are also funded here."],
"HSAP19": ["Handles funding for the Commerce and Justice Departments, the National Aeronautics and Space Administration, and the National Science Foundation.", "Its funding also covers the Equal Employment Opportunity Commission and the Legal Services Corporation."],
"HSAP02": ["Covers funding for the Army, Navy, Marine Corps, Air Force, Space Force, and defense agencies.", "It also covers the Central Intelligence Agency and the Director of National Intelligence's office."],
"HSAP10": ["Covers funding for the Energy Department, the Bureau of Reclamation, and civil work of the Army Corps of Engineers.", "It also covers the Great Lakes Authority and the Nuclear Regulatory Commission."],
"HSAP23": ["Covers funding for the Treasury Department, the federal courts, the Executive Office of the President, and the District of Columbia.", "The Securities and Exchange Commission and Small Business Administration are funded here too."],
"HSAP06": ["Handles funding for the Interior Department, the Environmental Protection Agency, and the Forest Service.", "The Indian Health Service and the Smithsonian Institution are funded here too."],
"HSAP07": ["Covers funding for the Departments of Labor, Education, and Health and Human Services.", "Its funding also covers the Social Security Administration and the National Labor Relations Board."],
"HSAP24": ["Covers funding for the House, the Senate, the Capitol Police, and the Library of Congress.", "The Congressional Budget Office and Government Accountability Office are funded here too."],
"HSAP18": ["Covers funding for military construction, military family housing, and the Department of Veterans Affairs.", "The NATO Security Investment Program and the Armed Forces Retirement Home are also funded here."],
"HSAP04": ["Handles funding for the Department of State, the Peace Corps, and the U.S. Agency for International Development.", "It also covers the Export-Import Bank and the Millennium Challenge Corporation."],
"HSAP20": ["Covers funding for the Department of Transportation and the Department of Housing and Urban Development.", "The National Transportation Safety Board and the Interagency Council on Homelessness are funded here too."],
"HSAS": ["Handles the Department of Defense, the armed forces, and the common defense.", "House bills on military pay, bases, and the size of the forces go to it."],
"HSAS25": ["Handles Army ground equipment and missiles, and fighter aircraft and helicopters for the Marine Corps, Air Force, and Navy.", "National Guard and Reserve equipment, plus tactical air and missile defense, also fall under it."],
"HSAS02": ["Covers Defense Department policy for military personnel and their families, including military health care and retirement.", "The Uniform Code of Military Justice, commissaries, and schools for military dependents fall under it."],
"HSAS03": ["Deals with Defense Department policy on military readiness, training, logistics, and maintenance.", "Military construction, family housing, base closures, and energy also fall under it."],
"HSAS28": ["Handles Navy and Marine Corps shipbuilding, plus Air Force bomber, tanker, and airlift aircraft.", "Weapons launched from ships and submarines, Army vessels, and maritime policy also fall under it."],
"HSAS29": ["Covers Defense and Energy Department policy on nuclear weapons, strategic deterrence, arms control, and missile defense.", "Nuclear command and control systems and military space systems also fall under it."],
"HSAS26": ["Handles Defense Department policy on military and national intelligence, counterterrorism, and special operations forces.", "Countering weapons of mass destruction and security cooperation also fall under it."],
"HSAS35": ["Deals with Defense Department policy on artificial intelligence, cybersecurity, cyber operations, and information technology.", "Buying computer software, the electromagnetic spectrum, and defense-wide research also fall under it."],
"HSED": ["Handles education and labor laws, including wages and hours, child labor, and school meals.", "It also oversees how the Departments of Education and Labor are run."],
"HSED14": ["Handles education from early learning through high school, including special education and career and technical education.", "Head Start, school lunch programs, and child abuse prevention also fall under it."],
"HSED02": ["Deals with relations between employers and employees, including the National Labor Relations Act.", "Employee pensions and health benefits, and the Bureau of Labor Statistics, also fall under it."],
"HSED13": ["Handles higher education, student aid, apprenticeships, and workforce development beyond high school.", "Welfare reform, poverty programs, and the Older Americans Act also fall under it."],
"HSED10": ["Covers wage and hour laws like the Fair Labor Standards Act, workers' compensation, and family and medical leave.", "Worker safety and health, including mine safety, and equal employment opportunity also fall under it."],
"HSIF": ["Handles energy, health, consumer protection, communications, and trade between the states.", "House bills on public health, electric power, and communications go to it."],
"HSIF17": ["Handles interstate and foreign commerce, consumer protection and privacy, data security, and motor vehicle safety.", "The Federal Trade Commission and the Consumer Product Safety Commission fall under it."],
"HSIF16": ["Deals with electronic communications, including voice, video, and data sent by wire, wireless, broadcast, cable, or satellite.", "The Federal Communications Commission and National Telecommunications and Information Administration fall under it."],
"HSIF03": ["Handles national energy policy, including fossil, renewable, and nuclear energy, utilities, pipelines, and power transmission.", "The Department of Energy, Nuclear Regulatory Commission, and Federal Energy Regulatory Commission fall under it."],
"HSIF14": ["Covers private and public health insurance, including the Affordable Care Act, Medicare, Medicaid, and CHIP.", "The National Institutes of Health and the Centers for Disease Control fall under it."],
"HSIF02": ["Conducts oversight and investigations of any matter within the full Energy and Commerce Committee's reach.", "That reach includes health, consumer protection, energy, and interstate and foreign commerce."],
"HSIF18": ["Handles soil, air, noise, and water contamination, along with emergency environmental response.", "The Clean Air Act, the Safe Drinking Water Act, and Superfund fall under it."],
"HSSO": ["Applies the House's Code of Official Conduct to Members, officers, and staff.", "It may investigate a Member or staffer accused of breaking conduct rules."],
"HSBA": ["Handles banks, insurance, housing, securities markets, and money and credit.", "House bills on deposit insurance and federal monetary policy go to it."],
"HSBA16": ["Handles securities, exchanges, investment companies and advisers, and derivatives such as futures and options.", "The Securities and Exchange Commission and the Public Company Accounting Oversight Board fall under it."],
"HSBA04": ["Handles housing, homeless assistance, and insurance, including government programs that protect against flood, fire, and earthquake.", "Landlord and tenant rules, community development, and the Federal Housing Finance Agency fall under it."],
"HSBA09": ["Oversees and investigates the agencies, departments, and programs within the Financial Services Committee's reach.", "It checks that agencies stay within their legal authority, including when writing regulations."],
"HSBA20": ["Handles agencies that supervise financial institutions, including the Federal Reserve, Federal Deposit Insurance Corporation, and Comptroller of the Currency.", "Consumer credit, credit reporting, debt collection, and the Consumer Financial Protection Bureau fall under it."],
"HSBA21": ["Handles digital assets such as cryptocurrencies, stablecoins, and central bank digital currencies.", "Machine learning, artificial intelligence, and quantum computing technologies also fall under it."],
"HSBA10": ["Handles ways to detect and curb terrorist financing and money laundering, including sanctions and the Financial Crimes Enforcement Network.", "The International Monetary Fund, the Export-Import Bank, and coins and currency also fall under it."],
"HSFA": ["Handles U.S. relations with other nations, embassies, foreign loans, and export controls.", "House bills on declarations of war and the United Nations go to it."],
"HSFA16": ["Oversees the region handled by the State Department's Bureau of African Affairs.", "The U.S. Agency for International Development and the Millennium Challenge Corporation also fall under it."],
"HSFA05": ["Focuses on the area covered by the State Department's Bureau of East Asian and Pacific Affairs.", "The U.S. International Development Finance Corporation and economic, energy, and environment bureaus fall under it."],
"HSFA14": ["Covers the same region as the State Department's Bureau of European and Eurasian Affairs.", "Arms control bureaus and the Bureau of Cyberspace and Digital Policy also fall under it."],
"HSFA13": ["Oversees the same region as the State Department's Bureau of Near Eastern Affairs.", "It also covers the Bureau of Counterterrorism and bureaus under the Under Secretary for Management."],
"HSFA07": ["Focuses on the region of the State Department's Bureau of Western Hemisphere Affairs.", "Bureaus for civilian security, democracy, and human rights also fall under it."],
"HSFA17": ["Oversees the U.S. Mission to the United Nations and the Bureau of International Organizations Affairs.", "Offices reporting directly to the Secretary of State, and all special envoys, fall under it."],
"HSFA19": ["Covers the region of the State Department's Bureau of South and Central Asian Affairs.", "The Peace Corps and public diplomacy bureaus also fall under it."],
"HSHM": ["Handles homeland security policy and the Department of Homeland Security.", "House bills on border and port security, cybersecurity, and terrorism response go to it."],
"HSHM11": ["Oversees U.S. Customs and Border Protection, Immigration and Customs Enforcement, and U.S. Citizenship and Immigration Services.", "It covers border and port security on land, in the air, and at sea."],
"HSHM12": ["Oversees the Federal Emergency Management Agency, the Science and Technology Directorate, and the Office of Health Security.", "Homeland Security grant programs and emergency preparedness, response, and recovery fall under it."],
"HSHM08": ["Has oversight of the Cybersecurity and Infrastructure Security Agency and cybersecurity work across the Homeland Security Department.", "It focuses on protecting federal networks and working with non-federal owners of infrastructure."],
"HSHM05": ["Oversees the U.S. Secret Service, the Federal Protective Service, and the Office of Intelligence and Analysis.", "The Federal Law Enforcement Training Centers and protection of federal facilities fall under it."],
"HSHM09": ["Oversees Homeland Security headquarters, the Office of the Secretary, and the Office of Inspector General.", "It also looks at department contracts, purchasing, workforce, civil rights and liberties, and privacy."],
"HSHM07": ["Has oversight of the Transportation Security Administration and the United States Coast Guard.", "Security for airports, aircraft, mass transit, railroads, highways, and pipelines falls under it."],
"HSHA": ["Runs the House's own business: its accounts, staff, buildings, and the Congressional Record.", "House bills on federal elections and campaign contributions go to it."],
"HSHA27": ["Works on modernizing the House of Representatives and the Legislative Branch.", "It oversees modernization initiatives and evaluates new and emerging innovations."],
"HSII": ["Handles public lands, national parks, fisheries and wildlife, mining, and oceans.", "House bills on relations with Native American tribes and U.S. territories go to it."],
"HSII06": ["Handles fossil fuel, solar, and wind resources belonging to the United States, including offshore, plus mining.", "The Office of Surface Mining Reclamation and Enforcement and federal helium program fall under it."],
"HSII10": ["Handles the National Park System, wilderness areas, national trails, and public lands in general.", "National monuments, historic sites, and the Land and Water Conservation Fund Act fall under it."],
"HSII13": ["Handles water resources, irrigation and reclamation projects, fisheries, and protection of coasts and oceans.", "The Endangered Species Act and the U.S. Fish and Wildlife Service fall under it."],
"HSII24": ["Handles the federal trust responsibility to Native Americans, relations with tribes, and management of Indian lands.", "Native Alaskans, Native Hawaiians, U.S. insular areas, and the Freely Associated States fall under it."],
"HSII15": ["Has oversight and investigative authority over all activities, policies, and programs in the Natural Resources Committee's reach.", "That reach includes fisheries and wildlife, national parks, and Native Americans."],
"HSGO": ["Oversees how the federal government is run, including its workforce, buying, and records.", "House bills on postal service, the Census, and District of Columbia matters go to it."],
"HSGO24": ["Handles bills and oversight on the Postal Service, federal buying, emergency management, public records, and the National Archives.", "It also covers how the federal government relates to states, cities, and towns."],
"HSGO06": ["Oversees national security, foreign operations, and U.S. borders and immigration.", "It shares its border and immigration oversight with the Federal Law Enforcement subcommittee."],
"HSGO27": ["Oversees federal health care policy, food and drug safety, entitlement programs, banking, monetary policy, and tax policy.", "It can also handle bills on the Office of National Drug Control Policy."],
"HSGO05": ["Handles bills and oversight on regulations, labor policies, and barriers to economic growth and job creation.", "Its scope also includes federal paperwork reduction, population studies, and unfunded mandates."],
"HSGO12": ["Works on information security, including cybersecurity and privacy, through both bills and oversight.", "It also covers information technology management and innovation across the federal government."],
"HSGO16": ["Oversees the federal civil service, including pay, job classification, and benefits for federal workers.", "Its scope also includes disposing of federal property, government reorganizations, and grants management."],
"HSGO33": ["Oversees homeland security, criminal justice, and how federal laws and regulations are enforced.", "It shares oversight of U.S. borders and immigration with the Military and Foreign Affairs subcommittee."],
"HSRU": ["Sets the House's rules and its order of business.", "It also handles recesses and final adjournments of Congress."],
"HSRU02": ["Handles Rules Committee matters on relations between Congress and the executive branch.", "Its work on these relations notably includes the budget process."],
"HSRU04": ["Covers Rules Committee matters on House procedures and the internal operations of the House.", "It also covers relations between the House and Senate, and between Congress and the courts."],
"HSSY": ["Handles federal science research, the space agency NASA, the National Science Foundation, and the Weather Service.", "House bills on energy research and the national energy labs go to it."],
"HSSY20": ["Covers energy research, development, and demonstration, along with nuclear, solar, and renewable energy and clean coal technology.", "Its scope includes Department of Energy laboratories, science activities, and cybersecurity."],
"HSSY21": ["Can investigate any matter the Science, Space, and Technology Committee covers.", "That committee's subjects include all energy research and the National Aeronautics and Space Administration."],
"HSSY16": ["Covers national space policy, space and aviation research, and the National Aeronautics and Space Administration and its labs.", "Its scope includes commercial space activity, space law, and Federal Aviation Administration research programs."],
"HSSY18": ["Deals with environmental research and standards, including Environmental Protection Agency research and climate change research.", "The National Oceanic and Atmospheric Administration, including weather services and marine fisheries, falls under it."],
"HSSY15": ["Covers science policy, the National Science Foundation, and science, technology, engineering, and math education.", "Its scope includes the National Institute of Standards and Technology and artificial intelligence policy."],
"HSSM": ["Handles help for small businesses, including financial aid and less paperwork, and their share of federal contracts.", "House bills on small business aid and federal contracting go to it."],
"HSSM23": ["Reviews the federal buying system, including programs that help small businesses sell goods and services to the government.", "It also reviews opportunities for small businesses in rebuilding and modernizing infrastructure."],
"HSSM24": ["Examines the burden federal agency rules place on small businesses and how to ease it.", "It also checks how efficiently programs that affect small businesses run, including the SBA."],
"HSSM27": ["Studies how financial markets and federal programs help small businesses and entrepreneurs get the capital they need.", "It also examines how federal tax policies affect small businesses."],
"HSSM21": ["Takes up issues of rural business growth, energy independence, and how small businesses compete in a global marketplace.", "It also reviews how supply chain disruptions affect small businesses."],
"HSSM22": ["Looks at how innovation and advanced technology help small businesses grow and create jobs.", "It also reviews workforce issues that affect how small businesses find and keep qualified workers."],
"HSPW": ["Handles roads, rail, aviation, ports, and waterways, and federal buildings and disaster management.", "House bills on the Coast Guard, flood control, and water pollution go to it."],
"HSPW05": ["Covers civil aviation, including safety, air traffic control, and all Federal Aviation Administration programs except research.", "Its scope includes the National Transportation Safety Board, which investigates transportation accidents."],
"HSPW07": ["Oversees the U.S. Coast Guard and handles ocean shipping rules and the merchant marine, apart from national security.", "The Coast Guard missions it oversees include search and rescue, icebreaking, and oil spill response."],
"HSPW13": ["Oversees federal emergency and disaster programs, including the Federal Emergency Management Agency, plus federal buildings and courthouses.", "Its economic development scope includes the Economic Development Administration and Great Lakes Regional Commission."],
"HSPW12": ["Handles national surface transportation policy, including building and improving highways and transit, and commercial vehicle rules.", "It covers the Federal Highway, Federal Transit, and National Highway Traffic Safety administrations."],
"HSPW14": ["Deals with railroad safety and economic rules, pipeline safety, and the transportation of hazardous materials.", "Its scope includes Amtrak, the Federal Railroad Administration, and railroad retirement benefits."],
"HSPW02": ["Handles water resources, water pollution control, water infrastructure, and cleanup of hazardous waste.", "Agencies in its scope include the Army Corps of Engineers and the Environmental Protection Agency."],
"HSVR": ["Handles veterans' compensation, hospitals and medical care, pensions, education, and cemeteries.", "House bills on veterans' measures generally go to it under House Rule X."],
"HSVR09": ["Handles veterans' compensation, war pensions, government life insurance for service members, burial benefits, and veterans' cemeteries.", "It covers the Board of Veterans' Appeals and the Court of Appeals for Veterans Claims."],
"HSVR10": ["Handles veterans' education, job training and employment, vocational rehabilitation, and housing programs, including housing for homeless veterans.", "It also covers service members' move to civilian life and veteran-owned businesses."],
"HSVR03": ["Covers the Veterans Health Administration, including its medical services, medical support, and medical facilities.", "Medical and prosthetic research and construction projects also fall under it."],
"HSVR08": ["Oversees and investigates veterans' matters in general, along with information technology and purchasing.", "The full committee's chair can send it more matters to investigate and bills to handle."],
"HSVR11": ["Covers the Department of Veterans Affairs' programs to modernize its technology, plus cybersecurity and data management.", "Its scope includes the Electronic Health Record Modernization program."],
"HSWM": ["Handles taxes, tariffs and trade deals, and Social Security.", "House bills on taxes and tariffs go to it under House Rule X."],
"HSWM02": ["Handles Ways and Means bills on programs that pay for health care, health delivery systems, or health research.", "It covers the Social Security Act's health care programs and tax breaks for health costs."],
"HSWM03": ["Handles public assistance bills, including temporary assistance for needy families, child care, child support, foster care, and adoption.", "Bills on unemployment compensation, including extended and emergency benefits, also go to it."],
"HSWM06": ["Oversees existing law in every area the Ways and Means Committee covers.", "It shares this oversight with the other subcommittees, and with the full committee on taxes."],
"HSWM05": ["Handles tax bills that the chair of the full Ways and Means Committee sends to it.", "Ways and Means alone can start federal tax bills on individuals, families, businesses, and nonprofits."],
"HSWM01": ["Handles bills on Social Security old-age, survivors, and disability insurance, and the Railroad Retirement System.", "It also covers the employment taxes and trust funds tied to these systems."],
"HSWM04": ["Takes up bills on customs, tariffs, imports, and trade agreements with other countries.", "Its scope includes budget authorizations for the U.S. Trade Representative and U.S. International Trade Commission."],
"HSBU": ["Handles the congressional budget resolution and the federal budget process.", "It also handles special controls over the federal budget, under House Rule X."],
"HSJU": ["Handles federal courts, crime laws, civil liberties, immigration policy, and constitutional amendments.", "House bills on patents, copyrights, and monopolies go to it."],
"HSJU10": ["Covers constitutional rights and amendments, federal civil rights, and voting rights.", "It also handles claims against the United States, ethics in government, and federal charters."],
"HSJU03": ["Deals with how the federal courts are run, court rules on evidence and procedure, and judicial ethics.", "It also handles copyright, patent, and trademark law, and information technology."],
"HSJU08": ["Handles federal criminal law, federal prosecutors, drug enforcement, sentencing, and prisons.", "It also covers how federal law enforcement uses surveillance tools."],
"HSJU01": ["Deals with immigration and naturalization, border security, refugee admissions, and enforcement away from the border.", "It also takes up private immigration bills, claims against the United States, and treaties."],
"HSJU05": ["Covers bankruptcy and commercial law, administrative law, and antitrust matters.", "Its scope also includes bankruptcy judgeships, independent counsel, and state taxes affecting interstate commerce."],
"HSJU13": ["Looks at whether agencies and departments respond to oversight requests from the Judiciary Committee and its subcommittees.", "It also covers how agencies' congressional liaison and legislative affairs offices operate."],
"HLIG": ["Handles the Central Intelligence Agency, the national intelligence director, and other agencies' intelligence work.", "House bills authorizing money for intelligence agencies go to it under House Rule X."],
"HLIG09": ["Oversees all matters the full Intelligence Committee covers, sharing that role with the relevant subcommittees.", "It receives and reviews whistleblower complaints about waste, fraud, or abuse by the Intelligence Community."],
"HLIG01": ["Handles bills and oversight on the Central Intelligence Agency's programs, policies, budget, and operations.", "It also oversees all covert actions of the Intelligence Community."],
"HLIG02": ["Covers the programs, policies, budget, and operations of the National Security Agency, through bills and oversight.", "Its scope includes U.S. Cyber Command intelligence activities and all Intelligence Community cyber intelligence."],
"HLIG04": ["Oversees Department of Defense intelligence, including the Defense Intelligence Agency and the military services' intelligence units.", "Its scope includes the National Reconnaissance Office and activities funded by the Military Intelligence Program."],
"HLIG06": ["Covers the Office of the Director of National Intelligence and intelligence units in departments including Justice and Treasury.", "Its scope also includes U.S. persons' privacy and civil liberties and all domestic intelligence activities."],
"HLIG11": ["Oversees the programs and policies of the Intelligence Community's open-source intelligence work.", "It also handles legislation on this work, including authorizing its budget."],
"HSZS": ["Investigates the Chinese Communist Party's economic, technological, and security progress and its competition with the United States.", "It has no power over bills and makes policy recommendations."],
"HSQJ": ["Investigates the events surrounding January 6, 2021, and issues a final report.", "It covers Judiciary Committee matters and may not mark up bills."],
"JCSE": ["Monitors compliance with the Helsinki Accords and promotes human rights and democracy in the OSCE region.", "It is an independent commission of the federal government."],
"JSLC": ["Oversees the Library of Congress, the Botanic Garden, Statuary Hall, and art in the Capitol.", "Its chair alternates between the House and the Senate with each Congress."],
"JSPR": ["Oversees the Government Publishing Office, which prints for Congress and federal agencies.", "It checks that agencies follow rules meant to keep printing costs down."],
"JSTX": ["Studies how federal taxes work and how the Internal Revenue Service runs them.", "It reports its findings to the Finance and Ways and Means committees."],
"JSEC": ["Studies the President's Economic Report and ways to coordinate federal economic programs.", "Each year it reports its findings to the House and Senate as a guide."],
"SSAF": ["Handles farm policy, food stamps, school meals, forests, and rural development.", "Senate bills on crop insurance, farm credit, and pesticides go to it."],
"SSAF13": ["Oversees farm commodity programs, crop insurance, farm trade, and derivatives and digital assets.", "Its related agencies include the Commodity Futures Trading Commission and the Farm Service Agency."],
"SSAF14": ["Oversees conservation programs, forest management, natural resources, pesticides, and agricultural biotechnology.", "Related agencies include the Forest Service and an Environmental Protection Agency chemical safety office."],
"SSAF15": ["Deals with rural development loans and grants, renewable energy, and farm loan programs.", "The Farm Credit Administration and the Rural Utilities Service are among its related agencies."],
"SSAF16": ["Covers food and nutrition aid, school meals, international food aid, specialty crops, organic production, and research.", "Linked agencies include Food, Nutrition, and Consumer Services and the Agricultural Marketing Service."],
"SSAF17": ["Oversees the production and marketing of livestock, poultry, and dairy, along with food safety and security.", "Its related agencies include the Office of Homeland Security and food safety agencies at USDA."],
"SSAP": ["Handles the bills that pay for the federal government, and canceling money already set aside.", "Senate bills that appropriate federal money go to it under Senate Rule XXV."],
"SSAP16": ["Handles government funding for the Departments of Commerce and Justice and related agencies.", "It covers the Federal Bureau of Investigation, the Census Bureau, and the National Science Foundation."],
"SSAP22": ["Deals with government funding for the Department of Energy, the Corps of Engineers, and the Bureau of Reclamation.", "Its scope also takes in the Nuclear Regulatory Commission and the Strategic Petroleum Reserve."],
"SSAP23": ["Handles government funding for the Treasury Department and the Executive Office of the President.", "It also covers the federal courts, the Internal Revenue Service, and the Federal Election Commission."],
"SSAP14": ["Deals with government funding for the Department of Homeland Security, including disaster relief and flood insurance.", "Covered agencies include the Federal Emergency Management Agency, the Coast Guard, and the Secret Service."],
"SSAP17": ["Handles government funding for the Department of the Interior and the Environmental Protection Agency.", "Agencies include the Forest Service, the National Park Service, and the Indian Health Service."],
"SSAP18": ["Covers government funding for the Departments of Labor, Health and Human Services, and Education.", "Within Health and Human Services, it does not cover the Food and Drug Administration."],
"SSAP19": ["Handles government funding for the Department of Veterans Affairs and military family housing and construction.", "The Armed Forces Retirement Home and the American Battle Monuments Commission are also included."],
"SSAP20": ["Handles government funding for the Department of State and the United States Agency for International Development.", "It also covers refugee aid, the Export-Import Bank, and contributions to the United Nations."],
"SSAP24": ["Deals with government funding for the Departments of Transportation and Housing and Urban Development.", "Its scope includes the Federal Transit Administration, the Federal Aviation Administration, and fair housing."],
"SSAP01": ["Handles government funding for the Food and Drug Administration and the Department of Agriculture, except the Forest Service.", "It covers the Supplemental Nutrition Assistance Program, child nutrition programs, and rural housing."],
"SSAP02": ["Covers government funding for the Department of Defense, including the Army, Navy, Air Force, and Marine Corps.", "It also covers the Central Intelligence Agency, the National Security Agency, and missile defense."],
"SSAP08": ["Covers government funding for the Senate, the House of Representatives, and the Library of Congress.", "It also covers the Capitol Police, the Congressional Budget Office, and the Government Accountability Office."],
"SSAS": ["Handles the Department of Defense, the armed forces, and the common defense.", "Senate bills on military pay and benefits, the draft, and military research go to it."],
"SSAS14": ["Covers Army and Air Force planning and operations, plus National Guard and Reserve planning and equipment.", "It oversees Army and Air Force budget accounts for research, testing, and purchasing."],
"SSAS20": ["Handles policies on science and technology, special operations, intelligence, counterterrorism, and homeland defense.", "It oversees U.S. Special Operations Command, the National Security Agency, and the Defense Intelligence Agency."],
"SSAS17": ["Handles policies for military and Defense Department civilian workers, military pay and benefits, and military health care.", "Military nominations are in its scope, and it oversees the Defense Health Agency."],
"SSAS15": ["Deals with military readiness, including training, logistics, and maintenance, plus military construction and base closures.", "It oversees U.S. Transportation Command, the Defense Logistics Agency, and the Defense Contract Audit Agency."],
"SSAS13": ["Covers Navy and Marine Corps planning, operations, and programs, plus maritime issues.", "It oversees Navy and Marine Corps purchasing, research, and the National Defense Sealift Fund."],
"SSAS16": ["Covers nuclear and strategic forces, arms control, space programs, and ballistic missile defense.", "It oversees the National Nuclear Security Administration, U.S. Space Command, and the Space Force."],
"SSAS21": ["Handles policies and programs for cyber forces and capabilities, including combating cyber threats and attacks.", "It oversees U.S. Cyber Command and the cyber capabilities of Defense Department commands and agencies."],
"SSBK": ["Handles banks, housing, urban mass transit, the Federal Reserve, and export controls.", "Senate bills on deposit insurance and federal monetary policy go to it."],
"SSBK12": ["Covers economic growth, employment, price stability, and the monetary policy work of the Federal Reserve System.", "Its scope also includes flood insurance, disaster assistance, and small business lending."],
"SSBK05": ["Handles export and foreign trade promotion, export controls, export financing, and international economic policy.", "The Export-Import Bank and the Defense Production Act fall within its scope."],
"SSBK04": ["Deals with securities, annuities, financial markets and exchanges, financial derivatives, accounting standards, and insurance.", "Its scope includes Fannie Mae, Freddie Mac, and government securities."],
"SSBK09": ["Handles urban mass transit, urban development, affordable housing, and reducing foreclosures.", "It covers the Federal Transit Administration, the Rural Housing Service, and nursing home construction."],
"SSBK08": ["Deals with banks, savings associations, credit unions, deposit insurance, and the Federal Home Loan Bank System.", "It covers the Consumer Financial Protection Bureau and the Federal Reserve's regulatory work."],
"SSBK13": ["Deals with digital assets like cryptocurrencies and stablecoins, plus their issuers, trading and lending platforms, and custody providers.", "Its scope includes how the Treasury Department and the Federal Reserve regulate digital assets."],
"SSCM": ["Handles interstate commerce, communications, consumer products, highway safety, science, and the Coast Guard.", "Senate bills on railroads, trucking, civil aviation, and pipelines go to it."],
"SSCM33": ["Covers civil aviation, including safety, security, airspace, and consumer protection, plus national and civil space policy.", "It oversees the Federal Aviation Administration and the National Aeronautics and Space Administration."],
"SSCM34": ["Covers all kinds of communications, including phone, television, cable, satellite, broadband, and radio.", "It oversees the Federal Communications Commission and the Corporation for Public Broadcasting."],
"SSCM35": ["Handles consumer affairs, product safety, product liability, consumer privacy, data security, and sports-related matters.", "It oversees the Federal Trade Commission and the U.S. Olympic and Paralympic Committee."],
"SSCM36": ["Deals with oceans, coasts, and inland waterways, including coastal zone management, marine fisheries, and weather.", "It oversees the U.S. Coast Guard and the Great Lakes St. Lawrence Seaway Development Corporation."],
"SSCM37": ["Covers science, technology, engineering, and math research, standards and measurement, tourism, trade, manufacturing, and exports.", "It oversees the National Science Foundation and the National Institute of Standards and Technology."],
"SSCM38": ["Covers surface transportation policy, with oversight of agencies for motor carriers, railroads, and pipelines.", "Its oversight reaches Amtrak, the Surface Transportation Board, and the National Highway Traffic Safety Administration."],
"SSEG": ["Handles energy policy, public lands and forests, national parks, and mining.", "Senate bills on oil and gas production and hydroelectric power go to it."],
"SSEG07": ["Deals with irrigation, reclamation projects, groundwater, hydroelectric power, and how energy development affects water.", "It covers the power marketing administrations, such as Bonneville Power and Southwestern Power."],
"SSEG04": ["Oversees the National Park System, wild and scenic rivers, national trails, recreation areas, and historic sites.", "It also handles the Land and Water Conservation Fund and military parks and battlefields."],
"SSEG01": ["Deals with nuclear fuel cycle policy, oil and natural gas regulation, refinery policy, and new technologies like solar.", "Its scope includes the Energy Department's national laboratories and the Strategic Petroleum Reserve."],
"SSEG03": ["Oversees public lands run by the Bureau of Land Management and Forest Service, including grazing and wilderness areas.", "It also handles mining policy, federal mineral leasing, and Outer Continental Shelf leasing."],
"SSEV": ["Handles air and water pollution, highways, public works, and fisheries and wildlife.", "Senate bills on dams, flood control, and solid waste go to it."],
"SSEV10": ["Deals with air pollution, the Clean Air Act, indoor air, and nuclear plant safety.", "The Nuclear Regulatory Commission and the Tennessee Valley Authority are part of its scope."],
"SSEV09": ["Covers the Superfund and Brownfields programs, solid waste and recycling, and the Toxic Substances Control Act.", "It oversees and investigates the full committee's agencies on issues like mismanaged federal funds."],
"SSEV08": ["Handles highway construction and maintenance, public works, bridges, dams, and public buildings of the United States.", "Its scope includes the Army Corps of Engineers civil works and the Economic Development Administration."],
"SSEV15": ["Covers the U.S. Fish and Wildlife Service, the Endangered Species Act, wildlife refuges, and invasive species.", "It also handles the Clean Water Act, including wetlands, and the Safe Drinking Water Act."],
"SSFI": ["Handles taxes, tariffs and trade deals, Social Security, and health programs under the Social Security Act.", "Senate bills on taxes and the national debt go to it under Senate Rule XXV."],
"SSFR": ["Handles U.S. relations with other nations, foreign aid, treaties, and the diplomatic service.", "Senate bills on declarations of war and the United Nations go to it."],
"SSFR01": ["Handles U.S. relations with the countries of Europe, the European Union, and the North Atlantic Treaty Organization.", "It also has global responsibility for regional security cooperation."],
"SSFR09": ["Deals with U.S. relations with African countries, apart from North Africa, and with groups like the African Union.", "Worldwide, it handles health policy, including disease outbreaks and the response to them."],
"SSFR02": ["Handles U.S. ties with East Asia, the Pacific, and groups like the Association of South East Asian Nations.", "It holds global responsibility for international cybersecurity and space policy."],
"SSFR07": ["Deals with U.S. relations with the Middle East, North Africa, South Asia, and Central Asia.", "Across the globe, it is responsible for counterterrorism matters."],
"SSFR06": ["Handles U.S. relations with the Western Hemisphere, including Canada, Mexico, Central and South America, and the Caribbean.", "Worldwide, it covers human trafficking, democracy, human rights, and global women's issues."],
"SSFR15": ["Oversees U.S. contributions to international organizations, including the U.N., and multilateral development policy.", "It also covers international monetary policy, trade, investment, and energy and environmental policy."],
"SSFR14": ["Covers management and operations of the State Department, USAID, the Millennium Challenge Corporation, and the Peace Corps.", "It is responsible for reviewing the budgets of the State Department and USAID."],
"SSHR": ["Handles health, education, labor, and public welfare, including pensions and student loans.", "Senate bills on public health, wages, and workplace safety go to it."],
"SSHR11": ["Covers employment issues, including workforce education and training, wage and hour laws, and workplace flexibility.", "Worker health and safety also falls under its jurisdiction."],
"SSHR12": ["Has jurisdiction over health issues like substance abuse, mental health, oral health, and health care disparities.", "It also covers private retirement plans, railroad retirement, and the Pension Benefit Guaranty Corporation."],
"SSHR09": ["Covers Head Start, child care, child support, the Family Medical Leave Act, and National Service.", "Health care for women and children is also part of its jurisdiction."],
"SSGA": ["Oversees how the federal government is run, including its workforce, records, and the Postal Service.", "Senate bills on the Census, federal pay, and District of Columbia affairs go to it."],
"SSGA01": ["Studies and investigates how efficiently and economically all branches of the government operate.", "It also investigates investment fraud, computer fraud, and the use of offshore banking for crime."],
"SLIA": ["Studies issues facing American Indian, Native Hawaiian, and Alaska Native peoples and proposes laws.", "Every Senate bill specifically about these peoples is in its jurisdiction."],
"SSRA": ["Handles the Senate's rules and buildings, federal elections, and the Congressional Record.", "Senate bills on federal elections, including for President, go to it."],
"SSSB": ["Handles the Small Business Administration and studies problems facing small businesses.", "Senate bills about the Small Business Administration go to it under Senate Rule XXV."],
"SSVA": ["Handles veterans' compensation, hospitals and medical care, pensions, education, and national cemeteries.", "Senate bills on veterans' measures generally go to it under Senate Rule XXV."],
"SSBU": ["Handles the congressional budget resolution and studies how laws affect federal spending.", "It also reviews the work of the Congressional Budget Office."],
"SSJU": ["Handles federal courts and judges, civil and criminal cases, immigration, civil liberties, and constitutional amendments.", "Senate bills on patents, copyrights, and monopolies go to it."],
"SSJU21": ["Covers constitutional amendments, constitutional rights, civil rights and civil liberties, and the separation of powers.", "It oversees the Civil Rights Division at the Department of Justice."],
"SSJU22": ["Covers criminal justice, victims' rights, youth violence, corrections and reentry, parole, and anti-terrorism policy.", "It oversees the Federal Bureau of Investigation, the Bureau of Prisons, and the Secret Service."],
"SSJU01": ["Covers antitrust law and competition policy, including the Sherman, Clayton, and Federal Trade Commission Acts.", "It oversees antitrust enforcement at the Justice Department and the Federal Trade Commission."],
"SSJU04": ["Deals with immigration, citizenship, and refugee laws, and international migration policy.", "It oversees Citizenship and Immigration Services, Customs and Border Protection, and Immigration and Customs Enforcement."],
"SSJU25": ["Covers how federal courts are run, rules of evidence and procedure, new courts and judgeships, and bankruptcy.", "It also oversees Justice Department grant programs and government waste and abuse."],
"SSJU26": ["Deals with patents, copyrights, trademarks, and trade secrets.", "Its jurisdiction includes the United States Patent and Trademark Office and the Copyright Office."],
"SSJU28": ["Oversees laws on how the private sector and the government collect, protect, use, and share personal information.", "It also covers digital safety, civil liberties, and platform accountability issues raised by technology."],
"SLET": ["Gives ethics advice to senators and staff and runs the Senate's financial disclosure program.", "It investigates claims of misconduct by senators, officers, or employees."],
"SLIN": ["Oversees and studies the intelligence activities and programs of the U.S. government.", "It checks that intelligence work follows the Constitution and the law."],
"SPAG": ["Studies matters relating to older Americans and conducts oversight of programs.", "As a special committee, it has no legislative authority but can recommend legislation."],
"SCNC": ["Monitors U.S. and international efforts against drug abuse and narcotics trafficking.", "It has the status of a standing committee and holds hearings on drug policy."]
};
/* US-TEXT-END */

/* ---------- the committee lines and the official words: loaded once, the first time a committee, a subcommittee, a role's official
   words, or a text view needs them (never when the app opens). The hosted site serves them; the offline file has no United States map. */
const CX_USX = { v: null, p: null, subs: new Set() };
function cxUsxLoad() {
  if (!CX_USX.p) {
    const web = typeof fetch === `function` && /^https?:$/.test(String(globalThis.location?.protocol || ``));
    CX_USX.p = (web ? fetch(`/us/explainers-2026.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null) : Promise.resolve(null))
      .then((d) => { CX_USX.v = d && d.committees ? d : { none: !0, committees: {}, lines: {}, roles: {}, process: {} }; CX_USX.subs.forEach((f) => f()); return CX_USX.v; });
  }
  return CX_USX.p;
}
/* the loaded file, or null while it loads; want: start loading now (a view that shows committees), or only listen (a view that may) */
function useCxUsx(want = !0) {
  const [, bump] = u.useState(0);
  u.useEffect(() => { const f = () => bump((n) => n + 1); CX_USX.subs.add(f); if (want) cxUsxLoad(); return () => { CX_USX.subs.delete(f); }; }, [want]);
  return CX_USX.v;
}
/* the "what it does" line of a committee or subcommittee, by the record's id, once loaded; "" when there is none */
function cxUsxWhat(id) { const L = CX_USX.v && CX_USX.v.lines && CX_USX.v.lines[id]; return L ? L[0] : ``; }
/* which note a word from the record opens: "Chairman" and "chairman" open the Chair note; a word that is not a committee role opens none */
function cxUsxRoleKey(word) {
  const w = String(word || ``).trim().toLowerCase().replace(/^member, ex officio$/, `ex officio`);
  for (const [k, v] of Object.entries(CX_US_ROLE_TEXT)) if (v.words.some((x) => x.toLowerCase() === w)) return k;
  return null;
}
/* the sentence under our lines: whose words they are, which Congress the official text is from, and whether a person has read them */
function cxUsxReviewLine(X) {
  const cong = cxOrd((X && X.congress) || 119);
  return CX_US_TEXT_REVIEW.ok ? `Our plain words, read against the official text by ${CX_US_TEXT_REVIEW.by} on ${CX_US_TEXT_REVIEW.checked}. The official text is for the ${cong} Congress.`
    : `Our plain words, from official text for the ${cong} Congress. A person has not reviewed them yet.`;
}

/* the short form, for small places (the hover card, a role's note) */
function cxUsxShortReview() {
  return CX_US_TEXT_REVIEW.ok ? `Our plain words, read against the official text by ${CX_US_TEXT_REVIEW.by} on ${CX_US_TEXT_REVIEW.checked}.` : `Our plain words. A person has not reviewed them yet.`;
}

/* a word from the record (Chair, Chairman, Ranking Member, Ex officio, Member...) as a button that opens what the post means */
function CX_UsxRoleBtn({ word, onRole, cls = `` }) {
  const key = cxUsxRoleKey(word);
  if (!key || !onRole) return <b className={cls}>{word}</b>;
  return <button type="button" className={`usx-role ${cls}`} aria-haspopup="dialog" onClick={(e) => onRole(key, word, e.currentTarget)}>{word}</button>;
}

/* the official words of one row (or role), folded under our lines, with the source, the part of it, the day pulled, and the Congress */
function CX_UsxSrc({ t, congress }) {
  return (
    <p className="usx-src">
      <span>From </span>{t.url ? <a href={t.url} target="_blank" rel="noreferrer" data-no-translate="" lang="en">{t.cite}<span className="sp-ext"> (opens in a new tab)</span></a> : <span data-no-translate="" lang="en">{t.cite}</span>}
      {t.pulled && <><span>, pulled </span><span>{cxVoteDate(t.pulled)}</span></>}<span>.</span>
      {congress ? <span>{` For the ${cxOrd(congress)} Congress.`}</span> : null}
    </p>
  );
}
function CX_UsxQuote({ text }) {
  return <div className="usx-quote" lang="en" data-no-translate="">{String(text).split(`\n`).map((l, k) => <p key={k}>{l}</p>)}</div>;
}
function CX_UsxOfficial({ row, open, label, congress }) {
  return (
    <details className="usx-official" open={open || undefined}>
      <summary>{label}</summary>
      <CX_UsxQuote text={row.text} />
      <CX_UsxSrc t={row} congress={congress} />
      {row.rule_note && <><CX_UsxQuote text={row.rule_note.text} /><CX_UsxSrc t={{ ...row, cite: row.rule_note.cite }} /></>}
    </details>
  );
}

/* What it does and why it matters, for a committee or subcommittee (by the record's id), then the official words one tap down.
   No line where none could be grounded: then the official words show, or "No description on file". */
function CX_UsxLines({ id, kind = `committee`, onHow, short }) {
  const X = useCxUsx();
  if (!X) return <p className="usx-wait" role="status">Loading what it does...</p>;
  if (X.none) return null;
  const row = X.committees[id], ln = X.lines[id];
  const label = kind === `sub` ? `The subcommittee's own words` : `The committee's own words`;
  return (
    <div className={`usx ${short ? `usx-short` : ``}`} data-usx={id}>
      {ln && (
        <dl className="usx-lines">
          <div><dt>What it does</dt><dd className="usx-what">{ln[0]}</dd></div>
          <div><dt>Why it matters</dt><dd className="usx-why">{ln[1]}</dd></div>
        </dl>
      )}
      {(!row || !row.text) && <p className="usx-none">No description on file.</p>}
      {ln && <p className="usx-review">{cxUsxReviewLine(X)}</p>}
      {row && row.text && <CX_UsxOfficial row={row} open={!ln} label={label} congress={row.congress} />}
      {onHow && <button type="button" className="usm-btn usx-how" onClick={onHow}>How a committee works</button>}
    </div>
  );
}

/* What a committee role means: our two lines, that Chair, Chairman, and Chairwoman are one post, and the official words one tap down */
function CX_UsxRoleBody({ rkey }) {
  const R = CX_US_ROLE_TEXT[rkey], [want, setWant] = u.useState(!1), X = useCxUsx(want);
  const texts = X && X.roles && X.roles[rkey] ? X.roles[rkey].texts.filter((t) => t.text) : [];
  return (
    <div className="usx" data-usx-role={rkey}>
      <dl className="usx-lines">
        <div><dt>What it does</dt><dd className="usx-what">{R.what}</dd></div>
        <div><dt>Why it matters</dt><dd className="usx-why">{R.why}</dd></div>
      </dl>
      {R.same && <p className="usx-same">{R.same}</p>}
      <p className="usx-review">{cxUsxShortReview()}</p>
      <details className="usx-official" onToggle={(e) => { if (e.currentTarget.open) setWant(!0); }}>
        <summary>The official words</summary>
        {!X && want && <p className="usx-wait" role="status">Loading the official words...</p>}
        {X && !texts.length && <p className="usx-none">The official words need the hosted site.</p>}
        {texts.map((t, k) => <u.Fragment key={k}><CX_UsxQuote text={t.text} /><CX_UsxSrc t={t} /></u.Fragment>)}
      </details>
    </div>
  );
}

/* "How a committee works", a story in the story engine's shape (ext/cx-story.jsx): a step each screen, tap the right side or press the
   arrow keys to go on, Read as text, and a source on every step. It opens over the map from a committee's sheet. */
function cxUsxHowStory(X) {
  const P = (X && X.process) || {};
  const src = (step) => { const t = (P[step] || []).find((r) => r.text); return t ? { label: t.cite, url: t.url } : null; };
  return { id: `us-committee`, label: `Committees`, ini: `CW`, name: CX_US_HOW_TEXT.name, when: CX_US_HOW_TEXT.when,
    source: { label: `House Rule X, clause 1`, url: `https://www.govinfo.gov/content/pkg/CDOC-118hdoc187/html/CDOC-118hdoc187.htm` },
    frames: CX_US_HOW_TEXT.frames.map((f) => ({ k: f.k, big: f.big, small: f.small, src: src(f.step) })) };
}
function CX_UsxStory({ onClose }) {
  const X = useCxUsx();
  const s = u.useMemo(() => cxUsxHowStory(X), [X]);
  const [f, setF] = u.useState(0), [asText, setAsText] = u.useState(!1);
  const ref = u.useRef(null);
  const fr = s.frames[f], last = f >= s.frames.length - 1;
  const next = () => { if (!last) setF(f + 1); else onClose(); };
  const prev = () => { if (f > 0) setF(f - 1); };
  u.useEffect(() => { const b = ref.current && ref.current.querySelector(`.cxm-story-head > button`); if (b) b.focus({ preventScroll: !0 }); }, []);
  const onKey = (e) => {
    if (e.target.closest && e.target.closest(`a, input, select, textarea`)) return;
    if (e.key === `ArrowRight`) { e.preventDefault(); next(); } else if (e.key === `ArrowLeft`) { e.preventDefault(); prev(); }
  };
  return (
    <div className="cxm usx-story cxm-story-uswrap" ref={ref} onKeyDown={onKey}>
      <div className="cxm-overlay cxm-story cxm-story-us" role="dialog" aria-modal="true" aria-label={`${s.name} story`}>
        <div className="cxm-bars">{s.frames.map((_, k) => <i key={k} className={k <= f ? `on` : ``} />)}</div>
        <div className="cxm-story-head">
          <span className="cxm-story-who"><span aria-hidden="true">{s.ini}</span><span><strong>{s.name}</strong><small>{cxTight(s.when)}</small></span></span>
          <button type="button" aria-label="Close story" onClick={onClose}><CXI.X size={22} /></button>
        </div>
        <div className="cxm-story-bar2"><button type="button" className="cxm-story-text" aria-pressed={asText} onClick={() => setAsText(!asText)}>{asText ? `Back to the story` : `Read as text`}</button></div>
        <p className="cxm-sr" aria-live="polite" aria-atomic="true">{asText ? `` : `${fr.k}. ${fr.big} ${fr.small}`}</p>
        {asText && (
          <div className="cxm-story-all">
            <ol>{s.frames.map((x, n) => <li key={n}><span className="cxm-kicker">{x.k}</span><p className="cxm-story-big">{cxTight(x.big, !0)}</p><p className="cxm-story-small">{cxTight(x.small)}</p>{x.src ? <CxSource source={x.src} cls="cxm-story-src2" /> : null}</li>)}</ol>
          </div>
        )}
        {!asText && (
          <div className="cxm-story-body">
            <div key={f} className="cxm-rise">
              <span className="cxm-kicker">{fr.k}</span>
              <p className="cxm-story-big">{cxTight(fr.big, !0)}</p>
              <p className="cxm-story-small">{cxTight(fr.small)}</p>
            </div>
            <button type="button" className="cxm-tap cxm-tap-l" aria-label="Previous" onClick={prev} />
            <button type="button" className="cxm-tap cxm-tap-r" aria-label="Next" onClick={next} />
          </div>
        )}
        {!asText && fr.src ? <CxSource source={fr.src} cls="cxm-story-src2 cxm-story-ussrc" /> : null}
        <p className="cxm-story-usreview">{CX_US_TEXT_REVIEW.ok ? `Read against its sources by ${CX_US_TEXT_REVIEW.by} on ${CX_US_TEXT_REVIEW.checked}.` : `Our plain words, from the official rules linked on each step. A person has not reviewed them yet.`}</p>
        {!asText && <div className="cxm-story-usnav">
          <button type="button" className="cxm-btn2" onClick={prev} disabled={f === 0}>Back</button>
          <span>{`Step ${f + 1} of ${s.frames.length}`}</span>
          <button type="button" className="cxm-btn" onClick={next}>{last ? `Done` : `Next`}</button>
        </div>}
      </div>
    </div>
  );
}
