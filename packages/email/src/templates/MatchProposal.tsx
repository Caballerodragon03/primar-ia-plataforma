import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
  Button,
} from '@react-email/components';
import * as React from 'react';

interface MatchProposalProps {
  nombreVendedor: string;
  producto: string;
  cantidadKg: number;
  precioKg: number;
  matchUrl: string;
}

export function MatchProposal({ nombreVendedor, producto, cantidadKg, precioKg, matchUrl }: MatchProposalProps) {
  const total = (cantidadKg * precioKg).toFixed(2);
  return (
    <Html>
      <Head />
      <Preview>Nueva propuesta de match para {producto}</Preview>
      <Body style={{ backgroundColor: '#F8F8F6', fontFamily: 'Poppins, sans-serif' }}>
        <Container style={{ margin: '40px auto', padding: '20px', maxWidth: '560px' }}>
          <Heading style={{ color: '#1A1A1A' }}>Nueva propuesta de match</Heading>
          <Text style={{ color: '#6B7280' }}>
            Hola {nombreVendedor}, tienes una nueva propuesta de match para <strong>{producto}</strong>:
          </Text>
          <Text>Cantidad: <strong>{cantidadKg} kg</strong></Text>
          <Text>Precio: <strong>EUR{precioKg}/kg</strong></Text>
          <Text>Total: <strong>EUR{total}</strong></Text>
          <Button
            href={matchUrl}
            style={{
              backgroundColor: '#E1C44D',
              color: '#1A1A1A',
              padding: '12px 24px',
              borderRadius: '8px',
              fontWeight: '600',
              display: 'inline-block',
              textDecoration: 'none',
            }}
          >
            Ver propuesta
          </Button>
        </Container>
      </Body>
    </Html>
  );
}
