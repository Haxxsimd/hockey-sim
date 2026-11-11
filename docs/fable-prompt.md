Läs CLAUDE.md och src/ först. Stack och grundmotor är redan klara, bygg inte om något.

PROJEKT
Retro-hockeymanager, solo-utveckling, TypeScript/Node, CLI/text, litet och lätt för "dad gamers".
Motorn är frikopplad från UI. Redan klart: seedad matchmotor, taktiska roller, utvisningar/powerplay,
säsongssimulator, tester.

DESIGNREFERENS: Eastside Hockey Manager (dolda CA/PA, scouting, taktiska roller). Bygg ingen kopia.
Lös dess kända problem: långsamt, krångliga menyer, resultat som känns slumpmässiga trots god
scouting, och taktiska instruktioner som ignoreras.

OMFÅNG (medvetet litet)
- Ett lag, en fast liga med hårdkodade regler, tre till fem säsonger.
- Bort: flera ligor, regelpaket, kvalserier, värvningar från andra ligor, ekonomi/kontrakt, skador.
- Ett spelläge: auto-uppställning som standard, manuell överstyrning av uppställningen.
- Matcher som live text-referat där orsaken syns ("screenen gav målet"). Orsaksfeedback bara där.

MÄTT PÅ MOTORN (6 000 matcher, 500 säsonger, 4 mocklag i dubbelserie, seed 1–500)
- Mål per match (båda lagen): 4,3 (median 4, p10–p90: 2–7). Skott per lag: 19,2.
  Räddningsprocent 0,888. 0–0-matcher: 1,2 %. Förlängning: 14 %.
- Utvisningar per match: 2,3. PP-omvandling: 20 %.
- PP har verklig effekt: 0,101 mål/min i PP mot 0,069 i 5 mot 5 (ratio 1,45).
- Net-front screen har verklig effekt: målchans 15,0 % med screen mot 9,5 % utan. Returer 14,6 %.
- Hemmafördel: 50,4 % hemmavinster i ordinarie tid, alltså ingen.
- Lagen är väldigt ojämna: North Stars vinner serien 58 % av gångerna, Polar Bears i princip
  aldrig (snitt 1,4 av 12 möjliga poäng, GF/GA per match 0,95/3,58). Oklart om det är mocklagen
  eller att attributskillnader slår för hårt.
- CA/PA och övriga dolda attribut (consistency, injuryProneness) används INTE i engine.ts.
  Bara synliga attribut räknas.
- Förlängning avgörs 50/50 oavsett lagstyrka.

UPPGIFT (ingen kod, inga filer, bara analys och plan)
1. Bedöm om attributskillnader i motorn slår för hårt. Ge ett förslag på hur jag testar det med
   jämnare lag, och peka ut vilken kodrad eller konstant som styr det.
2. Föreslå hur CA/PA och consistency ska kopplas in i motorn så att dolda värden spelar roll
   utan att resultaten blir slumpmässiga.
3. Föreslå om hemmafördel och styrkestyrd förlängning är värda att lägga in, och i så fall hur
   enkelt det kan göras.
4. Föreslå enkel spelarutveckling mellan säsonger (tillväxt mot PA, åldrande).
5. Föreslå enkel scouting och draft: ett värde med brus som minskar ju mer man scoutar,
   utan menylabyrint.
6. Föreslå ett CLI-läge där jag väljer uppställning och ser live-referat med orsaksfeedback.
7. Ordning på stegen 1–6 med storlek (S/M/L) per steg, och vad som medvetet skjuts upp.
8. De 3 största riskerna för att projektet växer ur proportion, och hur jag undviker dem.

Var kortfattad. Ställ frågor innan du bygger. Skriv inga filer.
