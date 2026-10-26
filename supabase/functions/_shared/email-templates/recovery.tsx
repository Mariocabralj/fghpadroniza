/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Redefinição de senha — FGH Padroniza</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>FGH Padroniza</Heading>
        <Heading style={h1}>Redefinição de senha</Heading>
        <Text style={text}>
          Recebemos uma solicitação para redefinir a senha da sua conta no FGH Padroniza.
          Clique no botão abaixo para criar uma nova senha.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Redefinir minha senha
        </Button>
        <Text style={footer}>
          Caso você não tenha solicitado a redefinição, basta ignorar este e-mail —
          sua senha atual permanecerá inalterada.
        </Text>
        <Text style={signature}>
          Fundação Gestão Hospitalar Martiniano Fernandes
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const brand = {
  fontSize: '14px',
  fontWeight: 'bold' as const,
  color: '#00377b',
  letterSpacing: '1px',
  textTransform: 'uppercase' as const,
  margin: '0 0 24px',
}
const h1 = {
  fontSize: '24px',
  fontWeight: 'bold' as const,
  color: '#0f172a',
  margin: '0 0 20px',
}
const text = {
  fontSize: '15px',
  color: '#334155',
  lineHeight: '1.6',
  margin: '0 0 28px',
}
const button = {
  backgroundColor: '#00377b',
  color: '#ffffff',
  fontSize: '15px',
  fontWeight: 'bold' as const,
  borderRadius: '8px',
  padding: '14px 24px',
  textDecoration: 'none',
  display: 'inline-block',
}
const footer = { fontSize: '13px', color: '#64748b', lineHeight: '1.5', margin: '32px 0 0' }
const signature = { fontSize: '12px', color: '#94a3b8', margin: '24px 0 0' }
