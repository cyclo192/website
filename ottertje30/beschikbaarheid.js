/* Bezette periodes van Slinger Ottertje 30.

   Eén regel per boeking: ["aankomst", "vertrek"], geschreven als jjjj-mm-dd.
   De vertrekdag zelf blijft vrij, zodat nieuwe gasten die dag kunnen aankomen.

   Voorbeeld:
     ["2026-10-17", "2026-10-24"],

   Nog te boeken in 2027 (opgegeven op 2 oktober 2026):
     1 april - 16 april, 18 april - 4 juni, 7 juni - 11 juni,
     25 juni - 16 juli, 13 augustus - 31 december. Heel 2028 is nog vrij.
   Alles daartussen staat hieronder als bezet.
*/
window.BEZET = [
  ["2026-10-01", "2027-04-01"],
  ["2027-04-16", "2027-04-18"],
  ["2027-06-04", "2027-06-07"],
  ["2027-06-11", "2027-06-25"],
  ["2027-07-16", "2027-08-13"],
];

/* Datum waarop deze lijst voor het laatst is bijgewerkt. */
window.BEZET_BIJGEWERKT = "2026-10-02";
