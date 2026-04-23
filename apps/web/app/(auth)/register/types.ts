export interface RegisterFormData {
  // Step 1
  role: 'VENDEDOR' | 'COMPRADOR';
  email: string;
  password: string;
  telefono?: string;
  idioma: 'ES' | 'EN';
  // Step 2
  razonSocial: string;
  cifNif: string;
  formaJuridica?: string;
  direccionFiscal: string;
  ciudad?: string;
  codigoPostal?: string;
  pais: string;
  nombre: string;
  apellidos: string;
  personaContactoLegal: string;
  cargoContactoLegal: string;
  // Step 4
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
}
