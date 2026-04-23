import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Text,
} from '@react-email/components';
import * as React from 'react';

interface WelcomeEmailProps {
  nombre: string;
  role: 'VENDEDOR' | 'COMPRADOR';
}

export function WelcomeEmail({ nombre, role }: WelcomeEmailProps) {
  const roleLabel = role === 'VENDEDOR' ? 'productor/vendedor' : 'comprador/distribuidor';
  return (
    <Html>
      <Head />
      <Preview>Tu cuenta en Primar-IA ha sido verificada</Preview>
      <Body style={{ backgroundColor: '#F8F8F6', fontFamily: 'Poppins, sans-serif' }}>
        <Container style={{ margin: '40px auto', padding: '20px', maxWidth: '560px' }}>
          <Heading style={{ color: '#1A1A1A' }}>Tu cuenta ha sido verificada!</Heading>
          <Text style={{ color: '#6B7280' }}>
            Hola {nombre}, tu cuenta como {roleLabel} en Primar-IA esta lista.
            Ya puedes acceder a la plataforma.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
