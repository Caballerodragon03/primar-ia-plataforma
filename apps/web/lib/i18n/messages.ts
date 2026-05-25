/**
 * Phase 14M v3.37 — diccionarios i18n.
 *
 * Estructura: clave plana (sin nesting) con dot-notation por convención.
 * Mantenemos las DOS lenguas con las MISMAS claves para que el typecheck
 * pille omisiones.
 *
 * Cuando una traducción aún no está disponible, devolvemos la clave para
 * que sea evidente en la UI cuál falta — sin romper la app.
 */

export type Locale = 'es' | 'en';

export const SUPPORTED_LOCALES: Locale[] = ['es', 'en'];

/** Las claves se construyen a medida que se convierten los archivos. */
export type MessageKey =
  // ─── nav / sidebar / header ──────────────────────────────────────────────
  | 'nav.dashboard'
  | 'nav.lots'
  | 'nav.orders'
  | 'nav.matches'
  | 'nav.contracts'
  | 'nav.messages'
  | 'nav.mercado'
  | 'nav.disputes'
  | 'nav.analytics'
  | 'nav.profile'
  | 'nav.subscription'
  | 'nav.logout'
  | 'nav.harvest'
  | 'role.seller'
  | 'role.buyer'
  | 'sidebar.expand'
  | 'sidebar.collapse'
  | 'header.notifications'
  | 'header.greeting'
  | 'header.myProfile'
  | 'header.settings'
  | 'header.breadcrumbBuyer'
  | 'header.breadcrumbSeller'
  | 'header.breadcrumbOrders'
  | 'header.breadcrumbLots'
  | 'header.breadcrumbMessages'
  | 'header.breadcrumbAnalytics'
  | 'header.breadcrumbDisputes'
  | 'header.breadcrumbMatches'
  | 'header.breadcrumbProfile'
  | 'header.breadcrumbMercado'
  | 'header.breadcrumbSubscription'
  | 'header.breadcrumbNew'
  | 'header.breadcrumbHarvest'
  | 'header.breadcrumbDashboard'
  | 'header.breadcrumbUsers'
  | 'header.breadcrumbCertificates'
  | 'header.breadcrumbIncidents'
  // ─── auth ────────────────────────────────────────────────────────────────
  | 'auth.login.title'
  | 'auth.login.subtitle'
  | 'auth.login.email'
  | 'auth.login.password'
  | 'auth.login.submit'
  | 'auth.login.submitting'
  | 'auth.login.forgot'
  | 'auth.login.noAccount'
  | 'auth.login.register'
  | 'auth.login.invalidCreds'
  | 'auth.login.locked'
  | 'auth.login.serverErrorFallback'
  | 'auth.login.tagline'
  | 'auth.login.heroTitle'
  | 'auth.login.heroDesc'
  | 'auth.login.statPreregistros'
  | 'auth.login.statMarketplace'
  | 'auth.login.statSellerFee'
  | 'auth.login.welcome'
  | 'auth.login.subtitleCard'
  | 'auth.login.emailPlaceholder'
  | 'auth.login.passwordInvalid'
  | 'auth.login.emailInvalid'
  | 'auth.login.passwordRequired'
  | 'auth.login.or'
  | 'auth.login.registerNow'
  | 'auth.login.endorsedBy'
  | 'auth.register.title'
  | 'auth.register.haveAccount'
  | 'auth.register.signIn'
  | 'auth.register.tagline'
  | 'auth.register.heroTitle'
  | 'auth.register.heroDesc'
  | 'auth.register.stepOf'
  | 'auth.register.stepAccount'
  | 'auth.register.stepCompany'
  | 'auth.register.stepDocs'
  | 'auth.register.stepLegal'
  | 'auth.register.successTitle'
  | 'auth.register.successDesc'
  | 'auth.register.labelEmail'
  | 'auth.register.labelPassword'
  | 'auth.register.backToLogin'
  | 'auth.register.timeout'
  | 'auth.register.serverErrorFallback'
  | 'auth.logout.confirm'
  // ─── profile ─────────────────────────────────────────────────────────────
  | 'profile.title'
  | 'profile.language'
  | 'profile.language.es'
  | 'profile.language.en'
  | 'profile.language.help'
  | 'profile.save'
  | 'profile.saved'
  // ─── dashboard ───────────────────────────────────────────────────────────
  | 'dashboard.welcome'
  | 'dashboard.actions'
  | 'dashboard.noTasks'
  | 'dashboard.buyerWelcome'
  | 'dashboard.buyerSubtitle'
  | 'dashboard.buyerNewOrder'
  | 'dashboard.sellerWelcome'
  | 'dashboard.sellerSubtitle'
  | 'dashboard.sellerNewLot'
  | 'dashboard.kpi.ordersInProgress'
  | 'dashboard.kpi.activeOrders'
  | 'dashboard.kpi.totalValue'
  | 'dashboard.kpi.committedValue'
  | 'dashboard.kpi.pendingDeliveries'
  | 'dashboard.kpi.readyToPay'
  | 'dashboard.kpi.activeLots'
  | 'dashboard.kpi.activeLotsSub'
  | 'dashboard.kpi.pendingMatches'
  | 'dashboard.kpi.pendingMatchesSub'
  | 'dashboard.kpi.lotsClosed'
  | 'dashboard.kpi.lotsClosedSub'
  | 'dashboard.kpi.matches'
  | 'dashboard.kpi.loading'
  | 'dashboard.activeOrdersSummary'
  | 'dashboard.activeLotsSummary'
  | 'dashboard.recentActivity'
  | 'dashboard.noOrdersYet'
  | 'dashboard.noLotsYet'
  | 'dashboard.createOne'
  | 'dashboard.seasonalCalendar'
  | 'dashboard.seasonalCalendarSub'
  | 'common.retry'
  // ─── pending approval banner ─────────────────────────────────────────────
  | 'pendingBanner.title'
  | 'pendingBanner.bodySeller'
  | 'pendingBanner.bodyBuyer'
  | 'pendingBanner.bodyClarification'
  | 'pendingBanner.bodyTail'
  // ─── common ──────────────────────────────────────────────────────────────
  | 'common.loading'
  | 'common.error'
  | 'common.cancel'
  | 'common.save'
  | 'common.delete'
  | 'common.confirm'
  | 'common.close'
  | 'common.edit'
  | 'common.back';

