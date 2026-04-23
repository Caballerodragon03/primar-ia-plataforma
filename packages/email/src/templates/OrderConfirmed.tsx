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

interface OrderConfirmedProps {
  nombre: string;
  orderId: string;
  producto: string;
  total: number;
}

export function OrderConfirmed({ nombre, orderId, producto, total }: OrderConfirmedProps) {
  return (
    <Html>
      <Head />
      <Preview>Pedido #{orderId} confirmado</Preview>
      <Body style={{ backgroundColor: '#F8F8F6', fontFamily: 'Poppins, sans-serif' }}>
        <Container style={{ margin: '40px auto', padding: '20px', maxWidth: '560px' }}>
          <Heading style={{ color: '#1A1A1A' }}>Pedido confirmado</Heading>
          <Text style={{ color: '#6B7280' }}>
            Hola {nombre}, tu pedido <strong>#{orderId}</strong> de {producto} por <strong>EUR{total.toFixed(2)}</strong> ha sido confirmado.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
