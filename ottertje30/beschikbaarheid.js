/* Bezette periodes van Slinger Ottertje 30.

   Eén regel per boeking: ["aankomst", "vertrek"], geschreven als jjjj-mm-dd.
   De vertrekdag zelf blijft vrij, zodat nieuwe gasten die dag kunnen aankomen.

   Voorbeeld:
     ["2026-10-17", "2026-10-24"],

   Nog te boeken in 2027 (opgegeven op 2 oktober 2026):
     1 april - 16 april, 25 april - 14 mei, 17 mei - 4 juni, 7 juni - 11 juni,
     25 juni - 16 juli, 13 augustus - 8 oktober, 11 oktober - 31 december. Heel 2028 is nog vrij.
   Alles daartussen staat hieronder als bezet.
*/
window.BEZET = [
  ["2026-10-01", "2027-04-01"],
  ["2027-04-16", "2027-04-25"],   // incl. boeking 18 t/m 24 april (nachten)
  ["2027-05-14", "2027-05-17"],   // boeking 14, 15 en 16 mei (3 nachten)
  ["2027-06-04", "2027-06-07"],
  ["2027-06-11", "2027-06-25"],   // boeking 25-27 juni geannuleerd: die nachten zijn weer vrij
  ["2027-07-16", "2027-08-13"],
  ["2027-10-08", "2027-10-11"],   // boeking vr 8 - zo 10 oktober (zondag ook bezet)
  ["2027-12-31", "2028-01-03"],
];

/* Datum waarop deze lijst voor het laatst is bijgewerkt. */
window.BEZET_BIJGEWERKT = "2026-11-02";
