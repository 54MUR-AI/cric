-- === CRIC Meeting Description Recovery ===
-- Run in Supabase Dashboard SQL Editor
-- Source: CRIC Expanded Record Book 2026 (Downloads)

-- Step 1: Fix all corrupted amounts per the original record book

-- 2025 Annual Meeting (04f56891-950b-4521-b14a-670217095428)
update meeting_agenda_items set description = 'Operating income just about covered operating expenses in 2024, but net loss of almost $9,000 due to $10,430 in capital expenditures ($5,430 labor to replace failed picture windows and sliding door in bunkhouse + $5,000 towards main house foundation). 2024 contributions $14,034 ($12,900 dues + $1,134 propane). Vanguard funds doing well, close to $300k even after $10k withdrawal in late Dec 2024 to replenish checking and cover anticipated foundation payment. Smiths'' $30k contribution from Ama''s trust (matching Nelson''s and Rod''s families) in the works this fall, not yet reflected in Wellington balance as of 6/30/25.' where id = '96111221-862c-4382-a1a9-c977a6e777ec';

update meeting_agenda_items set description = 'NW corner resting on rock, squishing flotation and underwater. Dick removed damaged barrels; Matt Hammill + Dick installed two new ones. James & Dan added chain to NE rock. Dick added chain to SW stump and lengthened other chains. Vagabond stored on land under tarp to reduce weight. When lake level dropped, boathouse rested on bottom. Crib + 6 more barrels proposed to move boathouse ~10 ft out (near original location). $1,500 approved for materials (James & Dan to help build).' where id = 'b1824b07-1034-48e5-a3ab-1d4c51969961';

update meeting_agenda_items set description = 'Main house foundation: Davenport hopes to start jacking next year; still needs more footings + new metal roof + rotting log fixes. Bonus of $5,000 discussed if footings done by Aug 15.' where id = '826be726-9997-482e-89d2-022715aef6f0';

update meeting_agenda_items set description = 'Dick stripped small logs (dead on island), seasoning under Loon Lodge. $500 approved for 7 sheets 4x8 decking + shingles (sign "DO NOT USE OR STAND ON ROOF").' where id = '51b84d68-9e09-499c-844d-d8f6dcd556f6';

-- 2012 Annual Meeting (bcbf56e2-10b8-4fca-8009-a943a84d731c)
update meeting_agenda_items set description = 'After years of discussion, reached consensus on generational share/dues restructure. Ages 22-30 pay $100; at 30 receive share + vote + 1/2 dues; at 40 pay full dues. Current shareholders to return shares, retaining one each. Share returns to corporation on death. Approved for vote in 2013.' where id = 'bf376699-f189-4788-808e-f20a5320e9d9';

update meeting_agenda_items set description = 'Approved replacing galvanized pipe with PVC in Bat Manor kitchen for better pressure (~$300).' where id = '7a910342-825e-4f79-a5b2-fbbaed38891e';

update meeting_agenda_items set description = '$6/night first week, $3 thereafter. Waivers for June/Sept and seniors over 80.' where id = 'b72dd8c7-7366-4dad-827a-4e39294b650e';

update meeting_agenda_items set description = 'Authorized up to $300/year for professional cleaning of Bat Manor.' where id = '7ad3a5c6-b4a4-4f9c-b910-4d09e67065aa';

-- 2014 Annual Meeting (7c0b50aa-fac5-47f4-8643-01a2409077d7)
update meeting_agenda_items set description = 'Unhappy with IGA Store slip ($600, difficult access). Bill Smith $20 pull/launch but trips to Tupper irregular.' where id = '436e8d56-4d28-4537-be4c-10092170714f';

update meeting_agenda_items set description = '~$22k in boat fund. Pontoon boats discussed as future option for easier access.' where id = '2d96aae5-9a36-49ad-ad20-fd817c861f8f';

-- 2015 Annual Meeting (54715814-f483-4f10-9e2e-cce237aa23a5)
update meeting_agenda_items set description = 'Moving toward Bill Smith (~$175/tank vs previous ~$115).' where id = 'c20761fc-e4df-46bc-adc9-ee6f9efc3648';

-- 2018 Annual Meeting (363495cb-d4b1-4ff9-80a7-40c895bf212f)
update meeting_agenda_items set description = '$10 roundtrip introduced (log book + box on desk in Main House). First/last launch/retrieval of season paid by CRIC; otherwise individual pays.' where id = '24f40fa2-5138-4635-93d8-dbcea678e910';

