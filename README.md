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

El chat no tiene historial, memoria entre consultas, autenticación,
control de frecuencia ni acceso a Google Sheets, n8n o Drive.
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

## Prueba de conectividad con Google Sheets

`GET /api/accounts-payable/test` se conecta exclusivamente desde el servidor con
una Service Account y el scope `https://www.googleapis.com/auth/spreadsheets.readonly`.
Usa la biblioteca oficial `google-auth-library` y Google Sheets API; no llama a
OpenAI, no modifica la hoja ni calcula facturas o totales.

Configurá estas variables en el entorno del servidor (en Vercel, en el entorno
correspondiente) o en `.env.local` para probar localmente:

- `GOOGLE_SERVICE_ACCOUNT_EMAIL`: correo de la cuenta de servicio.
- `GOOGLE_PRIVATE_KEY`: clave privada de esa cuenta. Se aceptan saltos de línea
  reales o representados como `\n`; el backend los normaliza.
- `GOOGLE_SHEETS_SPREADSHEET_ID`: ID del documento, no su URL completa.
- `GOOGLE_SHEETS_RANGE`: rango en notación A1, por ejemplo
  `'Cuentas por pagar'!A1:F1000`. Su primera fila debe contener los encabezados.

Google Sheets API debe estar habilitada en el proyecto de Google Cloud y el
documento debe estar compartido como **Lector** con el correo de la Service Account.
No uses variables `NEXT_PUBLIC_` para estas credenciales.

Abrí `/api/accounts-payable/test` en el mismo dominio de la aplicación. Ejemplo
ilustrativo de respuesta:

```json
{
  "success": true,
  "dataRowCount": 12,
  "columnCount": 3,
  "headers": ["Proveedor", "Factura", "Vencimiento"]
}
```

`dataRowCount` excluye la primera fila y las filas completamente vacías.
`columnCount` es el ancho máximo de las filas devueltas por la API; Google omite
las columnas vacías al final. Los encabezados faltantes se representan con `""`.
Un rango vacío devuelve éxito, cero filas, cero columnas y `headers: []`.

La ruta lee el rango en memoria para contar las filas, pero devuelve únicamente
estos cuatro campos. No envía los registros financieros al navegador ni los
registra en logs. La respuesta no se almacena en caché. Si falta configuración,
devuelve HTTP 500; si falla Google, HTTP 502 con un mensaje genérico, sin errores
originales ni credenciales. El timeout de cada solicitud a Google es de 30 segundos.

La prueba se ejecuta sólo al visitar la ruta y todavía no tiene autenticación de
usuarios: quien pueda acceder a esa URL podrá consultar encabezados y cantidades.
El chat de Finance AI continúa sin acceso al contenido de la hoja.

Referencias: [biblioteca oficial de autenticación](https://github.com/googleapis/google-cloud-node/tree/main/core/packages/google-auth-library-nodejs)
y [lectura de rangos en Sheets API](https://developers.google.com/workspace/sheets/api/reference/rest/v4/spreadsheets.values/get).

## Resumen inicial de cuentas por pagar

`GET /api/accounts-payable/summary` lee el mismo rango y devuelve únicamente
cantidades por estado y la suma de `Monto Total` de los comprobantes `NO PAGADO`,
separada por `Moneda`. La lectura sigue siendo exclusiva del servidor, con la
misma Service Account y permisos de sólo lectura. No envía datos a OpenAI.

Reglas de esta etapa:

- `NO PAGADO`: cuenta el comprobante y suma su `Monto Total` en su moneda.
- `PAGADO`: sólo lo cuenta; no lo incluye en los importes pendientes.
- `PAGADO PARCIAL`: sólo lo cuenta. `pendingBalance: null` significa que el saldo
  es desconocido porque la hoja no registra cuánto se pagó; nunca se considera cero
  ni se suma el importe original como deuda. Si hay alguno,
  `pendingBalanceComplete` es `false`: los totales NO PAGADO no son toda la deuda.
- `NO PAGAR`: sólo lo cuenta; queda excluido de los importes a pagar.
- `F. Pago` no interviene en los cálculos: puede ser fecha real de pago o un mes
  tentativo que cambia según la caja. No se calculan vencidos ni pagos por mes.

Ejemplo ficticio (no corresponde a datos reales):

```json
{
  "success": true,
  "dataRowCount": 5,
  "unpaid": {
    "count": 2,
    "totalsByCurrency": [
      { "currency": "ARS", "amount": 1500.25 },
      { "currency": "USD", "amount": 100 }
    ]
  },
  "paid": { "count": 1 },
  "partiallyPaid": { "count": 1, "pendingBalance": null },
  "doNotPay": { "count": 1 },
  "pendingBalanceComplete": false
}
```

El rango debe comenzar con los encabezados `Estado`, `Monto Total` y `Moneda`,
cada uno una sola vez. Se admiten cambios de orden, mayúsculas y espacios. Cada
fila no vacía se considera un comprobante; no se deduplican registros ni se
incluyen filas de subtotales. Los encabezados solos devuelven cantidades cero;
un rango completamente vacío devuelve HTTP 422 porque falta la estructura.

Los importes se piden a Google como números con `UNFORMATTED_VALUE`, sin interpretar
comas, puntos ni símbolos del formato visual. Las celdas con importes guardados
como texto se rechazan. Cada importe se redondea a dos decimales (mitades alejadas
de cero) y se suma en centavos, conservando el signo que figura en la hoja.
No se interpreta la columna `Tipo` ni se cambia el signo de notas de crédito.
Las monedas se agrupan por su etiqueta normalizada; `ARS` y `PESOS`, por ejemplo,
permanecen separadas. No se convierten monedas ni se produce una suma entre ellas.

Un estado vacío/desconocido, un encabezado requerido ausente/duplicado o un
comprobante NO PAGADO con monto no numérico o sin moneda produce HTTP 422 con un
mensaje controlado, sin resultados parciales ni valores de las celdas. HTTP 500
indica falta de configuración o un error interno y HTTP 502 un fallo de Google.
Las respuestas no se guardan en caché. No se registran claves ni datos de la hoja.

Esta ruta todavía no tiene autenticación de usuarios: quien pueda acceder al
despliegue y a esta URL podrá ver los totales por moneda. La interfaz y el chat
no consumen este resumen todavía. Los resultados abarcan sólo el rango configurado;
la prueba de conectividad `/api/accounts-payable/test` conserva su respuesta original.

`npm test` ejecuta pruebas permanentes con datos ficticios para verificar las reglas,
los pagos parciales, las monedas, los redondeos y los datos inválidos. No requiere
credenciales, conexiones externas ni dependencias adicionales. Las pruebas usan
el soporte TypeScript de Node.js 22.6 o superior; se recomienda Node.js 24 LTS.

Referencia: [valores numéricos sin formato en Sheets API](https://developers.google.com/workspace/sheets/api/reference/rest/v4/ValueRenderOption).
