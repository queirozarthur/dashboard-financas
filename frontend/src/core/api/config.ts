import { z } from 'zod'

// Falha logo ao abrir o app se o .env estiver faltando ou errado, em vez de quebrar no primeiro pedido
export const API_URL = z
  .url({ error: 'VITE_API_URL ausente ou inválida no frontend/.env' })
  .parse(import.meta.env.VITE_API_URL)
