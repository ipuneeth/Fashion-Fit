import 'dotenv/config'

import cors from 'cors'
import express from 'express'

import {
  createDecartClient,
} from '@decartai/sdk'

const app =
  express()

const PORT =
  Number(
    process.env.PORT ||
      5050,
  )

const DECART_API_KEY =
  process.env.DECART_API_KEY ||
  ''

/* =========================================================
   MIDDLEWARE
   ========================================================= */

app.use(
  cors({
    origin: true,
    methods: [
      'GET',
      'POST',
      'OPTIONS',
    ],
    allowedHeaders: [
      'Content-Type',
    ],
  }),
)

app.use(
  express.json({
    limit: '1mb',
  }),
)

/* =========================================================
   HEALTH CHECK
   ========================================================= */

app.get(
  '/health',
  (_req, res) => {
    res.json({
      ok: true,
      service:
        'anywear-replica-server',
      decartConfigured:
        Boolean(
          DECART_API_KEY,
        ),
      timestamp:
        new Date().toISOString(),
    })
  },
)

/* =========================================================
   DEcart CLIENT TOKEN
   ========================================================= */

app.post(
  '/api/decart/token',
  async (_req, res) => {
    if (!DECART_API_KEY) {
      res.status(500).json({
        ok: false,
        error:
          'DECART_API_KEY is not configured on the server.',
      })

      return
    }

    try {
      const decartClient =
        createDecartClient({
          apiKey:
            DECART_API_KEY,
        })

      const token =
        await decartClient.tokens.create()

      res.json({
        ok: true,
        apiKey:
          token.apiKey,
      })
    } catch (error) {
      console.error(
        '[Decart Token Error]',
        error,
      )

      res.status(502).json({
        ok: false,
        error:
          'Unable to create a Decart client token.',
      })
    }
  },
)

/* =========================================================
   START SERVER
   ========================================================= */

app.listen(
  PORT,
  () => {
    console.log('')
    console.log(
      '========================================',
    )
    console.log(
      '       ANYWEAR REPLICA BACKEND',
    )
    console.log(
      '========================================',
    )
    console.log(
      `HTTP   : http://localhost:${PORT}`,
    )
    console.log(
      `Health : http://localhost:${PORT}/health`,
    )
    console.log(
      `Token  : POST http://localhost:${PORT}/api/decart/token`,
    )
    console.log(
      `Decart : ${
        DECART_API_KEY
          ? 'CONFIGURED'
          : 'NOT CONFIGURED'
      }`,
    )
    console.log(
      '========================================',
    )
    console.log('')
  },
)