type Messages = Record<MessageKey, string>;

export const messages: Record<Locale, Messages> = {
  es: {
    'nav.dashboard': 'Inicio',
    'nav.lots': 'Mis lotes',
    'nav.orders': 'Mis pedidos',
    'nav.matches': 'Matches',
    'nav.contracts': 'Contratos',
    'nav.messages': 'Mensajes',
    'nav.mercado': 'Mercado',
    'nav.disputes': 'Incidencias',
    'nav.analytics': 'Analíticas',
    'nav.profile': 'Perfil',
    'nav.subscription': 'Suscripción',
    'nav.logout': 'Cerrar sesión',
    'nav.harvest': 'Cosecha',
    'role.seller': 'Vendedor',
    'role.buyer': 'Comprador',
    'sidebar.expand': 'Expandir menú',
    'sidebar.collapse': 'Colapsar menú',
    'header.notifications': 'Notificaciones',
    'header.greeting': 'Hola',
    'header.myProfile': 'Mi perfil',
    'header.settings': 'Configuración',
    'header.breadcrumbBuyer': 'Comprador',
    'header.breadcrumbSeller': 'Vendedor',
    'header.breadcrumbOrders': 'Pedidos',
    'header.breadcrumbLots': 'Lotes',
    'header.breadcrumbMessages': 'Mensajes',
    'header.breadcrumbAnalytics': 'Analíticas',
    'header.breadcrumbDisputes': 'Incidencias',
    'header.breadcrumbMatches': 'Matches',
    'header.breadcrumbProfile': 'Perfil',
    'header.breadcrumbMercado': 'Mercado',
    'header.breadcrumbSubscription': 'Suscripción',
    'header.breadcrumbNew': 'Nuevo',
    'header.breadcrumbHarvest': 'Cosecha',
    'header.breadcrumbDashboard': 'Dashboard',
    'header.breadcrumbUsers': 'Usuarios',
    'header.breadcrumbCertificates': 'Certificados',
    'header.breadcrumbIncidents': 'Incidentes',
    'auth.login.title': 'Iniciar sesión',
    'auth.login.subtitle': 'Bienvenido de vuelta a Primar-IA',
    'auth.login.email': 'Correo electrónico',
    'auth.login.password': 'Contraseña',
    'auth.login.submit': 'Entrar',
    'auth.login.submitting': 'Entrando…',
    'auth.login.forgot': '¿Has olvidado tu contraseña?',
    'auth.login.noAccount': '¿No tienes cuenta?',
    'auth.login.register': 'Regístrate',
    'auth.login.invalidCreds': 'Credenciales inválidas',
    'auth.login.locked': 'Cuenta bloqueada temporalmente. Intenta más tarde.',
    'auth.login.serverErrorFallback': 'Error al iniciar sesión. Inténtalo de nuevo.',
    'auth.login.tagline': 'La lonja digital del sector primario',
    'auth.login.heroTitle': 'La revolución del campo\nempieza contigo.',
    'auth.login.heroDesc': 'Conecta directamente con productores y compradores del sector primario en España. Sin intermediarios.',
    'auth.login.statPreregistros': 'Pre-registros',
    'auth.login.statMarketplace': 'Marketplace',
    'auth.login.statSellerFee': 'Comisión vendedor',
    'auth.login.welcome': 'Bienvenido de vuelta',
    'auth.login.subtitleCard': 'Inicia sesión en tu cuenta',
    'auth.login.emailPlaceholder': 'tu@empresa.com',
    'auth.login.emailInvalid': 'Email no válido',
    'auth.login.passwordRequired': 'La contraseña es obligatoria',
    'auth.login.passwordInvalid': 'Contraseña no válida',
    'auth.login.or': 'o',
    'auth.login.registerNow': 'Regístrate ahora',
    'auth.login.endorsedBy': 'Respaldado por Santander X Explorer y ESIC Emprendedores',
    'auth.register.title': 'Crear cuenta',
    'auth.register.haveAccount': '¿Ya tienes cuenta?',
    'auth.register.signIn': 'Iniciar sesión',
    'auth.register.tagline': 'Crea tu cuenta',
    'auth.register.heroTitle': 'Únete al marketplace agrícola B2B más innovador',
    'auth.register.heroDesc': 'Más de 100 empresas ya confían en Primar-IA para conectar con el sector primario español.',
    'auth.register.stepOf': 'Paso {n} de 4',
    'auth.register.stepAccount': 'Cuenta',
    'auth.register.stepCompany': 'Empresa',
    'auth.register.stepDocs': 'Documentos',
    'auth.register.stepLegal': 'Legal',
    'auth.register.successTitle': '¡Registro recibido!',
    'auth.register.successDesc': 'Verificaremos tu información y recibirás confirmación sobre el estado de tu solicitud en breve.',
    'auth.register.labelEmail': 'E-mail',
    'auth.register.labelPassword': 'Contraseña',
    'auth.register.backToLogin': 'Volver al inicio de sesión',
    'auth.register.timeout': 'Tiempo de conexión agotado. Inténtalo de nuevo.',
    'auth.register.serverErrorFallback': 'Error en el registro. Inténtalo de nuevo.',
    'auth.logout.confirm': '¿Cerrar sesión?',
    'profile.title': 'Mi perfil',
    'profile.language': 'Idioma de la plataforma',
    'profile.language.es': 'Español',
    'profile.language.en': 'English',
    'profile.language.help': 'Cambia el idioma de toda la interfaz.',
    'profile.save': 'Guardar cambios',
    'profile.saved': 'Cambios guardados',
    'dashboard.welcome': 'Bienvenido',
    'dashboard.actions': 'Acciones requeridas',
    'dashboard.noTasks': 'No tienes tareas pendientes',
    'dashboard.buyerWelcome': '¡Bienvenido de nuevo!',
    'dashboard.buyerSubtitle': 'Aquí tienes un resumen de tus pedidos.',
    'dashboard.buyerNewOrder': 'Crear pedido nuevo',
    'dashboard.sellerWelcome': '¡Bienvenido de nuevo!',
    'dashboard.sellerSubtitle': 'Aquí tienes un resumen de tus lotes.',
    'dashboard.sellerNewLot': 'Crear lote nuevo',
    'dashboard.kpi.ordersInProgress': 'Pedidos en curso',
    'dashboard.kpi.activeOrders': 'Pedidos activos',
    'dashboard.kpi.totalValue': 'Valor total',
    'dashboard.kpi.committedValue': 'Valor comprometido',
    'dashboard.kpi.pendingDeliveries': 'Entregas pendientes',
    'dashboard.kpi.readyToPay': 'Listo para pagar',
    'dashboard.kpi.activeLots': 'Lotes activos',
    'dashboard.kpi.activeLotsSub': 'Lotes activos o en curso',
    'dashboard.kpi.pendingMatches': 'Matches pendientes',
    'dashboard.kpi.pendingMatchesSub': 'Esperando tu revisión',
    'dashboard.kpi.lotsClosed': 'Lotes cerrados',
    'dashboard.kpi.lotsClosedSub': 'Vendidos o cancelados',
    'dashboard.kpi.matches': 'Matches',
    'dashboard.kpi.loading': 'Cargando…',
    'dashboard.activeOrdersSummary': 'Resumen de pedidos activos',
    'dashboard.activeLotsSummary': 'Resumen de lotes activos',
    'dashboard.recentActivity': 'Actividad reciente',
    'dashboard.noOrdersYet': 'Sin pedidos aún',
    'dashboard.noLotsYet': 'Sin lotes aún',
    'dashboard.createOne': 'Crea uno',
    'dashboard.seasonalCalendar': 'Calendario estacional — España',
    'dashboard.seasonalCalendarSub': 'Temporadas de producción y comercialización por categoría de producto',
    'common.retry': 'Reintentar',
    'pendingBanner.title': 'Cuenta pendiente de aprobación.',
    'pendingBanner.bodySeller': 'Estamos revisando tu solicitud como vendedor.',
    'pendingBanner.bodyBuyer': 'Estamos revisando tu solicitud como comprador.',
    'pendingBanner.bodyClarification': 'Necesitamos información adicional sobre tu cuenta. Revisa tu email o contacta con soporte.',
    'pendingBanner.bodyTail': 'Aprobaremos o declinaremos tu cuenta en menos de 24 h hábiles. Mientras tanto puedes navegar la plataforma, pero no podrás publicar lotes, crear pedidos ni firmar contratos.',
    'common.loading': 'Cargando…',
    'common.error': 'Error',
    'common.cancel': 'Cancelar',
    'common.save': 'Guardar',
    'common.delete': 'Eliminar',
    'common.confirm': 'Confirmar',
    'common.close': 'Cerrar',
    'common.edit': 'Editar',
    'common.back': 'Volver',
  },
  en: {
    'nav.dashboard': 'Dashboard',
    'nav.lots': 'My lots',
    'nav.orders': 'My orders',
    'nav.matches': 'Matches',
    'nav.contracts': 'Contracts',
    'nav.messages': 'Messages',
    'nav.mercado': 'Market',
    'nav.disputes': 'Disputes',
    'nav.analytics': 'Analytics',
    'nav.profile': 'Profile',
    'nav.subscription': 'Subscription',
    'nav.logout': 'Log out',
    'nav.harvest': 'Harvest',
    'role.seller': 'Seller',
    'role.buyer': 'Buyer',
    'sidebar.expand': 'Expand menu',
    'sidebar.collapse': 'Collapse menu',
    'header.notifications': 'Notifications',
    'header.greeting': 'Hi',
    'header.myProfile': 'My profile',
    'header.settings': 'Settings',
    'header.breadcrumbBuyer': 'Buyer',
    'header.breadcrumbSeller': 'Seller',
    'header.breadcrumbOrders': 'Orders',
    'header.breadcrumbLots': 'Lots',
    'header.breadcrumbMessages': 'Messages',
    'header.breadcrumbAnalytics': 'Analytics',
    'header.breadcrumbDisputes': 'Disputes',
    'header.breadcrumbMatches': 'Matches',
    'header.breadcrumbProfile': 'Profile',
    'header.breadcrumbMercado': 'Market',
    'header.breadcrumbSubscription': 'Subscription',
    'header.breadcrumbNew': 'New',
    'header.breadcrumbHarvest': 'Harvest',
    'header.breadcrumbDashboard': 'Dashboard',
    'header.breadcrumbUsers': 'Users',
    'header.breadcrumbCertificates': 'Certificates',
    'header.breadcrumbIncidents': 'Incidents',
    'auth.login.title': 'Sign in',
    'auth.login.subtitle': 'Welcome back to Primar-IA',
    'auth.login.email': 'Email',
    'auth.login.password': 'Password',
    'auth.login.submit': 'Sign in',
    'auth.login.submitting': 'Signing in…',
    'auth.login.forgot': 'Forgot your password?',
    'auth.login.noAccount': 'No account yet?',
    'auth.login.register': 'Register',
    'auth.login.invalidCreds': 'Invalid credentials',
    'auth.login.locked': 'Account temporarily locked. Try again later.',
    'auth.login.serverErrorFallback': 'Could not sign in. Please try again.',
    'auth.login.tagline': 'The digital marketplace for primary sector',
    'auth.login.heroTitle': "The countryside revolution\nstarts with you.",
    'auth.login.heroDesc': 'Connect directly with producers and buyers in the Spanish primary sector. No middlemen.',
    'auth.login.statPreregistros': 'Pre-registrations',
    'auth.login.statMarketplace': 'Marketplace',
    'auth.login.statSellerFee': 'Seller commission',
    'auth.login.welcome': 'Welcome back',
    'auth.login.subtitleCard': 'Sign in to your account',
    'auth.login.emailPlaceholder': 'you@company.com',
    'auth.login.emailInvalid': 'Invalid email',
    'auth.login.passwordRequired': 'Password is required',
    'auth.login.passwordInvalid': 'Invalid password',
    'auth.login.or': 'or',
    'auth.login.registerNow': 'Register now',
    'auth.login.endorsedBy': 'Backed by Santander X Explorer and ESIC Emprendedores',
    'auth.register.title': 'Create account',
    'auth.register.haveAccount': 'Already have an account?',
    'auth.register.signIn': 'Sign in',
    'auth.register.tagline': 'Create your account',
    'auth.register.heroTitle': 'Join the most innovative B2B agri marketplace',
    'auth.register.heroDesc': 'Over 100 companies already trust Primar-IA to connect with the Spanish primary sector.',
    'auth.register.stepOf': 'Step {n} of 4',
    'auth.register.stepAccount': 'Account',
    'auth.register.stepCompany': 'Company',
    'auth.register.stepDocs': 'Documents',
    'auth.register.stepLegal': 'Legal',
    'auth.register.successTitle': 'Registration received!',
    'auth.register.successDesc': "We'll review your information and send you confirmation about the status of your application shortly.",
    'auth.register.labelEmail': 'E-mail',
    'auth.register.labelPassword': 'Password',
    'auth.register.backToLogin': 'Back to sign in',
    'auth.register.timeout': 'Connection timed out. Please try again.',
    'auth.register.serverErrorFallback': 'Registration error. Please try again.',
    'auth.logout.confirm': 'Log out?',
    'profile.title': 'My profile',
    'profile.language': 'Platform language',
    'profile.language.es': 'Español',
    'profile.language.en': 'English',
    'profile.language.help': 'Switch the entire UI language.',
    'profile.save': 'Save changes',
    'profile.saved': 'Changes saved',
    'dashboard.welcome': 'Welcome',
    'dashboard.actions': 'Actions required',
    'dashboard.noTasks': 'No pending tasks',
    'dashboard.buyerWelcome': 'Welcome back!',
    'dashboard.buyerSubtitle': "Here's an overview of your orders.",
    'dashboard.buyerNewOrder': 'Create new order',
    'dashboard.sellerWelcome': 'Welcome back!',
    'dashboard.sellerSubtitle': "Here's an overview of your lots.",
    'dashboard.sellerNewLot': 'Create new lot',
    'dashboard.kpi.ordersInProgress': 'Orders in progress',
    'dashboard.kpi.activeOrders': 'Active orders',
    'dashboard.kpi.totalValue': 'Total value',
    'dashboard.kpi.committedValue': 'Committed value',
    'dashboard.kpi.pendingDeliveries': 'Pending deliveries',
    'dashboard.kpi.readyToPay': 'Ready to pay',
    'dashboard.kpi.activeLots': 'Active lots',
    'dashboard.kpi.activeLotsSub': 'Lots active or in progress',
    'dashboard.kpi.pendingMatches': 'Pending matches',
    'dashboard.kpi.pendingMatchesSub': 'Awaiting your review',
    'dashboard.kpi.lotsClosed': 'Lots closed',
    'dashboard.kpi.lotsClosedSub': 'Sold or cancelled',
    'dashboard.kpi.matches': 'Matches',
    'dashboard.kpi.loading': 'Loading…',
    'dashboard.activeOrdersSummary': 'Active orders summary',
    'dashboard.activeLotsSummary': 'Active lots summary',
    'dashboard.recentActivity': 'Recent activity',
    'dashboard.noOrdersYet': 'No orders yet',
    'dashboard.noLotsYet': 'No lots yet',
    'dashboard.createOne': 'Create one',
    'dashboard.seasonalCalendar': 'Seasonal calendar — Spain',
    'dashboard.seasonalCalendarSub': 'Production and trade seasons by product category',
    'common.retry': 'Retry',
    'pendingBanner.title': 'Account pending approval.',
    'pendingBanner.bodySeller': "We're reviewing your seller application.",
    'pendingBanner.bodyBuyer': "We're reviewing your buyer application.",
    'pendingBanner.bodyClarification': 'We need additional information about your account. Check your email or contact support.',
    'pendingBanner.bodyTail': "We'll approve or decline your account in less than 24 business hours. In the meantime you can browse the platform, but you can't publish lots, create orders or sign contracts.",
    'common.loading': 'Loading…',
    'common.error': 'Error',
    'common.cancel': 'Cancel',
    'common.save': 'Save',
    'common.delete': 'Delete',
    'common.confirm': 'Confirm',
    'common.close': 'Close',
    'common.edit': 'Edit',
    'common.back': 'Back',
  },
};

/** Detecta el idioma del navegador. Sin navigator (SSR) → 'es' default. */
export function detectBrowserLocale(): Locale {
  if (typeof navigator === 'undefined') return 'es';
  const langs = navigator.languages ?? [navigator.language ?? 'es'];
  for (const lang of langs) {
    const code = lang.toLowerCase().slice(0, 2);
    if (SUPPORTED_LOCALES.includes(code as Locale)) return code as Locale;
  }
  return 'es';
}
