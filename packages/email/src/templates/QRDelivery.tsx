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

interface QRDeliveryProps {
  nombreComprador: string;
  producto: string;
  cantidadKg: number;
  qrUrl: string;
  orderId: string;
}

export function QRDelivery({ nombreComprador, producto, cantidadKg, qrUrl, orderId }: QRDeliveryProps) {
  return (
    <Html>
      <Head />
      <Preview>Tu lote de {producto} esta listo para confirmar entrega</Preview>
      <Body style={{ backgroundColor: '#F8F8F6', fontFamily: 'Poppins, sans-serif' }}>
        <Container style={{ margin: '40px auto', padding: '20px', maxWidth: '560px' }}>
          <Heading style={{ color: '#1A1A1A' }}>Confirma la recepcion de tu pedido</Heading>
          <Text style={{ color: '#6B7280' }}>
            Hola {nombreComprador}, el lote de <strong>{cantidadKg} kg de {producto}</strong> (Pedido #{orderId}) esta listo.
          </Text>
          <Text>
            Escanea el codigo QR del albaran de entrega o accede a la plataforma para confirmar la recepcion.
          </Text>
          <Text style={{ color: '#9CA3AF', fontSize: '12px' }}>
            El codigo QR tiene validez de 48 horas y solo puede usarse una vez.
          </Text>
        </Container>
      </Body>
    </Html>
  );
}
