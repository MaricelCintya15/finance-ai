This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Prueba mínima de conexión con OpenAI

1. Copiá `.env.example` a `.env.local` en la raíz del proyecto y completá
   `OPENAI_API_KEY` con tu clave. `.env.local` está excluido de Git.
   No uses el prefijo `NEXT_PUBLIC_` para esta variable.
2. Instalá las dependencias con `npm install` si todavía no lo hiciste.
3. Ejecutá `npm run dev`. Si cambiaste la clave con el servidor iniciado,
   reinicialo.
4. Abrí [http://localhost:3000/api/test-openai](http://localhost:3000/api/test-openai).

La ruta `GET /api/test-openai` usa el SDK oficial de OpenAI desde el servidor
y llama a Responses API con el modelo `gpt-5.6-luna`. El único prompt enviado es:

```text
Respondé únicamente con: Conexión con OpenAI exitosa.
```

La respuesta esperada es:

```json
{ "result": "Conexión con OpenAI exitosa." }
```

Cada visita hace una solicitud nueva a OpenAI, con un máximo de 64 tokens de
salida, sin razonamiento ni reintentos automáticos. La respuesta no se almacena
en OpenAI (`store: false`) ni en la caché del navegador.

Si falta la clave, devuelve HTTP 500 con un mensaje de configuración. Si la
solicitud falla o no devuelve texto completo, devuelve HTTP 502 con un mensaje
simple. La ruta no imprime la clave ni los errores originales del SDK.

Referencias: [Responses API](https://developers.openai.com/api/docs/quickstart)
y [GPT-5.6 Luna](https://developers.openai.com/api/docs/models/gpt-5.6-luna).
