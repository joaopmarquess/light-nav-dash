import * as React from 'npm:react@18.3.1'
import { Body, Button, Container, Head, Heading, Html, Preview, Text } from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface Props { nome?: string; novidades?: string; link?: string }

const Email = ({ nome, novidades, link }: Props) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>O AXIS foi atualizado</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>O AXIS foi atualizado</Heading>
        <Text style={text}>{nome ? `Olá, ${nome}.` : 'Olá.'}</Text>
        <Text style={text}>Uma nova versão do AXIS já está disponível. O que mudou:</Text>
        {(novidades || 'Melhorias gerais.').split('\n').filter((l) => l.trim()).map((l, i) => <Text key={i} style={item}>{l}</Text>)}
        <Button href={link || 'https://axisbensaude.lovable.app'} style={button}>Abrir o AXIS</Button>
        <Text style={foot}>Bensaúde · AXIS</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'O AXIS foi atualizado',
  displayName: 'Aviso de atualização do AXIS',
  previewData: { nome: 'Maria', novidades: 'Nova Área Geográfica no celular\nRegiões do IBGE no mapa', link: 'https://axisbensaude.lovable.app' },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { color: '#1e3a8a', fontSize: '22px', margin: '0 0 16px' }
const text = { color: '#1f2937', fontSize: '15px', lineHeight: '22px', margin: '0 0 10px' }
const item = { color: '#1f2937', fontSize: '15px', lineHeight: '22px', margin: '0 0 6px', paddingLeft: '12px', borderLeft: '3px solid #93c5fd' }
const button = { backgroundColor: '#2563eb', color: '#ffffff', borderRadius: '8px', padding: '12px 20px', fontSize: '15px', textDecoration: 'none', marginTop: '16px' }
const foot = { color: '#6b7280', fontSize: '12px', marginTop: '24px' }