update meeting_agenda_items set description = '30-40 year olds: $250 if not coming up, $500 if they do. 22-30 year olds: $100 whether they come or not. Propane fee $6/day dropping to $3 after a week (July-Aug only). Over 80 exempt. Nine cousin families: $1,000 + $225 boat fee.' where id = 'a6867aaa-4fce-4f64-9b6f-8c6e337e298d';

-- 2019 Annual Meeting (bc8171fd-1046-4468-a1f4-c5f82fe4f540)
update meeting_agenda_items set description = 'Serious re-decking approved. Dan''s resurfacing + extra flotation (~$2,500) best of three quotes. Unanimous.' where id = '744be773-034b-4225-abcd-412767f8db6f';

update meeting_agenda_items set description = 'Debbie proposed Bobbie & Rod released from $1,000/year dues. Passed with one nay (Bobbie).' where id = '35f5a8f8-8acd-4197-b354-af1a2afeeb3d';

-- 2020 Annual Meeting (0fa0e234-74c1-466f-ad71-d5a94f6b561d)
update meeting_agenda_items set description = 'Batteries to be replaced (~$1,000). Justin volunteered to source in spring. Cannot use electrical appliances that create heat.' where id = 'f8498e9c-d26d-4310-bd58-302f67e9d718';

-- 2021 Annual Meeting (8dc993d8-c59f-4058-9fc5-e532f835ead6)
update meeting_agenda_items set description = 'New battery system $4,600; four lithium batteries installed end of September. Dave Horning warmly credited.' where id = 'e63ec3b2-446f-4165-b4bf-7bfc3bd0faae';

update meeting_agenda_items set description = 'No reliable service. Mid-summer scrambling - Joe hired John Davenport to fill/deliver tanks + fix skylight leak for $200.' where id = '9c9fdb0e-4fb5-4e22-bd42-bb817e5342e1';

update meeting_agenda_items set description = '$250 one-year donation to Cranberry Lake North Shore Hub (reevaluate next year).' where id = '3936de55-120b-4c97-9fa5-e4b8f24491b2';

update meeting_agenda_items set description = 'Grace, Kate Hoben, Dave proposed $750/year discretionary fund per house for maintenance. Increased to $1,000/house. Includes $300 cleaning fee for Main House.' where id = '327d03a4-a5cb-4273-a5d4-912932fb9e05';

update meeting_agenda_items set description = 'Engineering survey with North Woods Engineering approved (~$2,300) for structural integrity of Main House.' where id = 'd12bda41-3650-4d21-b1ea-8befc581ba88';

-- 2022 Annual Meeting (c25d5bac-dd30-418c-8e4e-a021c52882aa)
update meeting_agenda_items set description = '$25 gas trip fee set (was $16).' where id = '4c46cec5-4ec6-45d7-9803-48632e28ac08';

update meeting_agenda_items set description = 'Bunkhouse added to improvements plan. Up to $1,000/year per structure.' where id = 'c3c846da-9087-40cd-92e0-76755d899426';

update meeting_agenda_items set description = 'Windows foggy (failed seals), sliding door rot - ~$4,600 + labor.' where id = '040970de-51ca-452b-b59c-e11944b52080';

-- 2023 Annual Meeting (af9f0019-80e8-497c-8856-2b67e793553a)
update meeting_agenda_items set description = '$3,500 pre-approved for section replacement + UV stain + Toad Hall ramp boards. Kids getting bad splinters near ladder.' where id = 'e19123d2-8ac0-4da0-ab0e-22c7c82712ed';

-- 2024 Annual Meeting (e88c43ef-a7d5-4121-9178-116bbcdbd1c3)
update meeting_agenda_items set description = 'Net loss of $14,700 due to one-time capital expenditures (windows/doors + septic tank). Liquid assets ~$275k. Dues raised 50% approved (two opposed) - first raise since 2010.' where id = '70cd149b-1508-4d2e-ad0a-f37c3029f82c';

update meeting_agenda_items set description = 'More stable, cleated - thanks to Debbie & PJ. Gas had $400 surplus added to maintenance fund.' where id = '5cc6fd9f-c395-4c69-86e1-67002477ef0a';

update meeting_agenda_items set description = 'Batteries ran down (CPAP guest + cloudy days). Jump-start worked. $400 approved for circuit monitoring system. Low-voltage cutoff suggested.' where id = 'ae1a68ca-12fd-4d06-bce7-15b353bfe152';

update meeting_agenda_items set description = 'Phil noted dues last raised 2010 ($1,000 then ≈ $1,457 today). 50% raise proposed and approved.' where id = '86bae919-805a-45a0-bbc0-f444421a6937';

-- Step 2: Clean up any remaining corrupted patterns (just in case)
update meeting_agenda_items set description = replace(description, chr(92), '$')
where position(chr(92) in description) > 0;
