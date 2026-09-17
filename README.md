# Finance AI

Prueba inicial de un Asistente de Administración y Finanzas, construida con
Next.js, React y el SDK oficial de OpenAI. Responde consultas breves en castellano
mediante Responses API y el modelo `gpt-5.6-luna`.

## Ejecutar la prueba

1. Usá Node.js 22 o superior y ejecutá `npm install`.
2. Copiá `.env.example` a `.env.local` y completá `OPENAI_API_KEY`.
   La clave se lee exclusivamente en el servidor. No uses `NEXT_PUBLIC_` ni la
   agregues a archivos de código; `.env.local` está excluido de Git.
3. Ejecutá `npm run dev`. Reiniciá el servidor si cambiaste la clave.
4. Abrí [http://localhost:3000](http://localhost:3000), escribí una pregunta y
   presioná **Consultar**.

La pantalla muestra la espera, la respuesta o un error. Acepta hasta 1000
caracteres y evita enviar otra consulta mientras hay una en curso.

## API

- `POST /api/test-openai`: recibe JSON, por ejemplo
  `{ "question": "¿Qué es un flujo de caja?" }`, y devuelve `{ "result": "..." }`.
  Rechaza preguntas vacías, valores que no sean texto y más de 1000 caracteres.
  La instrucción de sistema pide respuestas generales, breves y claras en castellano,
  sin inventar datos ni afirmar que tiene acceso a sistemas externos.
- `GET /api/test-openai`: conserva la prueba de conexión original. Envía solamente
  `Respondé únicamente con: Conexión con OpenAI exitosa.` y devuelve el resultado
  en el mismo formato JSON. Hace una llamada real a OpenAI cada vez que se visita;
  no se ejecuta automáticamente al abrir la página.

Los errores se devuelven como `{ "error": "..." }`: HTTP 400 para JSON o preguntas
inválidas, 415 para contenido que no sea JSON, 500 si falta la clave y 502 si
OpenAI falla o no devuelve texto completo. No se muestran los errores originales
del SDK ni se registran preguntas, respuestas o claves en logs de la aplicación.

## Alcance y límites

Esta versión no tiene historial, memoria entre consultas, autenticación,
control de frecuencia ni integraciones con Google Sheets, n8n o Drive.
No accede a información financiera real y las respuestas pueden contener errores.
Usá preguntas generales de prueba, sin información sensible. Las preguntas se
envían a OpenAI; la aplicación no las guarda y las solicitudes usan `store: false`.

Cada consulta consume API. La salida está limitada a 400 tokens en el POST y 64
en el GET, sin razonamiento ni reintentos automáticos. El servidor espera hasta
30 segundos. Es un prototipo para pruebas locales: el endpoint no tiene
protección contra uso público ni límites de gasto por usuario.

## Comprobaciones

```bash
npm run lint
npx tsc --noEmit
npm run build
```

Referencia: [instrucciones y generación de texto con Responses API](https://developers.openai.com/api/docs/guides/text).
