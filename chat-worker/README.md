# byXavio chatbot (Cloudflare Worker)

Het "brein" achter de chat op byxavio.nl. Draait gratis op Cloudflare Workers AI, zonder API-key.

## Live zetten

Gekoppeld aan Cloudflare Workers Builds: elke push naar main bouwt en deployt deze map automatisch.

### Handmatig (optioneel)

In deze map (`chat-worker`):

```
npx wrangler login
npx wrangler deploy
```

Daarna draait de bot op **https://chat.byxavio.nl** en praat de chat op byxavio.nl ermee.

## Wat de bot weet aanpassen

Alles staat in `SYSTEM_PROMPT` in `src/index.js` (pakketten, prijzen, FAQ, contact).
Pas je prijzen op de site aan? Pas ze hier ook aan en doe opnieuw `npx wrangler deploy`.

## Kosten

Workers AI heeft een gratis dagtegoed. Voor een site als byxavio.nl is dat ruim genoeg.
Ga je erover, dan antwoordt de bot niet en verwijst de chat automatisch naar WhatsApp.
