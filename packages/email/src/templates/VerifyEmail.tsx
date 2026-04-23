import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface VerifyEmailProps {
  nombre: string;
  verificationUrl: string;
}

export function VerifyEmail({ nombre, verificationUrl }: VerifyEmailProps) {
  return (
    <Html>
      <Head />
      <Preview>Verifica tu email en Primar-IA</Preview>
      <Body style={{ backgroundColor: '#F8F8F6', fontFamily: 'Poppins, sans-serif' }}>
        <Container style={{ margin: '40px auto', padding: '20px', maxWidth: '560px' }}>
          <Heading style={{ color: '#1A1A1A' }}>Bienvenido/a a Primar-IA, {nombre}</Heading>
          <Text style={{ color: '#6B7280' }}>
            Por favor, verifica tu direccion de email haciendo clic en el boton de abajo.
            El enlace caduca en 24 horas.
          </Text>
          <Button
            href={verificationUrl}
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
            Verificar Email
          </Button>
          <Text style={{ color: '#9CA3AF', fontSize: '12px', marginTop: '24px' }}>
            Si no creaste una cuenta en Primar-IA, puedes ignorar este email.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
