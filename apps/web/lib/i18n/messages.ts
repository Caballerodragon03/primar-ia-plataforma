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
  | 'auth.login.errEmailNotVerified'
  | 'auth.login.errAccountRejected'
  | 'auth.login.errAccountSuspended'
  | 'auth.login.errInvalidCredentials'
  | 'auth.verify.title.loading'
  | 'auth.verify.subtitle.loading'
  | 'auth.verify.title.pending'
  | 'auth.verify.body.pending'
  | 'auth.verify.title.error'
  | 'auth.verify.body.errorDefault'
  | 'auth.verify.title.success'
  | 'auth.verify.body.success'
  | 'auth.verify.btn.signIn'
  | 'auth.verify.btn.backLogin'
  | 'auth.verify.btn.newAccount'
  | 'auth.verify.tokenMissing'
  | 'auth.verify.support'
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
  | 'dashboard.action.signContract.one'
  | 'dashboard.action.signContract.many'
  | 'dashboard.action.signContract.desc'
  | 'dashboard.action.authorizePayment.one'
  | 'dashboard.action.authorizePayment.many'
  | 'dashboard.action.authorizePayment.desc'
  | 'dashboard.action.confirmDelivery.one'
  | 'dashboard.action.confirmDelivery.many'
  | 'dashboard.action.confirmDelivery.desc'
  | 'dashboard.action.rateSeller.one'
  | 'dashboard.action.rateSeller.many'
  | 'dashboard.action.rateSeller.desc'
  | 'dashboard.action.rateBuyer.one'
  | 'dashboard.action.rateBuyer.many'
  | 'dashboard.action.rateBuyer.desc'
  | 'dashboard.action.expiredOrders.one'
  | 'dashboard.action.expiredOrders.many'
  | 'dashboard.action.expiredOrders.desc'
  | 'dashboard.action.expiredLots.one'
  | 'dashboard.action.expiredLots.many'
  | 'dashboard.action.expiredLots.desc'
  | 'dashboard.action.unreadMessages.one'
  | 'dashboard.action.unreadMessages.many'
  | 'dashboard.action.unreadMessages.desc'
  | 'dashboard.action.reviewMatches.one'
  | 'dashboard.action.reviewMatches.many'
  | 'dashboard.action.reviewMatches.desc'
  | 'dashboard.action.markShipped.one'
  | 'dashboard.action.markShipped.many'
  | 'dashboard.action.markShipped.desc'
  | 'dashboard.action.sellerSignContract.one'
  | 'dashboard.action.sellerSignContract.many'
  | 'dashboard.action.sellerSignContract.desc'
  // ─── lots/orders list ────────────────────────────────────────────────────
  | 'lots.title'
  | 'lots.newLot'
  | 'lots.empty'
  | 'lots.search'
  | 'lots.tab.all'
  | 'lots.tab.open'
  | 'lots.tab.inProgress'
  | 'lots.tab.full'
  | 'lots.tab.cancelled'
  | 'lots.col.id'
  | 'lots.col.product'
  | 'lots.col.totalKg'
  | 'lots.col.coverage'
  | 'lots.col.status'
  | 'lots.col.availableDate'
  | 'lots.pendingRating'
  | 'lots.rateNow'
  | 'orders.title'
  | 'orders.newOrder'
  | 'orders.empty'
  | 'orders.search'
  | 'orders.tab.all'
  | 'orders.tab.open'
  | 'orders.tab.inProgress'
  | 'orders.tab.covered'
  | 'orders.tab.closed'
  | 'orders.tab.cancelled'
  | 'orders.col.id'
  | 'orders.col.product'
  | 'orders.col.totalKg'
  | 'orders.col.coverage'
  | 'orders.col.status'
  | 'orders.col.deliveryDate'
  | 'orders.pendingRating'
  | 'orders.rateNow'
  // ─── matches page (seller) ──────────────────────────────────────────────
  | 'matches.title'
  | 'matches.loadError'
  | 'matches.hiddenByDelay.title'
  | 'matches.hiddenByDelay.body'
  | 'matches.hiddenByDelay.cta'
  | 'matches.hiddenByDelay.nextVisible'
  | 'dashboard.loadError'
  | 'dashboard.emptyOrdersInline'
  | 'dashboard.emptyOrdersCta'
  | 'dashboard.emptyLotsInline'
  | 'dashboard.emptyLotsCta'
  | 'freeTier.notice.title'
  | 'freeTier.notice.bodyLote'
  | 'freeTier.notice.bodyPedido'
  | 'freeTier.notice.cta'
  | 'seasonalCalendar.favTab'
  | 'seasonalCalendar.emptyFavorites'
  | 'seasonalCalendar.emptyCategory'
  | 'seasonalCalendar.addFav'
  | 'seasonalCalendar.removeFav'
  | 'market.favorites.section'
  | 'market.favorites.starLabel'
  | 'potential.banner.lote'
  | 'potential.banner.pedido'
  | 'potential.banner.calculating'
  | 'potential.banner.singularBuyer'
  | 'potential.banner.pluralBuyer'
  | 'potential.banner.singularSeller'
  | 'potential.banner.pluralSeller'
  | 'lotForm.step1.title'
  | 'lotForm.step1.desc'
  | 'lotForm.step2.title'
  | 'lotForm.step2.desc'
  | 'lotForm.step3.title'
  | 'lotForm.step3.desc'
  | 'lotForm.nextStep'
  | 'lotForm.prevStep'
  | 'orderForm.step1.title'
  | 'orderForm.step1.desc'
  | 'orderForm.step2.title'
  | 'orderForm.step2.desc'
  | 'orderForm.step3.title'
  | 'orderForm.step3.desc'
  | 'orderForm.nextStep'
  | 'orderForm.prevStep'
  | 'matches.subtitle'
  | 'matches.incotermFilter'
  | 'matches.incotermFilterRecommended'
  | 'matches.incotermFilterCount'
  | 'matches.show'
  | 'matches.hide'
  | 'matches.edit'
  | 'matches.reset'
  | 'matches.bestMatchTitle'
  | 'matches.bestMatchSub'
  | 'matches.bestMatchPotential'
  | 'matches.reviewAccept'
  | 'matches.tab.best'
  | 'matches.tab.price'
  | 'matches.tab.distance'
  | 'matches.tab.newest'
  | 'matches.empty.filterHides.one'
  | 'matches.empty.filterHides.many'
  | 'matches.empty.filterHidesDesc'
  | 'matches.empty.noMatches'
  | 'matches.empty.noMatchesDesc'
  | 'matches.marketDemandTitle'
  | 'matches.marketDemandSub'
  | 'matches.marketDemandCalibre'
  | 'matches.marketDemandOrders.one'
  | 'matches.marketDemandOrders.many'
  | 'matches.group.matches.one'
  | 'matches.group.matches.many'
  // ─── match card ─────────────────────────────────────────────────────────
  | 'matchCard.profitability'
  | 'matchCard.yourLot'
  | 'matchCard.price'
  | 'matchCard.destination'
  | 'matchCard.distance'
  | 'matchCard.remainingQty'
  | 'matchCard.notAvailable'
  | 'matchCard.contribute'
  // ─── similar offers ─────────────────────────────────────────────────────
  | 'similar.title'
  | 'similar.subtitle'
  | 'similar.severity.minor'
  | 'similar.severity.moderate'
  | 'similar.severity.major'
  | 'similar.field.calibre'
  | 'similar.field.incoterm'
  | 'similar.field.logistica'
  | 'similar.field.precio'
  | 'similar.field.terminoPago'
  | 'similar.adjust'
  | 'similar.delivery'
  | 'similar.empty'
  | 'similar.errorLoading'
  | 'similar.headerSub.one'
  | 'similar.headerSub.many'
  // ─── order create form ──────────────────────────────────────────────────
  | 'orderForm.title'
  | 'orderForm.commercialDetails'
  | 'orderForm.product'
  | 'orderForm.product.placeholder'
  | 'orderForm.variety'
  | 'orderForm.variety.placeholder'
  | 'orderForm.variety.other'
  | 'orderForm.variety.any'
  | 'orderForm.variety.customPlaceholder'
  | 'orderForm.frequency'
  | 'orderForm.frequency.placeholder'
  | 'orderForm.frequency.weekly'
  | 'orderForm.frequency.biweekly'
  | 'orderForm.frequency.monthly'
  | 'orderForm.frequency.onetime'
  | 'orderForm.destination'
  | 'orderForm.destination.placeholder'
  | 'orderForm.deliveryDate'
  | 'orderForm.noCalibreCheckbox'
  | 'orderForm.quantityKg'
  | 'orderForm.maxPriceKg'
  | 'orderForm.caliber'
  | 'orderForm.caliber.placeholder'
  | 'orderForm.qtyKg'
  | 'orderForm.sellingPriceKg'
  | 'orderForm.addCaliber'
  | 'orderForm.comments'
  | 'orderForm.comments.placeholder'
  | 'orderForm.logisticsTitle'
  | 'orderForm.whoShips'
  | 'orderForm.principalIncoterm'
  | 'orderForm.otherIncoterms'
  | 'orderForm.otherIncotermsHint'
  | 'orderForm.incotermFilteredNote'
  | 'orderForm.paymentTermsTitle'
  | 'orderForm.paymentTermsHelp'
  | 'orderForm.futureLogisticsTitle'
  | 'orderForm.futureLogisticsBadge'
  | 'orderForm.futureLogisticsDesc'
  | 'orderForm.futureLogisticsBtn'
  | 'orderForm.futureLogisticsBtnTitle'
  | 'orderForm.cancel'
  | 'orderForm.publish'
  | 'orderForm.publishing'
  // ─── lot create form ────────────────────────────────────────────────────
  | 'lotForm.title'
  | 'lotForm.productDetails'
  | 'lotForm.product'
  | 'lotForm.product.placeholder'
  | 'lotForm.variety'
  | 'lotForm.variety.placeholder'
  | 'lotForm.variety.other'
  | 'lotForm.variety.customPlaceholder'
  | 'lotForm.noCalibreCheckbox'
  | 'lotForm.estimatedQty'
  | 'lotForm.estimatedQty.placeholder'
  | 'lotForm.caliber'
  | 'lotForm.caliber.placeholder'
  | 'lotForm.caliber.customPlaceholder'
  | 'lotForm.qtyKg'
  | 'lotForm.qtyKg.placeholder'
  | 'lotForm.addCaliber'
  | 'lotForm.logisticsTitle'
  | 'lotForm.location.placeholder'
  | 'lotForm.availableFrom'
  | 'lotForm.availableUntil'
  | 'lotForm.whoShips'
  | 'lotForm.acceptedIncoterms'
  | 'lotForm.acceptedIncotermsHint'
  | 'lotForm.recommendedByProfile'
  | 'lotForm.dontShow'
  | 'lotForm.dontShowTitle'
  | 'lotForm.incotermFilteredNote'
  | 'lotForm.paymentTermsTitle'
  | 'lotForm.paymentTermsHelp'
  | 'lotForm.extraInfoTitle'
  | 'lotForm.certificates'
  | 'lotForm.certificates.empty'
  | 'lotForm.photos'
  | 'lotForm.photos.upload'
  | 'lotForm.photos.error'
  | 'lotForm.extraComments'
  | 'lotForm.extraComments.placeholder'
  | 'lotForm.saveDraft'
  | 'lotForm.publish'
  | 'lotForm.publishing'
  // ─── seller contract page ───────────────────────────────────────────────
  | 'contract.notFound'
  | 'contract.backToMatches'
  | 'contract.sellerTitle'
  | 'contract.summary'
  | 'contract.summary.product'
  | 'contract.summary.quantity'
  | 'contract.summary.pricePerKg'
  | 'contract.summary.totalGoods'
  | 'contract.summary.incoterm'
  | 'contract.summary.paymentTerms'
  | 'contract.summary.destination'
  | 'contract.summary.calibres'
  | 'contract.summary.transferHint'
  | 'contract.commission.title'
  | 'contract.commission.amount'
  | 'contract.commission.percent'
  | 'contract.commission.helpSeller'
  | 'contract.document'
  | 'contract.document.download'
  | 'contract.document.watermark'
  | 'contract.signatures'
  | 'contract.signatures.sellerYou'
  | 'contract.signatures.buyer'
  | 'contract.signatures.signedOn'
  | 'contract.signatures.pendingYours'
  | 'contract.signatures.buyerWillSignLater'
  | 'contract.sign.needTitle'
  | 'contract.sign.needDesc'
  | 'contract.sign.deadlineWord'
  | 'contract.sign.deadlineTail'
  | 'contract.sign.btn'
  | 'contract.sign.modify'
  | 'contract.sign.cancel'
  | 'contract.sign.drawHere'
  | 'contract.sign.clear'
  | 'contract.sign.confirm'
  | 'contract.sign.cancelDraw'
  | 'contract.waitingBuyer.title'
  | 'contract.waitingBuyer.desc.before'
  | 'contract.waitingBuyer.desc.after'
  | 'contract.waitingBuyer.openChat'
  | 'contract.waitingBuyer.cancel'
  | 'contract.expired.title'
  | 'contract.expired.desc'
  | 'contract.cancelled.title'
  | 'contract.cancelled.byYou'
  | 'contract.cancelled.byBuyer'
  | 'contract.cancelled.reason'
  | 'contract.cancelled.back'
  | 'contract.signed.title'
  | 'contract.signed.desc'
  | 'contract.docs.title'
  | 'contract.docs.intro'
  | 'contract.docs.sellerInvoice'
  | 'contract.docs.platformInvoice'
  // buyer-only contract keys
  | 'contract.buyerTitle'
  | 'contract.backToOrders'
  | 'contract.summary.amountToSeller'
  | 'contract.commission.amountToPay'
  | 'contract.commission.helpBuyer'
  | 'contract.document.watermarkBuyer'
  | 'contract.signatures.seller'
  | 'contract.signatures.buyerYou'
  | 'contract.signatures.sellerPending'
  | 'contract.signatures.buyerWillSignOnPay'
  | 'contract.sellerNotSignedYet'
  | 'contract.sellerSignedBanner.title'
  | 'contract.sellerSignedBanner.before'
  | 'contract.sellerSignedBanner.deadlineWord'
  | 'contract.sellerSignedBanner.after'
  | 'contract.signAndPay'
  | 'contract.deadlineExpiredBuyer.title'
  | 'contract.deadlineExpiredBuyer.desc'
  | 'contract.openSellerChat'
  | 'contract.expired.descBuyer'
  | 'contract.cancelled.byBuyerSelf'
  | 'contract.cancelled.bySeller'
  | 'contract.cancelled.backToOrders'
  | 'contract.signed.titleBuyer'
  | 'contract.signed.descBuyer'
  | 'contract.docs.introBuyer'
  | 'contract.docs.escrow'
  | 'contract.docs.escrowSub'
  | 'contract.docs.sellerInvoiceBuyer'
  | 'contract.docs.platformInvoiceBuyer'
  | 'contract.docs.watermarkAmber'
  // sign modal
  | 'contract.signModal.title'
  | 'contract.signModal.warning1'
  | 'contract.signModal.warning2'
  | 'contract.signModal.fieldLabel'
  | 'contract.signModal.placeholder'
  | 'contract.signModal.fieldHelp'
  | 'contract.signModal.ack'
  | 'contract.signModal.cancel'
  | 'contract.signModal.confirm'
  // payment banners
  | 'contract.payment.processing.title'
  | 'contract.payment.processing.desc'
  | 'contract.payment.finalizing.title'
  | 'contract.payment.finalizing.desc1'
  | 'contract.payment.finalizing.desc2'
  | 'contract.payment.refresh'
  | 'contract.payment.reconcile'
  | 'contract.payment.stuck.title'
  | 'contract.payment.stuck.desc'
  | 'contract.payment.cancelled.title'
  | 'contract.payment.cancelled.desc'
  | 'contract.downloadFail'
  // ─── chat ────────────────────────────────────────────────────────────────
  | 'chat.title'
  | 'chat.empty'
  | 'chat.selectConv'
  | 'chat.orderHash'
  | 'chat.noMessages'
  | 'chat.bypassDetected'
  | 'chat.close'
  | 'chat.privacy'
  | 'chat.estado.completed'
  | 'chat.estado.cancelled'
  | 'chat.estado.refunded'
  | 'chat.banner.completed'
  | 'chat.banner.cancelled'
  | 'chat.banner.refunded'
  | 'chat.actions.propose'
  | 'chat.actions.proposeTitle'
  | 'chat.actions.attach'
  | 'chat.actions.attachTitle'
  | 'chat.placeholder'
  | 'chat.send'
  | 'chat.sendFail'
  // ─── register steps ──────────────────────────────────────────────────────
  | 'register.step1.accountType'
  | 'register.step1.seller'
  | 'register.step1.buyer'
  | 'register.step1.email'
  | 'register.step1.emailPh'
  | 'register.step1.password'
  | 'register.step1.passwordHint'
  | 'register.step1.confirmPassword'
  | 'register.step1.phone'
  | 'register.step1.language'
  | 'register.step1.continue'
  | 'register.step2.companyHeader'
  | 'register.step2.razonSocial'
  | 'register.step2.razonSocialPh'
  | 'register.step2.legalForm'
  | 'register.step2.legalFormPh'
  | 'register.step2.cifNif'
  | 'register.step2.cifNifHint'
  | 'register.step2.addressHeader'
  | 'register.step2.street'
  | 'register.step2.streetPh'
  | 'register.step2.city'
  | 'register.step2.zip'
  | 'register.step2.country'
  | 'register.step2.legalContactHeader'
  | 'register.step2.name'
  | 'register.step2.lastName'
  | 'register.step2.position'
  | 'register.step2.positionPh'
  | 'register.step2.sellerBankHeader'
  | 'register.step2.sellerBankDesc'
  | 'register.step2.iban'
  | 'register.step2.ibanHint'
  | 'register.step2.swift'
  | 'register.step2.swiftPh'
  | 'register.step2.regimenFiscal'
  | 'register.step2.regimenFiscalPh'
  | 'register.step2.regimenGeneral'
  | 'register.step2.regimenAgrario'
  | 'register.step2.regimenRecargo'
  | 'register.step2.regimenExento'
  | 'register.step2.ibanInvalid'
  | 'register.step2.regimenMissing'
  | 'register.step2.back'
  | 'register.step2.continue'
  | 'register.step3.optionalDocs'
  | 'register.step3.seller.land'
  | 'register.step3.seller.landHint'
  | 'register.step3.seller.gap'
  | 'register.step3.seller.gapHint'
  | 'register.step3.seller.organic'
  | 'register.step3.seller.organicHint'
  | 'register.step3.buyer.registration'
  | 'register.step3.buyer.registrationHint'
  | 'register.step3.buyer.license'
  | 'register.step3.buyer.licenseHint'
  | 'register.step3.back'
  | 'register.step3.continue'
  | 'register.step4.review'
  | 'register.step4.termsAccept'
  | 'register.step4.terms'
  | 'register.step4.privacyAccept'
  | 'register.step4.privacy'
  | 'register.step4.back'
  | 'register.step4.submit'
  // ─── subscription pages ──────────────────────────────────────────────────
  | 'subscription.title'
  | 'subscription.subtitleSeller'
  | 'subscription.subtitleBuyer'
  | 'subscription.success'
  | 'subscription.cancelled'
  | 'subscription.errorCheckout'
  | 'subscription.changed.upgradedNow'
  | 'subscription.changed.downgradeScheduled'
  | 'subscription.changed.cancelScheduled'
  | 'subscription.banner.downgradePending'
  | 'subscription.banner.cancelPending'
  | 'subscription.confirm.upgradeTitle'
  | 'subscription.confirm.upgradeBody'
  | 'subscription.confirm.upgradeCta'
  | 'subscription.confirm.downgradeTitle'
  | 'subscription.confirm.downgradeBody'
  | 'subscription.confirm.downgradeCta'
  | 'subscription.confirm.cancelTitle'
  | 'subscription.confirm.cancelBody'
  | 'subscription.confirm.cancelCta'
  | 'subscription.confirm.keepPlan'
  | 'subscription.confirm.giftTitle'
  | 'subscription.confirm.giftBody'
  | 'subscription.confirm.giftCta'
  | 'subscription.confirm.giftLoading'
  | 'subscription.confirm.giftApplied'
  | 'subscription.currentPlan'
  | 'subscription.manage'
  | 'subscription.activeLots'
  | 'subscription.activeOrders'
  | 'subscription.breakdown.searching'
  | 'subscription.breakdown.dealing'
  | 'subscription.breakdown.reserved'
  | 'subscription.itemLot'
  | 'subscription.itemOrder'
  | 'subscription.redirecting'
  // ─── disputes ────────────────────────────────────────────────────────────
  | 'disputes.title'
  | 'disputes.none'
  | 'disputes.role.buyer'
  | 'disputes.role.seller'
  | 'disputes.role.admin'
  | 'disputes.estado.open'
  | 'disputes.estado.sellerResponded'
  | 'disputes.estado.inReview'
  | 'disputes.estado.resolved'
  | 'disputes.back'
  | 'disputes.opened'
  | 'disputes.notFound'
  | 'disputes.yourDescription'
  | 'disputes.buyerClaim'
  | 'disputes.evidence'
  | 'disputes.sellerResponseTitle'
  | 'disputes.sellerEvidence'
  | 'disputes.yourResponse'
  | 'disputes.yourEvidence'
  | 'disputes.respondPromptDesc'
  | 'disputes.respondPromptBtn'
  | 'disputes.respondFormTitle'
  | 'disputes.respondFormPh'
  | 'disputes.uploading'
  | 'disputes.addEvidence'
  | 'disputes.respondFail'
  | 'disputes.cancel'
  | 'disputes.submitResponse'
  | 'disputes.chatTitle'
  | 'disputes.chatEmpty'
  | 'disputes.chatPlaceholder'
  // ─── lot detail ──────────────────────────────────────────────────────────
  | 'lotDetail.loadFail'
  | 'lotDetail.notFound'
  | 'lotDetail.backToLots'
  | 'lotDetail.lotHash'
  | 'lotDetail.created'
  | 'lotDetail.publishFail'
  | 'lotDetail.cancelConfirmWithMatches'
  | 'lotDetail.cancelConfirm'
  | 'lotDetail.cancelFail'
  | 'lotDetail.hiddenMatches.one'
  | 'lotDetail.hiddenMatches.many'
  | 'lotDetail.hiddenMatchesDesc'
  | 'lotDetail.coverage'
  | 'lotDetail.totalKg'
  | 'lotDetail.committedKg'
  | 'lotDetail.calibres'
  | 'lotDetail.col.calibre'
  | 'lotDetail.col.quantity'
  | 'lotDetail.col.percent'
  | 'lotDetail.noCalibres'
  | 'lotDetail.activeMatches'
  | 'lotDetail.noMatches'
  | 'lotDetail.noMatchesHint'
  | 'lotDetail.action.openChat'
  | 'lotDetail.action.viewContract'
  | 'lotDetail.action.downloadInvoice'
  | 'lotDetail.action.openDispute'
  | 'lotDetail.details'
  | 'lotDetail.product'
  | 'lotDetail.category'
  | 'lotDetail.variety'
  | 'lotDetail.type'
  | 'lotDetail.typeDirect'
  | 'lotDetail.typeAuction'
  | 'lotDetail.availability'
  | 'lotDetail.location'
  | 'lotDetail.certifications'
  | 'lotDetail.comments'
  | 'lotDetail.actions'
  | 'lotDetail.publish'
  | 'lotDetail.edit'
  | 'lotDetail.cancel'
  // ─── order detail ────────────────────────────────────────────────────────
  | 'orderDetail.loadFail'
  | 'orderDetail.notFound'
  | 'orderDetail.backToOrders'
  | 'orderDetail.title'
  | 'orderDetail.coverage'
  | 'orderDetail.edit'
  | 'orderDetail.close'
  | 'orderDetail.contract'
  | 'orderDetail.cancelConfirmWithContrib'
  | 'orderDetail.cancelConfirm'
  | 'orderDetail.cancelFail'
  | 'orderDetail.rejectConfirm'
  | 'orderDetail.rejectReason'
  | 'orderDetail.rejectFail'
  | 'orderDetail.hiddenMatches.one'
  | 'orderDetail.hiddenMatches.many'
  | 'orderDetail.closedTitle'
  | 'orderDetail.closedDesc'
  | 'orderDetail.acceptedContrib.one'
  | 'orderDetail.acceptedContrib.many'
  | 'orderDetail.acceptedDesc'
  | 'orderDetail.signAndPay'
  | 'orderDetail.preAuthTitle'
  | 'orderDetail.preAuthDesc'
  | 'orderDetail.requestedCalibres'
  | 'orderDetail.col.calibre'
  | 'orderDetail.col.quantity'
  | 'orderDetail.col.maxPrice'
  | 'orderDetail.noCalibres'
  | 'orderDetail.sellerOffers'
  | 'orderDetail.noOffers'
  | 'orderDetail.noOffersHint'
  | 'orderDetail.matchScore'
  | 'orderDetail.totalLabel'
  | 'orderDetail.proposalReadyPulse'
  | 'orderDetail.rejectProposal'
  | 'orderDetail.completed'
  | 'orderDetail.invoice'
  | 'orderDetail.viewContract'
  | 'orderDetail.openChat'
  | 'orderDetail.openDispute'
  | 'orderDetail.shipmentFrom'
  | 'orderDetail.delivered'
  | 'orderDetail.lotPhotos'
  | 'orderDetail.deliveryReceivedPrompt'
  | 'orderDetail.qrCodePlaceholder'
  | 'orderDetail.confirm'
  | 'orderDetail.qrHelp'
  | 'orderDetail.codeFail'
  | 'orderDetail.codeMissing'
  | 'orderDetail.deliveryConfirmed'
  | 'orderDetail.alreadyRated'
  | 'orderDetail.rateSeller'
  | 'orderDetail.waitingSellerSig'
  | 'orderDetail.sellerSignedAwaitYou'
  | 'orderDetail.bothSignedAwaitShipment'
  | 'orderDetail.details'
  | 'orderDetail.product'
  | 'orderDetail.variety'
  | 'orderDetail.totalQty'
  | 'orderDetail.incoterm'
  | 'orderDetail.destination'
  | 'orderDetail.frequency'
  | 'orderDetail.deliveryBy'
  | 'orderDetail.notes'
  | 'orderDetail.proposalTooltip'
  | 'orderDetail.matchEstado.PROPUESTO'
  | 'orderDetail.matchEstado.ENVIADO_VENDEDOR'
  | 'orderDetail.matchEstado.ACEPTADO_VENDEDOR'
  | 'orderDetail.matchEstado.RECHAZADO_VENDEDOR'
  | 'orderDetail.matchEstado.PENDIENTE_PAGO'
  | 'orderDetail.matchEstado.CONFIRMADO'
  | 'orderDetail.matchEstado.CANCELADO'
  // ─── edit forms ──────────────────────────────────────────────────────────
  | 'editOrder.title'
  | 'editOrder.loadFail'
  | 'editOrder.saveFail'
  | 'editOrder.committedBanner'
  | 'editOrder.detailsHeader'
  | 'editOrder.caliber'
  | 'editOrder.selectCaliber'
  | 'editOrder.qtyKg'
  | 'editOrder.maxPrice'
  | 'editOrder.addCaliber'
  | 'editOrder.selectIncoterm'
  | 'editOrder.finalDest'
  | 'editOrder.finalDestPh'
  | 'editOrder.frequency'
  | 'editOrder.frequencyPh'
  | 'editOrder.deliveryDate'
  | 'editOrder.notes'
  | 'editOrder.notesPh'
  | 'editOrder.cancel'
  | 'editOrder.save'
  | 'editLot.title'
  | 'editLot.loadFail'
  | 'editLot.saveFail'
  | 'editLot.committedBanner'
  | 'editLot.focusHint'
  | 'editLot.focus.calibre'
  | 'editLot.focus.precio'
  | 'editLot.focus.incoterm'
  | 'editLot.focus.logistica'
  | 'editLot.focus.terminoPago'
  | 'editLot.calibresHeader'
  | 'editLot.priceNoteCommitted'
  | 'editLot.minPrice'
  | 'editLot.commercialHeader'
  | 'editLot.whoShips'
  | 'editLot.logIndiff'
  | 'editLot.incotermsAccepted'
  | 'editLot.paymentTermsAccepted'
  | 'editLot.locationHeader'
  | 'editLot.pickup'
  | 'editLot.availableFrom'
  | 'editLot.comments'
  | 'editLot.commentsPh'
  // ─── cancel contract modal ───────────────────────────────────────────────
  | 'cancelModal.title'
  | 'cancelModal.warning'
  | 'cancelModal.reasonLabel'
  | 'cancelModal.reasonPh'
  | 'cancelModal.charCount'
  | 'cancelModal.ack'
  | 'cancelModal.reasonMin'
  | 'cancelModal.ackRequired'
  | 'cancelModal.fail'
  | 'cancelModal.no'
  | 'cancelModal.yes'
  // ─── rating modal ────────────────────────────────────────────────────────
  | 'rating.title'
  | 'rating.close'
  | 'rating.alreadyRated'
  | 'rating.successMsg'
  | 'rating.allRequired'
  | 'rating.submitFail'
  | 'rating.commentLabel'
  | 'rating.commentPh'
  | 'rating.cancel'
  | 'rating.submit'
  | 'rating.starsAria'
  | 'rating.eje.calidad'
  | 'rating.eje.puntualidadDelivery'
  | 'rating.eje.empaquetado'
  | 'rating.eje.comunicacion'
  | 'rating.eje.profesionalidad'
  | 'rating.eje.puntualidadPago'
  // ─── shipping events section ─────────────────────────────────────────────
  | 'shipping.title'
  | 'shipping.shipmentLabel'
  | 'shipping.shipmentMarked'
  | 'shipping.shipmentPending'
  | 'shipping.receiptLabel'
  | 'shipping.receiptMarked'
  | 'shipping.receiptPending'
  | 'shipping.markShipped'
  | 'shipping.markShippedFail'
  | 'shipping.confirmReceived'
  | 'shipping.confirmReceivedFail'
  | 'shipping.rateCounterpart'
  | 'shipping.alreadyRated'
  | 'shipping.waitingBuyerReceipt'
  | 'shipping.openChat'
  // ─── dispute modal ───────────────────────────────────────────────────────
  | 'dispute.title'
  | 'dispute.filingAsBuyer'
  | 'dispute.filingAsSeller'
  | 'dispute.product'
  | 'dispute.buyerCounterpart'
  | 'dispute.sellerCounterpart'
  | 'dispute.selectPromptBuyer'
  | 'dispute.selectPromptSeller'
  | 'dispute.describeLabel'
  | 'dispute.describeMin'
  | 'dispute.describePhSeller'
  | 'dispute.describePhBuyer'
  | 'dispute.reviewNote'
  | 'dispute.reviewNoteBuyer'
  | 'dispute.reviewNoteSeller'
  | 'dispute.evidenceLabel'
  | 'dispute.uploading'
  | 'dispute.addEvidence'
  | 'dispute.uploadFail'
  | 'dispute.submitFail'
  | 'dispute.successTitle'
  | 'dispute.successDesc'
  | 'dispute.back'
  | 'dispute.submit'
  | 'dispute.cancel'
  | 'dispute.continue'
  | 'dispute.problemBuyer.calidad.label'
  | 'dispute.problemBuyer.calidad.desc'
  | 'dispute.problemBuyer.cantidad.label'
  | 'dispute.problemBuyer.cantidad.desc'
  | 'dispute.problemBuyer.empaquetado.label'
  | 'dispute.problemBuyer.empaquetado.desc'
  | 'dispute.problemBuyer.calibres.label'
  | 'dispute.problemBuyer.calibres.desc'
  | 'dispute.problemBuyer.productoDif.label'
  | 'dispute.problemBuyer.productoDif.desc'
  | 'dispute.problemBuyer.retraso.label'
  | 'dispute.problemBuyer.retraso.desc'
  | 'dispute.problemBuyer.otro.label'
  | 'dispute.problemBuyer.otro.desc'
  | 'dispute.problemSeller.pago.label'
  | 'dispute.problemSeller.pago.desc'
  | 'dispute.problemSeller.noResponde.label'
  | 'dispute.problemSeller.noResponde.desc'
  | 'dispute.problemSeller.rechazo.label'
  | 'dispute.problemSeller.rechazo.desc'
  | 'dispute.problemSeller.logistica.label'
  | 'dispute.problemSeller.logistica.desc'
  | 'dispute.problemSeller.datos.label'
  | 'dispute.problemSeller.datos.desc'
  | 'dispute.problemSeller.cancelacion.label'
  | 'dispute.problemSeller.cancelacion.desc'
  | 'dispute.problemSeller.otro.label'
  | 'dispute.problemSeller.otro.desc'
  // ─── negotiation card ────────────────────────────────────────────────────
  | 'negCard.ownProposal'
  | 'negCard.receivedProposal'
  | 'negCard.estado.pending'
  | 'negCard.estado.accepted'
  | 'negCard.estado.rejected'
  | 'negCard.estado.superseded'
  | 'negCard.currentSuffix'
  | 'negCard.proposed'
  | 'negCard.field.price'
  | 'negCard.field.incoterm'
  | 'negCard.field.logistics'
  | 'negCard.field.payment'
  | 'negCard.field.calibres'
  | 'negCard.calibresShort'
  | 'negCard.reject'
  | 'negCard.counter'
  | 'negCard.accept'
  | 'negCard.acceptFail'
  | 'negCard.rejectFail'
  | 'negCard.waitingResponse'
  // ─── negotiation offer modal ─────────────────────────────────────────────
  | 'negModal.titlePropose'
  | 'negModal.titleCounter'
  | 'negModal.logistics'
  | 'negModal.noChange'
  | 'negModal.incoterm'
  | 'negModal.filteredByLog'
  | 'negModal.paymentTerm'
  | 'negModal.calibresHeader'
  | 'negModal.editCalibres'
  | 'negModal.cancelEdit'
  | 'negModal.noCalibres'
  | 'negModal.col.caliber'
  | 'negModal.col.qty'
  | 'negModal.col.price'
  | 'negModal.addCalibre'
  | 'negModal.noContextCalibres'
  | 'negModal.maxKg'
  | 'negModal.maxKgSplit'
  | 'negModal.errNoChange'
  | 'negModal.errOverMax'
  | 'negModal.submitFail'
  | 'negModal.cancel'
  | 'negModal.submit'
  | 'negModal.submitCounter'
  | 'negModal.pricePh'
  // ─── messages pages ──────────────────────────────────────────────────────
  | 'messagesPage.title'
  | 'messagesPage.subtitleSeller'
  | 'messagesPage.subtitleBuyer'
  // ─── analytics ───────────────────────────────────────────────────────────
  | 'analytics.sellerTitle'
  | 'analytics.buyerTitle'
  | 'analytics.empty'
  | 'analytics.emptySellerHint'
  | 'analytics.emptyBuyerHint'
  | 'analytics.kpi.totalOrders'
  | 'analytics.kpi.totalSpend'
  | 'analytics.kpi.volumePurchased'
  | 'analytics.kpi.avgPrice'
  | 'analytics.kpi.totalVolMatched'
  | 'analytics.kpi.totalValue'
  | 'analytics.kpi.lotsSold'
  | 'analytics.kpi.subActiveCovered'
  | 'analytics.kpi.subFromCommitted'
  | 'analytics.kpi.subAllOrders'
  | 'analytics.kpi.subWeighted'
  | 'analytics.kpi.subFromConfirmed'
  | 'analytics.kpi.subAcrossCalibres'
  | 'analytics.kpi.subOfTotal'
  | 'analytics.kpi.subActiveLotsOne'
  | 'analytics.kpi.subActiveLotsMany'
  | 'analytics.volBuyerHeader'
  | 'analytics.volSellerHeader'
  | 'analytics.topProductsBuyer'
  | 'analytics.topProductsSeller'
  | 'analytics.ordersByCategory'
  | 'analytics.topSellers'
  | 'analytics.noMatchedVolume'
  | 'analytics.noMatchedVolumeSeller'
  | 'analytics.noProductData'
  | 'analytics.noProductDataSeller'
  | 'analytics.noCategoryData'
  | 'analytics.noSellerData'
  | 'analytics.searchSellers'
  | 'analytics.noSellerDataAvailable'
  | 'analytics.lotSummary'
  | 'analytics.lotSummary.total'
  | 'analytics.lotSummary.active'
  | 'analytics.lotSummary.sold'
  | 'analytics.col.farmer'
  | 'analytics.col.volume'
  | 'analytics.col.value'
  | 'analytics.col.matches'
  | 'analytics.tooltip.volume'
  | 'analytics.tooltip.orders'
  // ─── subscription components ─────────────────────────────────────────────
  | 'credits.title'
  | 'credits.now'
  | 'credits.nextIn'
  | 'credits.atMax'
  | 'credits.empty'
  | 'plan.popular'
  | 'plan.free'
  | 'plan.perMonth'
  | 'plan.current'
  | 'plan.upgrade'
  | 'plan.seller.cosecha.name'
  | 'plan.seller.campo.name'
  | 'plan.seller.finca.name'
  | 'plan.buyer.mercado.name'
  | 'plan.buyer.lonja.name'
  | 'plan.buyer.central.name'
  | 'plan.badge.campo'
  | 'plan.badge.finca'
  | 'plan.badge.lonja'
  | 'plan.badge.central'
  | 'plan.feature.lotes3'
  | 'plan.feature.photos3'
  | 'plan.feature.matches15min'
  | 'plan.feature.analytics30d'
  | 'plan.feature.certs3'
  | 'plan.feature.negotiation'
  | 'plan.feature.lotes15'
  | 'plan.feature.photos10'
  | 'plan.feature.matchesNow'
  | 'plan.feature.analyticsFull'
  | 'plan.feature.certs5'
  | 'plan.feature.exportCsv'
  | 'plan.feature.harvestEstim'
  | 'plan.feature.support24h'
  | 'plan.feature.lotesUnlimited'
  | 'plan.feature.photosUnlimited'
  | 'plan.feature.matchesAlerts'
  | 'plan.feature.analyticsTrends'
  | 'plan.feature.certsUnlimited'
  | 'plan.feature.exportCsvPdf'
  | 'plan.feature.supportPhone'
  | 'plan.feature.orders5'
  | 'plan.feature.commissionStandard'
  | 'plan.feature.invoiceDownload'
  | 'plan.feature.orders20'
  | 'plan.feature.ordersUnlimited'
  | 'plan.feature.commissionDiscount'
  | 'plan.feature.exportStats'
  | 'plan.feature.supportDedicated'
  | 'plan.feature.credits3regenWeek'
  | 'plan.feature.creditsUnlimited'
  | 'plan.feature.commissionMore'
  | 'commissions.back'
  | 'commissions.title'
  | 'commissions.intro'
  | 'commissions.whoPays.title'
  | 'commissions.whoPays.body'
  | 'commissions.baseTiers.title'
  | 'commissions.baseTiers.desc'
  | 'commissions.baseTiers.colTicket'
  | 'commissions.baseTiers.colPct'
  | 'commissions.planDiscount.title'
  | 'commissions.planDiscount.desc'
  | 'commissions.planDiscount.colPlan'
  | 'commissions.planDiscount.colDiscount'
  | 'commissions.volumeDiscount.title'
  | 'commissions.volumeDiscount.desc'
  | 'commissions.volumeDiscount.colVolume'
  | 'commissions.volumeDiscount.colDiscount'
  | 'commissions.caps.title'
  | 'commissions.caps.min'
  | 'commissions.caps.max'
  | 'commissions.caps.floor'
  | 'commissions.calc.title'
  | 'commissions.calc.desc'
  | 'commissions.calc.amountLabel'
  | 'commissions.calc.volumeLabel'
  | 'commissions.calc.volumeHint'
  | 'commissions.calc.tierFree'
  | 'commissions.calc.tierMid'
  | 'commissions.calc.tierTop'
  | 'commissions.calc.rowBase'
  | 'commissions.calc.rowPlanDisc'
  | 'commissions.calc.rowVolDisc'
  | 'commissions.calc.rowFinalPct'
  | 'commissions.calc.rowCommission'
  | 'commissions.calc.savings'
  | 'commissions.calc.note'
  | 'commissions.footer'
  // ─── IncotermWizard ──────────────────────────────────────────────────────
  | 'incotermWizard.title'
  | 'incotermWizard.q1'
  | 'incotermWizard.q1.iShip'
  | 'incotermWizard.q1.otherPicks'
  | 'incotermWizard.q1.indifferent'
  | 'incotermWizard.q2'
  | 'incotermWizard.q2.exwLabel'
  | 'incotermWizard.q2.exwDesc'
  | 'incotermWizard.q2.fcaLabel'
  | 'incotermWizard.q2.fcaDesc'
  | 'incotermWizard.q3'
  | 'incotermWizard.q3.localTransportLabel'
  | 'incotermWizard.q3.localTransportDesc'
  | 'incotermWizard.q3.fullDoorLabel'
  | 'incotermWizard.q3.fullDoorDesc'
  | 'incotermWizard.recommended'
  | 'incotermWizard.acceptedInList'
  | 'incotermWizard.willAdd'
  | 'incotermWizard.back'
  | 'incotermWizard.cancel'
  | 'incotermWizard.apply'
  | 'incotermWizard.open'
  | 'incotermWizard.progress.question'
  | 'incotermWizard.progress.results'
  | 'incotermWizard.welcome.title'
  | 'incotermWizard.welcome.desc'
  | 'incotermWizard.welcome.start'
  | 'incotermWizard.prev'
  | 'incotermWizard.next'
  | 'incotermWizard.results.title'
  | 'incotermWizard.results.desc'
  | 'incotermWizard.results.selectOthers'
  | 'incotermWizard.results.back'
  | 'incotermWizard.results.confirm'
  | 'incotermWizard.q.v1.text'
  | 'incotermWizard.q.v1.nacional'
  | 'incotermWizard.q.v1.ue'
  | 'incotermWizard.q.v1.extraue'
  | 'incotermWizard.q.v2.text'
  | 'incotermWizard.q.v2.comprador'
  | 'incotermWizard.q.v2.vendedor'
  | 'incotermWizard.q.v2.compartido'
  | 'incotermWizard.q.v3.text'
  | 'incotermWizard.q.v3.comprador'
  | 'incotermWizard.q.v3.vendedor'
  | 'incotermWizard.q.v3.ninguno'
  | 'incotermWizard.q.v4.text'
  | 'incotermWizard.q.v4.si'
  | 'incotermWizard.q.v4.no'
  | 'incotermWizard.q.v5.text'
  | 'incotermWizard.q.v5.recogida'
  | 'incotermWizard.q.v5.entrega'
  | 'incotermWizard.q.v5.puerto'
  // ─── MarketDashboard ─────────────────────────────────────────────────────
  | 'market.title'
  | 'market.subtitle'
  | 'market.loadFail'
  | 'market.lastUpdated'
  | 'market.filterProduct'
  | 'market.allProducts'
  | 'market.filterCategory'
  | 'market.allCategories'
  | 'market.empty'
  | 'market.emptyHint'
  | 'market.col.product'
  | 'market.col.variety'
  | 'market.col.category'
  | 'market.col.priceAvg'
  | 'market.col.priceMin'
  | 'market.col.priceMax'
  | 'market.col.volume'
  | 'market.col.matches'
  | 'market.col.trend'
  | 'market.trend.up'
  | 'market.trend.down'
  | 'market.trend.flat'
  | 'market.searchPh'
  | 'market.noResults'
  | 'market.export'
  | 'market.totalProducts'
  | 'market.totalVolume'
  | 'market.totalMatches'
  | 'market.avgPrice'
  | 'market.analysisTitle'
  | 'market.analysisDesc'
  | 'market.weekly.title'
  | 'market.weekly.week'
  | 'market.weekly.generated'
  | 'market.weekly.officialBulletin'
  | 'market.weekly.alza'
  | 'market.weekly.baja'
  | 'market.sentiment.alcista'
  | 'market.sentiment.bajista'
  | 'market.sentiment.mixto'
  | 'market.sentiment.estable'
  | 'market.byProduct'
  | 'market.confirmedOpsDays'
  | 'market.emptyNotEnough'
  | 'market.col.product2'
  | 'market.col.priceAvg2'
  | 'market.col.variation7d'
  | 'market.col.volume2'
  | 'market.col.txCount'
  | 'market.row.hide'
  | 'market.row.more'
  | 'market.detail.lockedTitle'
  | 'market.detail.lockedDesc'
  | 'market.detail.viewPlans'
  | 'market.detail.loadFail'
  | 'market.detail.noDaily'
  | 'market.detail.kpi.current'
  | 'market.detail.kpi.variation'
  | 'market.detail.kpi.totalVolume'
  | 'market.detail.kpi.daysWithData'
  | 'market.detail.priceHistoryHeader'
  | 'market.detail.calibreBreakdownHeader'
  | 'market.detail.noCalibre'
  | 'market.detail.col.calibre'
  | 'market.detail.col.avgPrice'
  | 'market.detail.col.volume'
  | 'market.detail.col.ops'
  | 'market.tooltip.priceAvg'
  // ─── Profile pages ───────────────────────────────────────────────────────
  | 'profile.loadFail'
  | 'profile.saveFail'
  | 'profile.saveSuccess'
  | 'profile.section.account'
  | 'profile.section.company'
  | 'profile.section.address'
  | 'profile.section.contact'
  | 'profile.section.bank'
  | 'profile.section.tax'
  | 'profile.section.preferences'
  | 'profile.email'
  | 'profile.phone'
  | 'profile.razonSocial'
  | 'profile.legalForm'
  | 'profile.cifNif'
  | 'profile.street'
  | 'profile.city'
  | 'profile.zip'
  | 'profile.country'
  | 'profile.name'
  | 'profile.lastName'
  | 'profile.position'
  | 'profile.iban'
  | 'profile.swift'
  | 'profile.regimenFiscal'
  | 'profile.notEditable'
  | 'profile.cancel'
  | 'profile.password.title'
  | 'profile.password.current'
  | 'profile.password.new'
  | 'profile.password.confirm'
  | 'profile.password.change'
  | 'profile.password.mismatch'
  | 'profile.password.tooShort'
  | 'profile.password.success'
  | 'profile.password.fail'
  | 'profile.delete.title'
  | 'profile.delete.desc'
  | 'profile.delete.button'
  | 'profile.delete.confirm'
  | 'profile.delete.fail'
  | 'profile.logout'
  | 'profile.tab.account'
  | 'profile.tab.company'
  | 'profile.tab.tutoriales'
  | 'profile.subtitle'
  | 'profile.contactPerson'
  | 'profile.fullName'
  | 'profile.preferences'
  | 'profile.phonePh'
  | 'profile.saveError'
  | 'profile.passwordError'
  | 'profile.passwordUpdateButton'
  | 'profile.company.lockedBanner.before'
  | 'profile.company.lockedBanner.after'
  | 'profile.company.loading'
  | 'profile.company.razonSocial'
  | 'profile.company.cifNif'
  | 'profile.company.formaJuridica'
  | 'profile.company.direccionFiscal'
  | 'profile.company.ciudad'
  | 'profile.company.codigoPostal'
  | 'profile.company.pais'
  | 'profile.company.iban'
  | 'profile.company.ibanStripe'
  | 'profile.tab.documents'
  | 'profile.tab.contracts'
  | 'profile.sellerSubtitle'
  // ─── Tutorials ───────────────────────────────────────────────────────────
  | 'tutorials.title'
  | 'tutorials.subtitle'
  | 'tutorials.completed'
  | 'tutorials.start'
  | 'tutorials.replay'
  | 'tutorials.skip'
  | 'tutorials.next'
  | 'tutorials.back'
  | 'tutorials.finish'
  | 'tutorials.banner.title'
  | 'tutorials.banner.body'
  | 'tutorials.banner.cta'
  | 'tutorials.banner.dismiss'
  | 'tutorials.error.title'
  | 'tutorials.error.body'
  | 'tutorials.error.close'
  | 'tutorials.banner.testMode'
  | 'tutorials.banner.followingTour'
  | 'tutorials.banner.nothingSaved'
  | 'tutorials.banner.exit'
  | 'tutorials.flow.crearLote'
  | 'tutorials.flow.hacerPedido'
  | 'tutorials.boundary.title'
  | 'tutorials.boundary.body'
  | 'tutorials.boundary.reload'
  | 'tutorials.launcher.title'
  | 'tutorials.launcher.subtitle'
  | 'tutorials.launcher.duration'
  | 'tutorials.launcher.start'
  | 'tutorials.launcher.close'
  | 'tutorials.intro.welcome.title'
  | 'tutorials.intro.welcome.content'
  | 'tutorials.intro.sidebar.title'
  | 'tutorials.intro.sidebar.contentSeller'
  | 'tutorials.intro.sidebar.contentBuyer'
  | 'tutorials.intro.header.title'
  | 'tutorials.intro.header.content'
  | 'tutorials.intro.panel.title'
  | 'tutorials.intro.panel.contentSeller'
  | 'tutorials.intro.panel.contentBuyer'
  | 'tutorials.intro.reputation.title'
  | 'tutorials.intro.reputation.content'
  | 'tutorials.intro.moreTutorials.title'
  | 'tutorials.intro.moreTutorials.content'
  | 'tutorials.intro.locale.back'
  | 'tutorials.intro.locale.close'
  | 'tutorials.intro.locale.last'
  | 'tutorials.intro.locale.next'
  | 'tutorials.intro.locale.open'
  | 'tutorials.intro.locale.skip'
  | 'tutorials.section.title'
  | 'tutorials.section.subtitle'
  | 'tutorials.section.loading'
  | 'tutorials.section.minutes'
  | 'tutorials.section.completed'
  | 'tutorials.section.comingSoon'
  | 'tutorials.section.replay'
  | 'tutorials.section.start'
  | 'tutorials.catalog.intro.title'
  | 'tutorials.catalog.intro.desc'
  | 'tutorials.catalog.crearLote.title'
  | 'tutorials.catalog.crearLote.desc'
  | 'tutorials.catalog.hacerPedido.title'
  | 'tutorials.catalog.hacerPedido.desc'
  | 'tutorials.catalog.incidencia.title'
  | 'tutorials.catalog.incidencia.desc'
  | 'tutorials.runner.back'
  | 'tutorials.runner.close'
  | 'tutorials.runner.last'
  | 'tutorials.runner.next'
  | 'tutorials.runner.open'
  | 'tutorials.runner.skip'
  // ─── Tasks pages (lot/order tasks) ───────────────────────────────────────
  | 'tasks.title'
  | 'tasks.empty'
  | 'tasks.back'
  | 'tasks.type.firma'
  | 'tasks.type.pago'
  | 'tasks.type.envio'
  | 'tasks.type.recepcion'
  | 'tasks.type.valoracion'
  | 'tasks.action'
  | 'tasks.backToDashboard'
  | 'tasks.loadFail'
  | 'tasks.unknownType'
  | 'tasks.allCaughtUp'
  | 'tasks.pendingTaskOne'
  | 'tasks.pendingTaskMany'
  | 'tasks.lotPrefix'
  | 'tasks.buyer'
  | 'tasks.seller'
  | 'tasks.sign'
  | 'tasks.prepare'
  | 'tasks.review'
  | 'tasks.expired'
  | 'tasks.ended'
  | 'tasks.sold'
  | 'tasks.extendLabel'
  | 'tasks.saving'
  | 'tasks.extend'
  | 'tasks.closeLot'
  | 'tasks.closeOrder'
  | 'tasks.publishNewLot'
  | 'tasks.createNewOrder'
  | 'tasks.empty.seller.contracts'
  | 'tasks.empty.seller.photos'
  | 'tasks.empty.seller.matches'
  | 'tasks.empty.seller.expiry'
  | 'tasks.empty.buyer.contracts'
  | 'tasks.empty.buyer.offers'
  | 'tasks.empty.buyer.deliveries'
  | 'tasks.empty.buyer.expiry'
  | 'tasks.seller.contracts'
  | 'tasks.seller.photos'
  | 'tasks.seller.matches'
  | 'tasks.seller.expiry'
  | 'tasks.buyer.contracts'
  | 'tasks.buyer.offers'
  | 'tasks.buyer.deliveries'
  | 'tasks.buyer.expiry'
  | 'tasks.confirm'
  | 'tasks.pay'
  // ─── QR / delivery / report ──────────────────────────────────────────────
  | 'qr.title'
  | 'qr.subtitle'
  | 'qr.codeLabel'
  | 'qr.copyCode'
  | 'qr.copied'
  | 'qr.deliveryInstructions'
  | 'qr.back'
  | 'qr.loadFail'
  | 'qr.redirecting'
  | 'qr.loadContract'
  | 'qr.imageOnly'
  | 'qr.imageMax'
  | 'qr.uploadFail'
  | 'qr.addPhotos'
  | 'qr.savePhotosFail'
  | 'qr.savePhotosSuccess'
  | 'qr.backToLot'
  | 'qr.notFound'
  | 'qr.notGeneratedTitle'
  | 'qr.notGeneratedDesc'
  | 'qr.pageTitle'
  | 'qr.lotVerification'
  | 'qr.printHint'
  | 'qr.buyerScans'
  | 'qr.manualEntryLabel'
  | 'qr.deliveryConfirmedByBuyer'
  | 'qr.alreadyRated'
  | 'qr.rateBuyer'
  | 'qr.printBtn'
  | 'qr.shipment'
  | 'qr.product'
  | 'qr.quantity'
  | 'qr.buyer'
  | 'qr.status'
  | 'qr.photosTitle'
  | 'qr.photosDesc'
  | 'qr.uploading'
  | 'qr.clickToUpload'
  | 'qr.photoFormat'
  | 'qr.savePhotos'
  | 'qr.photosUploaded'
  | 'confirm.loadFail'
  | 'confirm.notFound'
  | 'confirm.noTx'
  | 'confirm.releaseFail'
  | 'confirm.backToOrders'
  | 'confirm.successTitle'
  | 'confirm.successDesc'
  | 'confirm.summary'
  | 'confirm.product'
  | 'confirm.farmerId'
  | 'confirm.quantity'
  | 'confirm.orderId'
  | 'confirm.releaseBtn'
  | 'confirm.reportBtn'
  | 'confirm.warning'
  | 'delivery.title'
  | 'delivery.confirmTitle'
  | 'delivery.confirmDesc'
  | 'delivery.codePh'
  | 'delivery.confirm'
  | 'delivery.fail'
  | 'delivery.success'
  | 'delivery.back'
  | 'delivery.loadFail'
  | 'delivery.notFound'
  | 'delivery.cameraFail'
  | 'delivery.enterCode'
  | 'delivery.verifyFail'
  | 'delivery.notSignedTitle'
  | 'delivery.notSignedDesc'
  | 'delivery.backToOrder'
  | 'delivery.shipmentDetails'
  | 'delivery.product'
  | 'delivery.quantity'
  | 'delivery.seller'
  | 'delivery.status'
  | 'delivery.lotPhotos'
  | 'delivery.confirmedTitle'
  | 'delivery.confirmedDesc'
  | 'delivery.viewClosed'
  | 'delivery.allOrders'
  | 'delivery.scanTitle'
  | 'delivery.scanDesc'
  | 'delivery.closeCamera'
  | 'delivery.openCamera'
  | 'delivery.manualTitle'
  | 'delivery.manualDesc'
  | 'delivery.codePlaceholder'
  | 'report.title'
  | 'report.subtitle'
  | 'report.problem'
  | 'report.describe'
  | 'report.evidence'
  | 'report.submit'
  | 'report.fail'
  | 'report.success'
  | 'report.back'
  | 'report.orderHash'
  | 'report.descMin'
  | 'report.descPh'
  | 'report.descRequired'
  | 'report.evidenceLabel'
  | 'report.evidenceHint'
  | 'report.uploaded'
  | 'report.minChars'
  | 'report.uploadFail'
  | 'report.submitFail'
  | 'report.remove'
  | 'report.cancel'
  | 'report.issue.CALIDAD'
  | 'report.issue.CANTIDAD'
  | 'report.issue.EMPAQUETADO'
  | 'report.issue.CALIBRES'
  | 'report.issue.PRODUCTO_DIFERENTE'
  | 'report.issue.OTRO'
  | 'report.issueType'
  // ─── Harvest estimation ──────────────────────────────────────────────────
  | 'harvest.title'
  | 'harvest.subtitle'
  | 'harvest.product'
  | 'harvest.variety'
  | 'harvest.hectares'
  | 'harvest.expectedYield'
  | 'harvest.estimate'
  | 'harvest.estimateResult'
  | 'harvest.totalKg'
  | 'harvest.priceRange'
  | 'harvest.revenue'
  | 'harvest.fail'
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
    'auth.login.errEmailNotVerified': 'Verifica tu email antes de iniciar sesión. Revisa tu bandeja de entrada para el enlace de verificación.',
    'auth.login.errAccountRejected': 'Tu cuenta ha sido rechazada. Contacta con soporte para más información.',
    'auth.login.errAccountSuspended': 'Tu cuenta está suspendida. Contacta con soporte.',
    'auth.login.errInvalidCredentials': 'Credenciales inválidas. Revisa tu email y contraseña.',
    'auth.verify.title.loading': 'Verificando tu cuenta…',
    'auth.verify.subtitle.loading': 'Un segundo, comprobando el enlace.',
    'auth.verify.title.pending': 'Email confirmado',
    'auth.verify.body.pending': 'Hemos confirmado tu email. Tu cuenta está pendiente de aprobación manual por un administrador — suele tardar menos de 24 h hábiles. Te avisaremos por email cuando esté activa. Mientras tanto puedes hacer login y navegar la plataforma.',
    'auth.verify.title.error': 'No se pudo verificar',
    'auth.verify.body.errorDefault': 'No se pudo verificar el email. El enlace puede haber caducado o ya haber sido usado.',
    'auth.verify.title.success': '¡Email verificado!',
    'auth.verify.body.success': 'Tu cuenta está activa. Ya puedes iniciar sesión y empezar a usar Primar-IA.',
    'auth.verify.btn.signIn': 'Iniciar sesión',
    'auth.verify.btn.backLogin': 'Volver al login',
    'auth.verify.btn.newAccount': 'Crear cuenta nueva',
    'auth.verify.tokenMissing': 'Falta el token de verificación en la URL.',
    'auth.verify.support': '¿Problemas? Contacta con soporte: soporte@primar-ia.com',
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
    // Action items con interpolación {n}. Plural en español: "1 contrato" vs "N contratos".
    'dashboard.action.signContract.one': 'Firmar y pagar 1 contrato',
    'dashboard.action.signContract.many': 'Firmar y pagar {n} contratos',
    'dashboard.action.signContract.desc': 'El vendedor ha firmado. Tienes 48 horas hábiles para pagar la comisión y firmar.',
    'dashboard.action.authorizePayment.one': 'Autorizar pago de 1 oferta',
    'dashboard.action.authorizePayment.many': 'Autorizar pago de {n} ofertas',
    'dashboard.action.authorizePayment.desc': 'Pre-autoriza el pago para confirmar el acuerdo en escrow.',
    'dashboard.action.confirmDelivery.one': 'Confirmar recepción de 1 envío',
    'dashboard.action.confirmDelivery.many': 'Confirmar recepción de {n} envíos',
    'dashboard.action.confirmDelivery.desc': 'El vendedor ha marcado el envío. Confirma que has recibido la mercancía.',
    'dashboard.action.rateSeller.one': 'Valorar al vendedor en 1 operación',
    'dashboard.action.rateSeller.many': 'Valorar al vendedor en {n} operaciones',
    'dashboard.action.rateSeller.desc': 'La mercancía ya fue recibida. Valora al vendedor para cerrar la operación.',
    'dashboard.action.rateBuyer.one': 'Valorar al comprador en 1 operación',
    'dashboard.action.rateBuyer.many': 'Valorar al comprador en {n} operaciones',
    'dashboard.action.rateBuyer.desc': 'La mercancía ya fue recibida. Valora al comprador para cerrar la operación.',
    'dashboard.action.expiredOrders.one': '1 pedido fuera de fecha de entrega',
    'dashboard.action.expiredOrders.many': '{n} pedidos fuera de fecha de entrega',
    'dashboard.action.expiredOrders.desc': 'Amplía el plazo o cierra el pedido con la cobertura actual.',
    'dashboard.action.expiredLots.one': '1 lote fuera de fecha de disponibilidad',
    'dashboard.action.expiredLots.many': '{n} lotes fuera de fecha de disponibilidad',
    'dashboard.action.expiredLots.desc': 'Amplía la fecha o cierra el lote con la cobertura actual.',
    'dashboard.action.unreadMessages.one': '1 mensaje sin leer',
    'dashboard.action.unreadMessages.many': '{n} mensajes sin leer',
    'dashboard.action.unreadMessages.desc': 'Tienes mensajes pendientes de la otra parte.',
    'dashboard.action.reviewMatches.one': 'Revisar 1 match nuevo',
    'dashboard.action.reviewMatches.many': 'Revisar {n} matches nuevos',
    'dashboard.action.reviewMatches.desc': 'Compradores interesados en tus lotes. Acepta o rechaza desde la pestaña Matches.',
    'dashboard.action.markShipped.one': 'Marcar como enviado 1 envío',
    'dashboard.action.markShipped.many': 'Marcar como enviados {n} envíos',
    'dashboard.action.markShipped.desc': 'El contrato está firmado y la comisión pagada. Marca el envío para que el comprador confirme.',
    'dashboard.action.sellerSignContract.one': 'Firmar 1 contrato',
    'dashboard.action.sellerSignContract.many': 'Firmar {n} contratos',
    'dashboard.action.sellerSignContract.desc': 'Tienes contratos pendientes de firmar como vendedor. El comprador podrá pagar y firmar después.',
    'lots.title': 'Mis lotes',
    'lots.newLot': 'Nuevo lote',
    'lots.empty': 'Sin lotes. Publica tu primer lote para empezar a vender.',
    'lots.search': 'Buscar por ID de lote o producto…',
    'lots.tab.all': 'Todos',
    'lots.tab.open': 'Abiertos',
    'lots.tab.inProgress': 'En curso',
    'lots.tab.full': 'Completos',
    'lots.tab.cancelled': 'Cancelados',
    'lots.col.id': 'ID Lote',
    'lots.col.product': 'Producto',
    'lots.col.totalKg': 'Cantidad total',
    'lots.col.coverage': '% Cobertura',
    'lots.col.status': 'Estado',
    'lots.col.availableDate': 'Fecha recogida',
    'lots.pendingRating': 'Tienes una transacción pendiente de valorar.',
    'lots.rateNow': 'Valorar ahora',
    'orders.title': 'Mis pedidos',
    'orders.newOrder': 'Nuevo pedido',
    'orders.empty': 'Sin pedidos. Crea tu primer pedido para empezar a comprar.',
    'orders.search': 'Buscar por ID de pedido o producto…',
    'orders.tab.all': 'Todos',
    'orders.tab.open': 'Abiertos',
    'orders.tab.inProgress': 'En curso',
    'orders.tab.covered': 'Cubiertos',
    'orders.tab.closed': 'Cerrados',
    'orders.tab.cancelled': 'Cancelados',
    'orders.col.id': 'ID Pedido',
    'orders.col.product': 'Producto',
    'orders.col.totalKg': 'Cantidad total',
    'orders.col.coverage': '% Cobertura',
    'orders.col.status': 'Estado',
    'orders.col.deliveryDate': 'Fecha entrega',
    'orders.pendingRating': 'Tienes una transacción pendiente de valorar.',
    'orders.rateNow': 'Valorar ahora',
    'matches.title': 'Tus pedidos compatibles',
    'matches.loadError': 'Error al cargar los matches.',
    'matches.hiddenByDelay.title': 'Tienes {n} {n_plural} esperando',
    'matches.hiddenByDelay.body': 'Como vendedor en plan gratuito, los matches se generan al instante pero no son visibles hasta pasadas 24 h. Mejora tu plan para verlos ahora — o espera y aparecerán solos.',
    'matches.hiddenByDelay.cta': 'Ver planes y desbloquear ahora',
    'matches.hiddenByDelay.nextVisible': 'El próximo será visible {when}',
    'dashboard.loadError': 'Error al cargar los datos del panel.',
    'dashboard.emptyOrdersInline': 'Sin pedidos activos.',
    'dashboard.emptyOrdersCta': 'Crear uno',
    'dashboard.emptyLotsInline': 'Sin lotes activos.',
    'dashboard.emptyLotsCta': 'Publica uno',
    'freeTier.notice.title': 'Tu plan gratuito retrasa el matching 24 horas',
    'freeTier.notice.bodyLote': 'Cuando publiques este lote, las propuestas de matching se generarán de inmediato pero no serán visibles hasta dentro de 24 h. Mejora tu plan para que tu lote comience a recibir matches al instante.',
    'freeTier.notice.bodyPedido': 'Cuando publiques este pedido, las propuestas de matching se generarán de inmediato pero no serán visibles hasta dentro de 24 h. Mejora tu plan para que tu pedido comience a recibir matches al instante.',
    'freeTier.notice.cta': 'Ver planes y eliminar el retraso',
    'seasonalCalendar.favTab': 'Favoritos',
    'seasonalCalendar.emptyFavorites': 'No tienes favoritos aún. Pulsa la estrella ⭐ de un producto para añadirlo.',
    'seasonalCalendar.emptyCategory': 'No hay datos para esta categoría',
    'seasonalCalendar.addFav': 'Marcar como favorito',
    'seasonalCalendar.removeFav': 'Quitar de favoritos',
    'market.favorites.section': 'Tus favoritos',
    'market.favorites.starLabel': 'Favorito',
    'potential.banner.lote': 'Hay {n} {n_plural} interesados en un lote con estas características.',
    'potential.banner.pedido': 'Hay {n} {n_plural} que podrían cubrir este pedido.',
    'potential.banner.calculating': 'Calculando potenciales counterparties…',
    'potential.banner.singularBuyer': 'potencial comprador',
    'potential.banner.pluralBuyer': 'potenciales compradores',
    'potential.banner.singularSeller': 'potencial vendedor',
    'potential.banner.pluralSeller': 'potenciales vendedores',
    'lotForm.step1.title': 'Producto y calibres',
    'lotForm.step1.desc': 'Qué vendes, en qué variedad y con qué calibres.',
    'lotForm.step2.title': 'Logística y entrega',
    'lotForm.step2.desc': 'Dónde está el lote, fechas, incoterm y quién envía.',
    'lotForm.step3.title': 'Pagos y publicación',
    'lotForm.step3.desc': 'Términos de pago aceptados y publicación final.',
    'lotForm.nextStep': 'Siguiente',
    'lotForm.prevStep': 'Atrás',
    'orderForm.step1.title': 'Producto y calibres',
    'orderForm.step1.desc': 'Qué necesitas, en qué variedad y con qué calibres.',
    'orderForm.step2.title': 'Logística y entrega',
    'orderForm.step2.desc': 'Destino, fechas, incoterm y quién envía.',
    'orderForm.step3.title': 'Pagos y publicación',
    'orderForm.step3.desc': 'Términos de pago aceptados y publicación final.',
    'orderForm.nextStep': 'Siguiente',
    'orderForm.prevStep': 'Atrás',
    'matches.subtitle': 'Pedidos que mejor encajan con tus lotes publicados.',
    'matches.incotermFilter': 'Filtro de incoterm',
    'matches.incotermFilterRecommended': 'Recomendado',
    'matches.incotermFilterCount': '{n} de {total} seleccionados',
    'matches.show': 'Mostrar',
    'matches.hide': 'Ocultar',
    'matches.edit': 'Editar',
    'matches.reset': 'Restablecer',
    'matches.bestMatchTitle': 'Mejor match automático',
    'matches.bestMatchSub': 'Ingresos potenciales estimados:',
    'matches.bestMatchPotential': '(sumando todos los matches pendientes)',
    'matches.reviewAccept': 'Revisar y aceptar',
    'matches.tab.best': 'Mejor match',
    'matches.tab.price': 'Mejor precio',
    'matches.tab.distance': 'Más cercano',
    'matches.tab.newest': 'Más reciente',
    'matches.empty.filterHides.one': 'Tienes 1 match pero el filtro de incoterm lo oculta.',
    'matches.empty.filterHides.many': 'Tienes {n} matches pero el filtro de incoterm los oculta.',
    'matches.empty.filterHidesDesc': 'Amplía los incoterms del filtro o pulsa "Restablecer" para verlos todos.',
    'matches.empty.noMatches': 'Todavía no hay pedidos que encajen.',
    'matches.empty.noMatchesDesc': 'Ningún comprador encaja con los calibres de tus lotes actuales. Mira lo que están pidiendo abajo.',
    'matches.marketDemandTitle': 'Lo que están pidiendo los compradores',
    'matches.marketDemandSub': '— actualiza los calibres de tus lotes para encajar',
    'matches.marketDemandCalibre': 'Calibre {c}',
    'matches.marketDemandOrders.one': '1 pedido',
    'matches.marketDemandOrders.many': '{n} pedidos',
    'matches.group.matches.one': '1 match',
    'matches.group.matches.many': '{n} matches',
    'matchCard.profitability': 'Índice de\nrentabilidad',
    'matchCard.yourLot': 'Tu lote',
    'matchCard.price': 'Precio',
    'matchCard.destination': 'Destino',
    'matchCard.distance': 'Distancia',
    'matchCard.remainingQty': 'Cantidad restante',
    'matchCard.notAvailable': 'N/D',
    'matchCard.contribute': 'Contribuir',
    'similar.title': 'Ofertas similares',
    'similar.subtitle': 'Pedidos parecidos a los tuyos con pequeñas diferencias que podrías ajustar para encajar.',
    'similar.severity.minor': 'Cambio menor',
    'similar.severity.moderate': 'Requiere ajustes',
    'similar.severity.major': 'Diferencias grandes',
    'similar.field.calibre': 'Calibre',
    'similar.field.incoterm': 'Incoterm',
    'similar.field.logistica': 'Logística',
    'similar.field.precio': 'Precio',
    'similar.field.terminoPago': 'Términos de pago',
    'similar.adjust': 'Ajustar',
    'similar.delivery': 'Entrega',
    'similar.empty': 'No hay pedidos cercanos a tus lotes ahora mismo. Te avisaremos cuando aparezca alguno.',
    'similar.errorLoading': 'No se pudieron cargar las ofertas similares.',
    'similar.headerSub.one': '1 pedido cercano a tus lotes — ajusta condiciones para encajar',
    'similar.headerSub.many': '{n} pedidos cercanos a tus lotes — ajusta condiciones para encajar',
    'orderForm.title': 'Crear pedido',
    'orderForm.commercialDetails': 'Detalles comerciales',
    'orderForm.product': 'Producto',
    'orderForm.product.placeholder': 'Selecciona producto…',
    'orderForm.variety': 'Variedad',
    'orderForm.variety.placeholder': 'Selecciona variedad…',
    'orderForm.variety.other': 'Otra (especificar)…',
    'orderForm.variety.any': 'Cualquier variedad (acepta cualquiera)',
    'orderForm.variety.customPlaceholder': 'Escribe el nombre de la variedad…',
    'orderForm.frequency': 'Frecuencia',
    'orderForm.frequency.placeholder': 'Selecciona…',
    'orderForm.frequency.weekly': 'Semanal',
    'orderForm.frequency.biweekly': 'Quincenal',
    'orderForm.frequency.monthly': 'Mensual',
    'orderForm.frequency.onetime': 'Puntual',
    'orderForm.destination': 'Destino final',
    'orderForm.destination.placeholder': 'p. ej. Puerto de Rotterdam',
    'orderForm.deliveryDate': 'Fecha de entrega deseada',
    'orderForm.noCalibreCheckbox': 'Sin calibrar (acepto cualquier calibre)',
    'orderForm.quantityKg': 'Cantidad (kg)',
    'orderForm.maxPriceKg': 'Precio máximo (€/kg)',
    'orderForm.caliber': 'Calibre',
    'orderForm.caliber.placeholder': 'Selecciona calibre…',
    'orderForm.qtyKg': 'Cant. (kg)',
    'orderForm.sellingPriceKg': 'Precio compra (€/kg)',
    'orderForm.addCaliber': 'Añadir otro calibre',
    'orderForm.comments': 'Comentarios',
    'orderForm.comments.placeholder': 'Notas adicionales para los vendedores…',
    'orderForm.logisticsTitle': 'Logística y condiciones',
    'orderForm.whoShips': '¿Quién hace el envío?',
    'orderForm.principalIncoterm': 'Incoterm principal',
    'orderForm.otherIncoterms': 'Otros incoterms aceptados',
    'orderForm.otherIncotermsHint': '(opcional, más matches)',
    'orderForm.incotermFilteredNote': 'Los incoterms se filtran según quién envía. Cambia la opción de logística para verlos todos.',
    'orderForm.paymentTermsTitle': 'Términos de pago aceptados',
    'orderForm.paymentTermsHelp': 'Selecciona uno o varios. Los matches incluirán vendedores que acepten cualquiera de estos.',
    'orderForm.futureLogisticsTitle': 'Presupuestar logística con Primar-IA',
    'orderForm.futureLogisticsBadge': 'Próximamente',
    'orderForm.futureLogisticsDesc': 'Pronto podrás pedir presupuesto de transporte directamente desde Primar-IA con transportistas integrados, sin salir de la plataforma.',
    'orderForm.futureLogisticsBtn': 'Pedir presupuesto',
    'orderForm.futureLogisticsBtnTitle': 'Esta funcionalidad estará disponible próximamente',
    'orderForm.cancel': 'Cancelar',
    'orderForm.publish': 'Publicar pedido',
    'orderForm.publishing': 'Publicando…',
    'lotForm.title': 'Publicar nuevo lote',
    'lotForm.productDetails': 'Detalles del producto',
    'lotForm.product': 'Producto',
    'lotForm.product.placeholder': 'Selecciona producto…',
    'lotForm.variety': 'Variedad',
    'lotForm.variety.placeholder': 'Selecciona variedad…',
    'lotForm.variety.other': 'Otra (especificar)…',
    'lotForm.variety.customPlaceholder': 'Escribe el nombre de la variedad…',
    'lotForm.noCalibreCheckbox': 'Lote sin calibrar / sin pesar',
    'lotForm.estimatedQty': 'Cantidad estimada (kg)',
    'lotForm.estimatedQty.placeholder': 'Total kg disponibles',
    'lotForm.caliber': 'Calibre',
    'lotForm.caliber.placeholder': 'Selecciona calibre…',
    'lotForm.caliber.customPlaceholder': 'p. ej. 70/80 mm',
    'lotForm.qtyKg': 'Cantidad (kg)',
    'lotForm.qtyKg.placeholder': '1000',
    'lotForm.addCaliber': 'Añadir otro calibre',
    'lotForm.logisticsTitle': 'Logística y disponibilidad',
    'lotForm.location.placeholder': 'Ubicación del lote',
    'lotForm.availableFrom': 'Disponible desde',
    'lotForm.availableUntil': 'Disponible hasta',
    'lotForm.whoShips': '¿Quién se encarga del envío?',
    'lotForm.acceptedIncoterms': 'Incoterms aceptados',
    'lotForm.acceptedIncotermsHint': '(elige uno o varios)',
    'lotForm.recommendedByProfile': 'Recomendado por tu perfil:',
    'lotForm.dontShow': 'No mostrar',
    'lotForm.dontShowTitle': 'Ocultar la recomendación y aceptar todos los incoterms por defecto',
    'lotForm.incotermFilteredNote': 'Los incoterms se filtran según quién envía. Para ampliarlos, cambia la opción de logística.',
    'lotForm.paymentTermsTitle': 'Términos de pago aceptados',
    'lotForm.paymentTermsHelp': 'Elige uno o varios. El comprador podrá pagar bajo cualquiera de los términos que aceptes.',
    'lotForm.extraInfoTitle': 'Información adicional',
    'lotForm.certificates': 'Certificados asociados',
    'lotForm.certificates.empty': 'No tienes certificados aprobados. Sube tus certificados en tu perfil y espera la verificación del administrador.',
    'lotForm.photos': 'Fotos del lote',
    'lotForm.photos.upload': 'Subir foto del lote',
    'lotForm.photos.error': 'No se pudo subir la foto. Inténtalo de nuevo.',
    'lotForm.extraComments': 'Comentarios adicionales',
    'lotForm.extraComments.placeholder': 'Cualquier información extra sobre este lote…',
    'lotForm.saveDraft': 'Guardar como borrador',
    'lotForm.publish': 'Publicar lote',
    'lotForm.publishing': 'Publicando…',
    'contract.notFound': 'Contrato no encontrado.',
    'contract.backToMatches': 'Volver a matches',
    'contract.sellerTitle': 'Contrato — Firma como vendedor',
    'contract.summary': 'Resumen de la operación',
    'contract.summary.product': 'Producto',
    'contract.summary.quantity': 'Cantidad',
    'contract.summary.pricePerKg': 'Precio/kg acordado',
    'contract.summary.totalGoods': 'Importe total mercancía',
    'contract.summary.incoterm': 'Incoterm',
    'contract.summary.paymentTerms': 'Condiciones de pago',
    'contract.summary.destination': 'Destino',
    'contract.summary.calibres': 'Calibres',
    'contract.summary.transferHint': 'Recibirás el importe total directamente del comprador por transferencia según las condiciones de pago acordadas.',
    'contract.commission.title': 'Comisión Primar-IA',
    'contract.commission.amount': 'Importe estimado',
    'contract.commission.percent': 'Porcentaje aplicado',
    'contract.commission.helpSeller': 'La comisión la paga el comprador directamente a Primar-IA. Tú recibes el 100 % del importe acordado por transferencia según las condiciones del contrato.',
    'contract.document': 'Documento',
    'contract.document.download': 'Descargar contrato (PDF)',
    'contract.document.watermark': 'El PDF lleva una marca de agua «No válido hasta firmar y pagar» hasta que ambas partes lo firmen y el comprador pague la comisión.',
    'contract.signatures': 'Estado de firmas',
    'contract.signatures.sellerYou': 'Vendedor (tú)',
    'contract.signatures.buyer': 'Comprador',
    'contract.signatures.signedOn': 'Firmado el',
    'contract.signatures.pendingYours': 'Pendiente de tu firma',
    'contract.signatures.buyerWillSignLater': 'Firmará después de pagar la comisión',
    'contract.sign.needTitle': 'Tu firma es necesaria',
    'contract.sign.needDesc': 'Revisa el PDF antes de firmar. Una vez firmes, el comprador tendrá',
    'contract.sign.deadlineWord': '48 horas hábiles',
    'contract.sign.deadlineTail': 'para pagar la comisión y firmar también. Si no lo hace, el contrato caducará y podrás iniciar de nuevo.',
    'contract.sign.btn': 'Firmar contrato',
    'contract.sign.modify': 'Modificar condiciones (chat)',
    'contract.sign.cancel': 'Cancelar contrato',
    'contract.sign.drawHere': 'Dibuja tu firma:',
    'contract.sign.clear': 'Limpiar',
    'contract.sign.confirm': 'Confirmar firma',
    'contract.sign.cancelDraw': 'Cancelar',
    'contract.waitingBuyer.title': 'Esperando al comprador',
    'contract.waitingBuyer.desc.before': 'Ya has firmado. El comprador debe pagar la comisión y firmar antes de:',
    'contract.waitingBuyer.desc.after': 'Si no, el contrato caducará y tu firma se anulará automáticamente.',
    'contract.waitingBuyer.openChat': 'Abrir chat con el comprador',
    'contract.waitingBuyer.cancel': 'Cancelar contrato',
    'contract.expired.title': 'Contrato caducado',
    'contract.expired.desc': 'El comprador no firmó dentro del plazo. Puedes regenerar el contrato e iniciar la firma de nuevo desde la pantalla del match.',
    'contract.cancelled.title': 'Contrato cancelado',
    'contract.cancelled.byYou': 'Cancelaste este contrato el',
    'contract.cancelled.byBuyer': 'El comprador canceló este contrato el',
    'contract.cancelled.reason': 'Motivo:',
    'contract.cancelled.back': 'Volver a mis matches',
    'contract.signed.title': 'Contrato firmado por ambas partes',
    'contract.signed.desc': 'El comprador pagó la comisión el {date}. Procede con la entrega y la cobranza según las condiciones acordadas.',
    'contract.docs.title': 'Documentos generados',
    'contract.docs.intro': 'Tras la firma del contrato hemos generado automáticamente la factura de tu venta y la de la comisión de Primar-IA.',
    'contract.docs.sellerInvoice': 'Tu factura (venta al comprador)',
    'contract.docs.platformInvoice': 'Factura comisión Primar-IA (referencia)',
    'contract.buyerTitle': 'Contrato — Firma y pago',
    'contract.backToOrders': 'Volver a pedidos',
    'contract.summary.amountToSeller': 'Importe a pagar al vendedor',
    'contract.commission.amountToPay': 'Importe a pagar',
    'contract.commission.helpBuyer': 'Esta comisión la paga el comprador (tú) directamente a Primar-IA por el servicio de matchmaking. El importe de la mercancía lo pagas directamente al vendedor según las condiciones acordadas en el contrato.',
    'contract.document.watermarkBuyer': 'Revisa el contrato con calma antes de firmar. Lleva marca de agua hasta que firmes y pagues la comisión.',
    'contract.signatures.seller': 'Vendedor',
    'contract.signatures.buyerYou': 'Comprador (tú)',
    'contract.signatures.sellerPending': 'Pendiente — debe firmar primero',
    'contract.signatures.buyerWillSignOnPay': 'Firmarás al pagar la comisión',
    'contract.sellerNotSignedYet': 'El vendedor todavía no ha firmado. Podrás firmar y pagar cuando el vendedor complete su firma.',
    'contract.sellerSignedBanner.title': 'El vendedor ha firmado',
    'contract.sellerSignedBanner.before': 'Tienes hasta',
    'contract.sellerSignedBanner.deadlineWord': '48 horas hábiles',
    'contract.sellerSignedBanner.after': 'para firmar y pagar la comisión. Pasado ese plazo el contrato caducará.',
    'contract.signAndPay': 'Firmar y pagar comisión',
    'contract.deadlineExpiredBuyer.title': 'Plazo de firma vencido',
    'contract.deadlineExpiredBuyer.desc': 'El plazo de 48 horas hábiles expiró el {date}. El contrato pasará a caducado en breve. Habla con el vendedor por chat si quieres reabrir la operación.',
    'contract.openSellerChat': 'Abrir chat con el vendedor',
    'contract.expired.descBuyer': 'El plazo de 48 horas hábiles para firmar y pagar ha vencido. Habla con el vendedor por chat si quieres iniciar de nuevo.',
    'contract.cancelled.byBuyerSelf': 'Cancelaste este contrato el',
    'contract.cancelled.bySeller': 'El vendedor canceló este contrato el',
    'contract.cancelled.backToOrders': 'Volver a mis pedidos',
    'contract.signed.titleBuyer': 'Contrato firmado y comisión pagada',
    'contract.signed.descBuyer': 'Comisión pagada el {date}. Ahora procede el pago del importe al vendedor según las condiciones del contrato.',
    'contract.docs.introBuyer': 'Hemos generado automáticamente las facturas y el resguardo con las instrucciones para que pagues al vendedor.',
    'contract.docs.escrow': 'Resguardo de pago al vendedor',
    'contract.docs.escrowSub': 'IBAN, importe y referencia para tu transferencia',
    'contract.docs.sellerInvoiceBuyer': 'Factura del vendedor (mercancía)',
    'contract.docs.platformInvoiceBuyer': 'Factura Primar-IA (comisión)',
    'contract.docs.watermarkAmber': 'Revisa el contrato con calma antes de firmar.',
    'contract.signModal.title': 'Firma irrevocable',
    'contract.signModal.warning1': 'Aviso importante. Al firmar y pagar la comisión, aceptas el contrato de forma vinculante e irrevocable. No podrás deshacer la firma ni recuperar la comisión.',
    'contract.signModal.warning2': 'Si dejas de cumplir las condiciones acordadas, podrás incurrir en responsabilidades legales según el Código de Comercio y el Reglamento (UE) 910/2014 (eIDAS).',
    'contract.signModal.fieldLabel': 'Tu firma (nombre y apellidos)',
    'contract.signModal.placeholder': 'Ej: Juan García López',
    'contract.signModal.fieldHelp': 'Esto se considera firma electrónica simple según el Reglamento eIDAS.',
    'contract.signModal.ack': 'Entiendo que esta firma es irrevocable y que al continuar acepto el contrato en su totalidad.',
    'contract.signModal.cancel': 'Cancelar',
    'contract.signModal.confirm': 'Confirmar y pagar',
    'contract.payment.processing.title': 'Procesando tu pago…',
    'contract.payment.processing.desc': 'Stripe ha confirmado el pago. Estamos finalizando la firma y el contrato. Esto suele tardar unos segundos.',
    'contract.payment.finalizing.title': 'El pago se está finalizando',
    'contract.payment.finalizing.desc1': 'Tu pago se ha enviado a Stripe pero aún no hemos recibido la confirmación final. No vuelvas a pulsar «Firmar y pagar» — ya está en curso.',
    'contract.payment.finalizing.desc2': 'Si llevas más de un minuto esperando, pulsa «Reconciliar con Stripe»: comprobamos directamente en Stripe el estado del pago y forzamos la finalización del contrato.',
    'contract.payment.refresh': 'Refrescar',
    'contract.payment.reconcile': 'Reconciliar con Stripe',
    'contract.payment.stuck.title': 'El pago tarda más de lo habitual',
    'contract.payment.stuck.desc': 'Stripe ya nos confirmó el cobro pero la finalización está tardando más de lo normal. No reintentes — el pago está en curso. Si en unos minutos no ves el contrato firmado, contacta con soporte.',
    'contract.payment.cancelled.title': 'Pago cancelado',
    'contract.payment.cancelled.desc': 'Cancelaste el pago en Stripe. Puedes reintentar cuando quieras, siempre que el vendedor no haya caducado su firma.',
    'contract.downloadFail': 'No se pudo descargar el contrato.',
    'chat.title': 'Mensajes',
    'chat.empty': 'Aún no tienes conversaciones',
    'chat.selectConv': 'Selecciona una conversación',
    'chat.orderHash': 'Pedido #',
    'chat.noMessages': 'Aún no hay mensajes. ¡Saluda!',
    'chat.bypassDetected': 'BYPASS DETECTADO — mensaje saneado',
    'chat.close': 'Cerrar',
    'chat.privacy': 'Por tu seguridad: no compartas teléfono, email ni cierres la operación fuera de Primar-IA hasta firmar el contrato. Los mensajes son revisados por IA.',
    'chat.estado.completed': 'Completado',
    'chat.estado.cancelled': 'Cancelado',
    'chat.estado.refunded': 'Reembolsado',
    'chat.banner.completed': 'Esta transacción está completada — la conversación es solo lectura.',
    'chat.banner.cancelled': 'Esta transacción fue cancelada — la conversación es solo lectura.',
    'chat.banner.refunded': 'Esta transacción fue reembolsada — la conversación es solo lectura.',
    'chat.actions.propose': 'Proponer cambio de precio o incoterm',
    'chat.actions.proposeTitle': 'Proponer cambio',
    'chat.actions.attach': 'Adjuntar archivo (próximamente)',
    'chat.actions.attachTitle': 'Adjuntar archivos próximamente',
    'chat.placeholder': 'Escribe un mensaje… (Enter para enviar, Shift+Enter para nueva línea)',
    'chat.send': 'Enviar mensaje',
    'chat.sendFail': 'No se pudo enviar el mensaje',
    'register.step1.accountType': 'Tipo de cuenta',
    'register.step1.seller': 'VENDEDOR',
    'register.step1.buyer': 'COMPRADOR',
    'register.step1.email': 'Email corporativo',
    'register.step1.emailPh': 'tu@empresa.com',
    'register.step1.password': 'Crear contraseña',
    'register.step1.passwordHint': 'Mínimo 12 caracteres',
    'register.step1.confirmPassword': 'Confirmar contraseña',
    'register.step1.phone': 'Teléfono de contacto',
    'register.step1.language': 'Idioma preferido',
    'register.step1.continue': 'Continuar a datos fiscales',
    'register.step2.companyHeader': 'Datos de la empresa',
    'register.step2.razonSocial': 'Razón social',
    'register.step2.razonSocialPh': 'Frutas García S.L.',
    'register.step2.legalForm': 'Forma jurídica',
    'register.step2.legalFormPh': 'Selecciona forma jurídica…',
    'register.step2.cifNif': 'CIF / NIF',
    'register.step2.cifNifHint': 'CIF/NIF español o VAT ID internacional (ej.: B12345678, DE123456789)',
    'register.step2.addressHeader': 'Dirección fiscal',
    'register.step2.street': 'Calle y número',
    'register.step2.streetPh': 'Calle Mayor 1',
    'register.step2.city': 'Ciudad',
    'register.step2.zip': 'Código postal',
    'register.step2.country': 'País',
    'register.step2.legalContactHeader': 'Persona de contacto legal',
    'register.step2.name': 'Nombre',
    'register.step2.lastName': 'Apellidos',
    'register.step2.position': 'Cargo',
    'register.step2.positionPh': 'Administrador único',
    'register.step2.sellerBankHeader': 'Datos bancarios y fiscales (sólo vendedores)',
    'register.step2.sellerBankDesc': 'Necesarios para emitir facturas con la fiscalidad correcta y para que el comprador pueda transferirte. Sólo se introducen una vez aquí — para modificarlos posteriormente deberás contactar con Primar-IA.',
    'register.step2.iban': 'IBAN',
    'register.step2.ibanHint': 'IBAN internacional (ES, DE, FR, IT, GB, NL…). Se normaliza automáticamente.',
    'register.step2.swift': 'SWIFT / BIC',
    'register.step2.swiftPh': 'Ej.: BSCHESMM, DEUTDEFF (opcional)',
    'register.step2.regimenFiscal': 'Régimen fiscal',
    'register.step2.regimenFiscalPh': 'Selecciona régimen fiscal…',
    'register.step2.regimenGeneral': 'General (IVA 21%, sin retención)',
    'register.step2.regimenAgrario': 'Régimen especial agrario (IVA 4/10%, IRPF 2%)',
    'register.step2.regimenRecargo': 'Recargo de equivalencia (minorista)',
    'register.step2.regimenExento': 'Exento (intracomunitario, exportación…)',
    'register.step2.ibanInvalid': 'IBAN inválido — obligatorio para vendedores',
    'register.step2.regimenMissing': 'Selecciona el régimen fiscal',
    'register.step2.back': 'Volver',
    'register.step2.continue': 'Continuar',
    'register.step3.optionalDocs': 'Los documentos NO son obligatorios pero te posicionarán mejor en el marketplace.',
    'register.step3.seller.land': 'Acreditación de tierras o arrendamiento',
    'register.step3.seller.landHint': 'Documento oficial que acredite acceso a tierras agrícolas',
    'register.step3.seller.gap': 'Certificado GlobalG.A.P. o seguridad alimentaria',
    'register.step3.seller.gapHint': 'Certificación de un organismo acreditado',
    'register.step3.seller.organic': 'Certificación ecológica (si aplica)',
    'register.step3.seller.organicHint': 'ej.: CAAE, CCPAE o logo EU Organic',
    'register.step3.buyer.registration': 'Documento de constitución de la empresa',
    'register.step3.buyer.registrationHint': 'Inscripción oficial en Registro Mercantil o equivalente',
    'register.step3.buyer.license': 'Licencia de importación / exportación (si aplica)',
    'register.step3.buyer.licenseHint': 'Necesaria para operaciones de comercio internacional',
    'register.step3.back': 'Volver',
    'register.step3.continue': 'Continuar',
    'register.step4.review': 'Tu solicitud será enviada para revisión manual tras el envío. Recibirás notificación del resultado por correo electrónico en un plazo de 1–2 días laborables. Mientras tanto, tu acceso a la plataforma será limitado.',
    'register.step4.termsAccept': 'He leído y acepto los',
    'register.step4.terms': 'Términos y Condiciones',
    'register.step4.privacyAccept': 'He leído y acepto la',
    'register.step4.privacy': 'Política de Privacidad',
    'register.step4.back': 'Atrás',
    'register.step4.submit': 'Enviar solicitud de registro',
    'subscription.title': 'Tu Suscripción',
    'subscription.subtitleSeller': 'Elige el plan que mejor se adapte a tu producción',
    'subscription.subtitleBuyer': 'Elige el plan que mejor se adapte a tu negocio',
    'subscription.success': '¡Tu suscripción se ha activado correctamente! Ya puedes disfrutar de los beneficios de tu nuevo plan.',
    'subscription.cancelled': 'El proceso de pago fue cancelado. Puedes intentarlo de nuevo cuando quieras.',
    'subscription.errorCheckout': 'Error al iniciar el pago',
    'subscription.changed.upgradedNow': 'Plan actualizado a {plan} — el cambio aplica ya, te cobramos la diferencia prorrateada.',
    'subscription.changed.downgradeScheduled': 'Tu plan bajará a {plan} el {date}. Hasta entonces mantienes tu plan actual ya pagado.',
    'subscription.changed.cancelScheduled': 'Tu suscripción se cancelará el {date}. Hasta entonces mantienes el acceso del plan actual.',
    'subscription.banner.downgradePending': 'Cambio pendiente: tu plan bajará a {plan} el {date}.',
    'subscription.banner.cancelPending': 'Tu suscripción se cancelará el {date} y pasarás al plan gratuito.',
    'subscription.confirm.upgradeTitle': '¿Subir a un plan superior?',
    'subscription.confirm.upgradeBody': 'Vas a cambiar de {current} a {target}. El cambio es inmediato y se te cobrará la diferencia prorrateada del periodo actual.',
    'subscription.confirm.upgradeCta': 'Subir ahora',
    'subscription.confirm.downgradeTitle': '¿Bajar a un plan inferior?',
    'subscription.confirm.downgradeBody': 'Vas a cambiar de {current} a {target}. Mantienes tu plan actual hasta el fin del periodo que ya has pagado; el mes siguiente se te cobrará el plan más bajo.',
    'subscription.confirm.downgradeCta': 'Bajar de plan',
    'subscription.confirm.cancelTitle': '¿Cancelar suscripción?',
    'subscription.confirm.cancelBody': 'Vas a pasar de {current} al plan gratuito. Mantienes el acceso completo hasta que termine el periodo que ya has pagado; después se cancelará la suscripción automáticamente.',
    'subscription.confirm.cancelCta': 'Cancelar suscripción',
    'subscription.confirm.keepPlan': 'Mantener mi plan',
    'subscription.confirm.giftTitle': '¡Espera! Un regalo de bienvenida 🎁',
    'subscription.confirm.giftBody': 'Como agradecimiento por seguir con nosotros, te regalamos 1 mes EXTRA gratis en tu plan {current}. Solo se ofrece la primera vez.',
    'subscription.confirm.giftCta': 'Aceptar regalo y mantener mi plan',
    'subscription.confirm.giftLoading': 'Aplicando regalo…',
    'subscription.confirm.giftApplied': 'Regalo aplicado. Tu próxima fecha de cobro es {date}.',
    'subscription.currentPlan': 'Plan actual:',
    'subscription.manage': 'Gestionar suscripción',
    'subscription.activeLots': 'Lotes activos',
    'subscription.activeOrders': 'Pedidos activos',
    'subscription.breakdown.searching': 'buscando',
    'subscription.breakdown.dealing': 'en trato',
    'subscription.breakdown.reserved': 'reservados (pdte. comisión)',
    'subscription.itemLot': 'lote',
    'subscription.itemOrder': 'pedido',
    'subscription.redirecting': 'Redirigiendo a Stripe...',
    'disputes.title': 'Mis reclamaciones',
    'disputes.none': 'Sin reclamaciones.',
    'disputes.role.buyer': 'Comprador',
    'disputes.role.seller': 'Vendedor',
    'disputes.role.admin': 'Admin',
    'disputes.estado.open': 'Abierta',
    'disputes.estado.sellerResponded': 'Respuesta del vendedor',
    'disputes.estado.inReview': 'En revisión',
    'disputes.estado.resolved': 'Resuelta',
    'disputes.back': 'Volver a reclamaciones',
    'disputes.opened': 'Abierta el',
    'disputes.notFound': 'Reclamación no encontrada.',
    'disputes.yourDescription': 'Tu descripción',
    'disputes.buyerClaim': 'Reclamación del comprador',
    'disputes.evidence': 'Evidencias',
    'disputes.sellerResponseTitle': 'Respuesta del vendedor',
    'disputes.sellerEvidence': 'Evidencias del vendedor',
    'disputes.yourResponse': 'Tu respuesta',
    'disputes.yourEvidence': 'Tus evidencias',
    'disputes.respondPromptDesc': 'Un comprador ha abierto una reclamación contra esta transacción. Puedes enviar tu respuesta.',
    'disputes.respondPromptBtn': 'Responder',
    'disputes.respondFormTitle': 'Envía tu respuesta',
    'disputes.respondFormPh': 'Explica tu versión. Incluye contexto relevante, fechas y detalles…',
    'disputes.uploading': 'Subiendo…',
    'disputes.addEvidence': 'Añadir foto o PDF',
    'disputes.respondFail': 'No se pudo enviar la respuesta.',
    'disputes.cancel': 'Cancelar',
    'disputes.submitResponse': 'Enviar respuesta',
    'disputes.chatTitle': 'Mensajes',
    'disputes.chatEmpty': 'Aún no hay mensajes.',
    'disputes.chatPlaceholder': 'Escribe un mensaje…',
    'lotDetail.loadFail': 'No se pudo cargar los detalles del lote.',
    'lotDetail.notFound': 'Lote no encontrado.',
    'lotDetail.backToLots': 'Volver a mis lotes',
    'lotDetail.lotHash': 'Lote #',
    'lotDetail.created': 'Creado el',
    'lotDetail.publishFail': 'No se pudo publicar el lote.',
    'lotDetail.cancelConfirmWithMatches': 'Este lote tiene aportaciones activas. Sólo se cancelará la parte no comprometida. Las cantidades comprometidas se mantendrán y el lote pasará a completado. ¿Continuar?',
    'lotDetail.cancelConfirm': '¿Seguro que quieres cancelar este lote? Esta acción no se puede deshacer.',
    'lotDetail.cancelFail': 'No se pudo cancelar el lote.',
    'lotDetail.hiddenMatches.one': 'Tienes {n} match pendiente de mostrar',
    'lotDetail.hiddenMatches.many': 'Tienes {n} matches pendientes de mostrar',
    'lotDetail.hiddenMatchesDesc': 'Tu plan actual aplica 24 h de retraso a los nuevos matches. Suscríbete para verlos al instante →',
    'lotDetail.coverage': 'Cobertura',
    'lotDetail.totalKg': 'kg totales',
    'lotDetail.committedKg': 'kg comprometidos',
    'lotDetail.calibres': 'Calibres',
    'lotDetail.col.calibre': 'CALIBRE',
    'lotDetail.col.quantity': 'CANTIDAD (kg)',
    'lotDetail.col.percent': '% DEL LOTE',
    'lotDetail.noCalibres': 'Sin calibres definidos',
    'lotDetail.activeMatches': 'Matches activos',
    'lotDetail.noMatches': 'Sin matches activos aún.',
    'lotDetail.noMatchesHint': 'La plataforma te notificará cuando se encuentre un match.',
    'lotDetail.action.openChat': 'Abrir chat',
    'lotDetail.action.viewContract': 'Ver contrato',
    'lotDetail.action.downloadInvoice': 'Descargar factura',
    'lotDetail.action.openDispute': 'Abrir incidencia',
    'lotDetail.details': 'Detalles',
    'lotDetail.product': 'Producto',
    'lotDetail.category': 'Categoría',
    'lotDetail.variety': 'Variedad',
    'lotDetail.type': 'Tipo',
    'lotDetail.typeDirect': 'Venta directa',
    'lotDetail.typeAuction': 'Subasta',
    'lotDetail.availability': 'Disponibilidad',
    'lotDetail.location': 'Ubicación',
    'lotDetail.certifications': 'Certificaciones',
    'lotDetail.comments': 'Comentarios',
    'lotDetail.actions': 'Acciones',
    'lotDetail.publish': 'Publicar lote',
    'lotDetail.edit': 'Editar lote',
    'lotDetail.cancel': 'Cancelar lote',
    'orderDetail.loadFail': 'Error al cargar los detalles del pedido.',
    'orderDetail.notFound': 'Pedido no encontrado.',
    'orderDetail.backToOrders': 'Volver a mis pedidos',
    'orderDetail.title': 'Pedido',
    'orderDetail.coverage': 'Cobertura',
    'orderDetail.edit': 'Editar',
    'orderDetail.close': 'Cerrar pedido',
    'orderDetail.contract': 'Contrato',
    'orderDetail.cancelConfirmWithContrib': 'Este pedido tiene aportaciones de vendedor comprometidas. Sólo se cancelará la parte no comprometida. Las cantidades comprometidas se mantendrán y el pedido pasará a completado. ¿Continuar?',
    'orderDetail.cancelConfirm': '¿Seguro que quieres cerrar este pedido? Esta acción no se puede deshacer.',
    'orderDetail.cancelFail': 'No se pudo cancelar el pedido.',
    'orderDetail.rejectConfirm': '¿Rechazar esta propuesta? El vendedor dejará de verla en sus ofertas.',
    'orderDetail.rejectReason': 'Propuesta rechazada por el comprador desde la vista de pedido.',
    'orderDetail.rejectFail': 'No se pudo rechazar la propuesta.',
    'orderDetail.hiddenMatches.one': 'Tienes {n} match pendiente de mostrar',
    'orderDetail.hiddenMatches.many': 'Tienes {n} matches pendientes de mostrar',
    'orderDetail.closedTitle': 'Pedido cerrado — todas las entregas confirmadas',
    'orderDetail.closedDesc': 'El pago se ha liberado al vendedor o vendedores. Este pedido está archivado.',
    'orderDetail.acceptedContrib.one': '{n} contribución de vendedor aceptada',
    'orderDetail.acceptedContrib.many': '{n} contribuciones de vendedor aceptadas',
    'orderDetail.acceptedDesc': 'Firma el contrato y paga la comisión de Primar-IA para cerrar el acuerdo. El importe de la mercancía lo pagas al vendedor por transferencia según el plazo pactado.',
    'orderDetail.signAndPay': 'Firmar y pagar comisión',
    'orderDetail.preAuthTitle': 'Pago preautorizado',
    'orderDetail.preAuthDesc': 'El importe se libera al vendedor cuando confirmes la entrega.',
    'orderDetail.requestedCalibres': 'Calibres solicitados',
    'orderDetail.col.calibre': 'CALIBRE',
    'orderDetail.col.quantity': 'CANT (kg)',
    'orderDetail.col.maxPrice': 'PRECIO MÁX (€/kg)',
    'orderDetail.noCalibres': 'Sin calibres definidos',
    'orderDetail.sellerOffers': 'Ofertas de vendedores',
    'orderDetail.noOffers': 'Sin propuestas aún.',
    'orderDetail.noOffersHint': 'Cuando un vendedor te haga una propuesta concreta aparecerá aquí.',
    'orderDetail.matchScore': 'Match',
    'orderDetail.totalLabel': 'Total',
    'orderDetail.proposalReadyPulse': 'El vendedor ha hecho una propuesta — acción requerida',
    'orderDetail.rejectProposal': 'Rechazar propuesta',
    'orderDetail.completed': 'Completado',
    'orderDetail.invoice': 'Factura',
    'orderDetail.viewContract': 'Ver contrato',
    'orderDetail.openChat': 'Abrir chat',
    'orderDetail.openDispute': 'Abrir incidencia',
    'orderDetail.shipmentFrom': 'Envío de',
    'orderDetail.delivered': 'Entregado',
    'orderDetail.lotPhotos': '📸 Fotos de preparación del lote',
    'orderDetail.deliveryReceivedPrompt': '📦 ¿Has recibido el envío? Confirma la entrega para liberar el pago.',
    'orderDetail.qrCodePlaceholder': 'Introduce el código QR / verificación…',
    'orderDetail.confirm': 'Confirmar',
    'orderDetail.qrHelp': 'El código viene impreso en la etiqueta QR pegada al lote. El pago se libera al vendedor cuando lo confirmes.',
    'orderDetail.codeFail': 'No se pudo verificar el código.',
    'orderDetail.codeMissing': 'Introduce el código de verificación.',
    'orderDetail.deliveryConfirmed': 'Confirmaste la entrega. Pago liberado.',
    'orderDetail.alreadyRated': 'Ya has valorado esta transacción.',
    'orderDetail.rateSeller': 'Valorar al vendedor',
    'orderDetail.waitingSellerSig': 'Esperando a que el vendedor firme el contrato.',
    'orderDetail.sellerSignedAwaitYou': 'El vendedor ha firmado. Falta tu firma y el pago de la comisión para cerrar el acuerdo — usa el botón «Firmar y pagar comisión» de arriba.',
    'orderDetail.bothSignedAwaitShipment': 'Contrato firmado por ambas partes. El código QR aparecerá en cuanto el vendedor marque la mercancía como enviada.',
    'orderDetail.details': 'Detalles del pedido',
    'orderDetail.product': 'Producto',
    'orderDetail.variety': 'Variedad',
    'orderDetail.totalQty': 'Cantidad total',
    'orderDetail.incoterm': 'Incoterm',
    'orderDetail.destination': 'Destino',
    'orderDetail.frequency': 'Frecuencia',
    'orderDetail.deliveryBy': 'Entrega antes de',
    'orderDetail.notes': 'Notas',
    'orderDetail.proposalTooltip': 'El vendedor ha hecho una propuesta — acción requerida',
    'orderDetail.matchEstado.PROPUESTO': 'Propuesto',
    'orderDetail.matchEstado.ENVIADO_VENDEDOR': 'Enviado al vendedor',
    'orderDetail.matchEstado.ACEPTADO_VENDEDOR': 'Propuesta',
    'orderDetail.matchEstado.RECHAZADO_VENDEDOR': 'Rechazado',
    'orderDetail.matchEstado.PENDIENTE_PAGO': 'Pendiente de pago',
    'orderDetail.matchEstado.CONFIRMADO': 'Confirmado',
    'orderDetail.matchEstado.CANCELADO': 'Cancelado',
    'editOrder.title': 'Editar pedido',
    'editOrder.loadFail': 'No se pudo cargar el pedido.',
    'editOrder.saveFail': 'Error al guardar el pedido',
    'editOrder.committedBanner': 'kg ya reservados por vendedores. No puedes reducir el total por debajo de esa cantidad. Los precios de matches confirmados quedan bloqueados.',
    'editOrder.detailsHeader': 'Detalles del pedido',
    'editOrder.caliber': 'Calibre',
    'editOrder.selectCaliber': 'Selecciona calibre…',
    'editOrder.qtyKg': 'Cantidad (kg)',
    'editOrder.maxPrice': 'Precio máx (€/kg)',
    'editOrder.addCaliber': 'Añadir calibre',
    'editOrder.selectIncoterm': 'Selecciona incoterm…',
    'editOrder.finalDest': 'Destino final',
    'editOrder.finalDestPh': 'p.ej. Puerto de Rotterdam, Países Bajos',
    'editOrder.frequency': 'Frecuencia',
    'editOrder.frequencyPh': 'p.ej. Semanal, Mensual',
    'editOrder.deliveryDate': 'Fecha de entrega deseada',
    'editOrder.notes': 'Notas adicionales',
    'editOrder.notesPh': 'Notas opcionales…',
    'editOrder.cancel': 'Cancelar',
    'editOrder.save': 'Guardar cambios',
    'editLot.title': 'Editar lote',
    'editLot.loadFail': 'No se pudo cargar el lote.',
    'editLot.saveFail': 'Error al guardar el lote',
    'editLot.committedBanner': 'kg ya comprometidos por compradores. No puedes reducir el total por debajo de esa cantidad.',
    'editLot.focusHint': 'Estás ajustando {field} para encajar con la oferta de un comprador. Cambia solo ese campo y guarda — el resto puedes dejarlo igual.',
    'editLot.focus.calibre': 'los calibres',
    'editLot.focus.precio': 'el precio mínimo por calibre',
    'editLot.focus.incoterm': 'los incoterms aceptados',
    'editLot.focus.logistica': 'la logística',
    'editLot.focus.terminoPago': 'los términos de pago',
    'editLot.calibresHeader': 'Calibres y precios',
    'editLot.priceNoteCommitted': 'Nota: los precios se pueden actualizar, pero el total kg debe permanecer ≥ {n} kg comprometidos.',
    'editLot.minPrice': 'Precio mín (€/kg)',
    'editLot.commercialHeader': 'Condiciones comerciales',
    'editLot.whoShips': '¿Quién envía?',
    'editLot.logIndiff': 'más matches',
    'editLot.incotermsAccepted': 'Incoterms aceptados',
    'editLot.paymentTermsAccepted': 'Términos de pago aceptados',
    'editLot.locationHeader': 'Ubicación y notas',
    'editLot.pickup': 'Dirección de recogida',
    'editLot.availableFrom': 'Disponible desde',
    'editLot.comments': 'Comentarios adicionales',
    'editLot.commentsPh': 'Notas opcionales…',
    'cancelModal.title': 'Cancelar contrato',
    'cancelModal.warning': 'Al cancelar, este contrato pasará al estado CANCELADO. Si hay firmas en curso o un plazo de pago abierto, se anularán. La otra parte recibirá un mensaje en el chat con tu motivo.',
    'cancelModal.reasonLabel': 'Motivo de la cancelación',
    'cancelModal.reasonPh': 'Ej: hemos llegado a un acuerdo distinto con otra parte…',
    'cancelModal.charCount': 'caracteres',
    'cancelModal.ack': 'Entiendo que la cancelación es definitiva y que cancelaciones repetidas con la misma contraparte serán revisadas por Primar-IA.',
    'cancelModal.reasonMin': 'Describe el motivo (al menos 5 caracteres).',
    'cancelModal.ackRequired': 'Confirma que entiendes que la cancelación es definitiva.',
    'cancelModal.fail': 'No se pudo cancelar el contrato.',
    'cancelModal.no': 'No cancelar',
    'cancelModal.yes': 'Confirmar cancelación',
    'rating.title': 'Valorar transacción',
    'rating.close': 'Cerrar',
    'rating.alreadyRated': 'Ya has valorado esta transacción.',
    'rating.successMsg': 'Valoración enviada. Gracias.',
    'rating.allRequired': 'Por favor, valora todos los criterios.',
    'rating.submitFail': 'No se pudo enviar la valoración. Inténtalo de nuevo.',
    'rating.commentLabel': 'Comentario (opcional)',
    'rating.commentPh': 'Comparte tu experiencia…',
    'rating.cancel': 'Cancelar',
    'rating.submit': 'Enviar valoración',
    'rating.starsAria': '{n} estrellas',
    'rating.eje.calidad': 'Calidad del producto',
    'rating.eje.puntualidadDelivery': 'Puntualidad en la entrega',
    'rating.eje.empaquetado': 'Empaquetado',
    'rating.eje.comunicacion': 'Comunicación',
    'rating.eje.profesionalidad': 'Profesionalidad',
    'rating.eje.puntualidadPago': 'Puntualidad en el pago',
    'shipping.title': 'Seguimiento de la entrega',
    'shipping.shipmentLabel': 'Envío',
    'shipping.shipmentMarked': 'Marcado por el vendedor el {date}',
    'shipping.shipmentPending': 'Pendiente — el vendedor confirmará el envío de la mercancía',
    'shipping.receiptLabel': 'Recepción',
    'shipping.receiptMarked': 'Confirmada por el comprador el {date}',
    'shipping.receiptPending': 'Pendiente — el comprador confirmará la recepción cuando reciba la mercancía',
    'shipping.markShipped': 'Marcar como enviado',
    'shipping.markShippedFail': 'No se pudo marcar el envío.',
    'shipping.confirmReceived': 'Confirmar recepción',
    'shipping.confirmReceivedFail': 'No se pudo confirmar la recepción.',
    'shipping.rateCounterpart': 'Valorar a la contraparte',
    'shipping.alreadyRated': 'Ya has valorado esta operación',
    'shipping.waitingBuyerReceipt': 'Esperando a que el comprador confirme la recepción. Podrás valorarle cuando lo haga.',
    'shipping.openChat': 'Abrir chat para coordinar la entrega →',
    'dispute.title': 'Abrir reclamación',
    'dispute.filingAsBuyer': 'Reclamación como comprador',
    'dispute.filingAsSeller': 'Reclamación como vendedor',
    'dispute.product': 'Producto',
    'dispute.buyerCounterpart': 'Comprador',
    'dispute.sellerCounterpart': 'Vendedor',
    'dispute.selectPromptBuyer': '¿Qué problema hay con este pedido?',
    'dispute.selectPromptSeller': '¿Qué incidencia tienes con esta transacción?',
    'dispute.describeLabel': 'Describe el problema',
    'dispute.describeMin': '(mínimo 20 caracteres)',
    'dispute.describePhBuyer': 'Explica qué pasó en detalle. Incluye cantidades, fechas y cualquier otra información relevante…',
    'dispute.describePhSeller': 'Explica la situación en detalle. Incluye fechas, intentos de comunicación y cualquier contexto relevante…',
    'dispute.reviewNote': 'Nuestro equipo revisará tu reclamación en 48 horas. Ambas partes serán notificadas y podrán aportar pruebas.',
    'dispute.reviewNoteBuyer': 'Los fondos permanecen en escrow durante el proceso.',
    'dispute.reviewNoteSeller': 'Serás notificado de cualquier resolución.',
    'dispute.evidenceLabel': 'Evidencias (hasta 6 archivos)',
    'dispute.uploading': 'Subiendo…',
    'dispute.addEvidence': 'Añadir foto o PDF',
    'dispute.uploadFail': 'No se pudo subir el archivo.',
    'dispute.submitFail': 'No se pudo abrir la reclamación. Inténtalo de nuevo.',
    'dispute.successTitle': 'Reclamación enviada',
    'dispute.successDesc': 'Nuestro equipo revisará tu reclamación en 48 horas. Te notificaremos de cualquier novedad.',
    'dispute.back': '← Atrás',
    'dispute.submit': 'Enviar reclamación',
    'dispute.cancel': 'Cancelar',
    'dispute.continue': 'Continuar →',
    'dispute.problemBuyer.calidad.label': 'Problema de calidad',
    'dispute.problemBuyer.calidad.desc': 'El producto no cumple con la calidad acordada',
    'dispute.problemBuyer.cantidad.label': 'Cantidad incorrecta',
    'dispute.problemBuyer.cantidad.desc': 'He recibido menos kg de los acordados',
    'dispute.problemBuyer.empaquetado.label': 'Problema de empaquetado',
    'dispute.problemBuyer.empaquetado.desc': 'El producto llegó dañado o mal empaquetado',
    'dispute.problemBuyer.calibres.label': 'Calibres incorrectos',
    'dispute.problemBuyer.calibres.desc': 'He recibido calibres distintos a los pedidos',
    'dispute.problemBuyer.productoDif.label': 'Producto diferente',
    'dispute.problemBuyer.productoDif.desc': 'He recibido un producto distinto al pedido',
    'dispute.problemBuyer.retraso.label': 'Retraso en la entrega',
    'dispute.problemBuyer.retraso.desc': 'El producto no ha llegado en el plazo acordado',
    'dispute.problemBuyer.otro.label': 'Otro problema',
    'dispute.problemBuyer.otro.desc': 'Otro problema no listado arriba',
    'dispute.problemSeller.pago.label': 'Pago no recibido',
    'dispute.problemSeller.pago.desc': 'El pago no se ha liberado tras confirmar la entrega',
    'dispute.problemSeller.noResponde.label': 'El comprador no responde',
    'dispute.problemSeller.noResponde.desc': 'El comprador no responde a mensajes ni a la confirmación de entrega',
    'dispute.problemSeller.rechazo.label': 'Rechazo injustificado',
    'dispute.problemSeller.rechazo.desc': 'El comprador ha rechazado la entrega sin motivo válido',
    'dispute.problemSeller.logistica.label': 'Problema logístico / acceso',
    'dispute.problemSeller.logistica.desc': 'No he podido completar la entrega por logística o acceso',
    'dispute.problemSeller.datos.label': 'Datos de entrega incorrectos',
    'dispute.problemSeller.datos.desc': 'La dirección o el contacto de entrega son erróneos',
    'dispute.problemSeller.cancelacion.label': 'Cancelación injusta del comprador',
    'dispute.problemSeller.cancelacion.desc': 'El comprador canceló tras tener el lote ya preparado y enviado',
    'dispute.problemSeller.otro.label': 'Otra incidencia',
    'dispute.problemSeller.otro.desc': 'Otro problema no listado arriba',
    'negCard.ownProposal': 'Tu propuesta',
    'negCard.receivedProposal': 'Propuesta recibida',
    'negCard.estado.pending': 'Pendiente',
    'negCard.estado.accepted': 'Aceptada',
    'negCard.estado.rejected': 'Rechazada',
    'negCard.estado.superseded': 'Superada',
    'negCard.currentSuffix': 'actual',
    'negCard.proposed': 'Propuesto',
    'negCard.field.price': 'Precio',
    'negCard.field.incoterm': 'Incoterm',
    'negCard.field.logistics': 'Logística',
    'negCard.field.payment': 'Pago',
    'negCard.field.calibres': 'Calibres',
    'negCard.calibresShort': '{n} cal. · {kg} kg',
    'negCard.reject': 'Rechazar',
    'negCard.counter': 'Contraoferta',
    'negCard.accept': 'Aceptar',
    'negCard.acceptFail': 'Error al aceptar',
    'negCard.rejectFail': 'Error al rechazar',
    'negCard.waitingResponse': 'Esperando respuesta de la otra parte…',
    'negModal.titlePropose': 'Proponer cambio',
    'negModal.titleCounter': 'Realizar contraoferta',
    'negModal.logistics': 'Logística',
    'negModal.noChange': 'Sin cambio',
    'negModal.incoterm': 'Incoterm',
    'negModal.filteredByLog': '(filtrado por logística)',
    'negModal.paymentTerm': 'Término de pago',
    'negModal.calibresHeader': 'Calibres y cantidades',
    'negModal.editCalibres': 'Editar calibres',
    'negModal.cancelEdit': 'Cancelar cambios',
    'negModal.noCalibres': 'Sin calibres definidos',
    'negModal.col.caliber': 'Calibre',
    'negModal.col.qty': 'Cantidad (kg)',
    'negModal.col.price': 'Precio €/kg',
    'negModal.addCalibre': 'Añadir calibre',
    'negModal.noContextCalibres': 'No hay calibres negociables en este match.',
    'negModal.maxKg': 'Máx {n} kg',
    'negModal.maxKgSplit': '(vendedor {v} / comprador {c})',
    'negModal.errNoChange': 'Debes cambiar al menos un término respecto al actual.',
    'negModal.errOverMax': 'Hay calibres con kg por encima del máximo permitido por el match.',
    'negModal.submitFail': 'No se pudo enviar la propuesta.',
    'negModal.cancel': 'Cancelar',
    'negModal.submit': 'Enviar propuesta',
    'negModal.submitCounter': 'Contraoferta',
    'negModal.pricePh': '€/kg',
    'messagesPage.title': 'Mensajes',
    'messagesPage.subtitleSeller': 'Chat con tus compradores sobre operaciones activas.',
    'messagesPage.subtitleBuyer': 'Chatea con tus vendedores sobre pedidos activos.',
    'analytics.sellerTitle': 'Analíticas de ventas',
    'analytics.buyerTitle': 'Analíticas de compras',
    'analytics.empty': 'Sin datos aún',
    'analytics.emptySellerHint': 'Publica tu primer lote y completa un match para ver tus analíticas aquí.',
    'analytics.emptyBuyerHint': 'Crea y publica tu primer pedido para empezar a ver tus analíticas de compra.',
    'analytics.kpi.totalOrders': 'Pedidos totales',
    'analytics.kpi.totalSpend': 'Gasto total',
    'analytics.kpi.volumePurchased': 'Volumen comprado',
    'analytics.kpi.avgPrice': 'Precio medio / kg',
    'analytics.kpi.totalVolMatched': 'Volumen total matcheado',
    'analytics.kpi.totalValue': 'Valor total',
    'analytics.kpi.lotsSold': 'Lotes vendidos',
    'analytics.kpi.subActiveCovered': '{a} activos · {c} cubiertos',
    'analytics.kpi.subFromCommitted': 'De lotes comprometidos',
    'analytics.kpi.subAllOrders': 'En todos los pedidos',
    'analytics.kpi.subWeighted': 'Media ponderada',
    'analytics.kpi.subFromConfirmed': 'De matches confirmados',
    'analytics.kpi.subAcrossCalibres': 'En todos los calibres',
    'analytics.kpi.subOfTotal': 'de {n} lotes totales',
    'analytics.kpi.subActiveLotsOne': '{n} lote activo',
    'analytics.kpi.subActiveLotsMany': '{n} lotes activos',
    'analytics.volBuyerHeader': 'Volumen comprado a lo largo del tiempo (kg) — Últimos 12 meses',
    'analytics.volSellerHeader': 'Volumen comprometido a lo largo del tiempo (kg) — Últimos 12 meses',
    'analytics.topProductsBuyer': 'Productos más comprados por volumen (kg)',
    'analytics.topProductsSeller': 'Productos más vendidos por volumen (kg)',
    'analytics.ordersByCategory': 'Pedidos por categoría de producto',
    'analytics.topSellers': 'Top vendedores por volumen',
    'analytics.noMatchedVolume': 'Aún no hay volumen matcheado. Los matches aparecen cuando un vendedor acepta tu pedido.',
    'analytics.noMatchedVolumeSeller': 'Aún no hay volumen matcheado. Completa tu primer match para ver el gráfico.',
    'analytics.noProductData': 'Aún no hay datos de productos.',
    'analytics.noProductDataSeller': 'Aún no hay datos de productos disponibles.',
    'analytics.noCategoryData': 'Aún no hay datos por categoría.',
    'analytics.noSellerData': 'Aún no hay datos de vendedores. Los datos aparecen cuando se confirman matches.',
    'analytics.searchSellers': 'Buscar vendedores…',
    'analytics.noSellerDataAvailable': 'Sin datos de vendedores disponibles.',
    'analytics.lotSummary': 'Resumen de lotes',
    'analytics.lotSummary.total': 'Total lotes',
    'analytics.lotSummary.active': 'Activos',
    'analytics.lotSummary.sold': 'Vendidos',
    'analytics.col.farmer': 'VENDEDOR',
    'analytics.col.volume': 'VOLUMEN (kg)',
    'analytics.col.value': 'VALOR (€)',
    'analytics.col.matches': 'MATCHES',
    'analytics.tooltip.volume': 'Volumen',
    'analytics.tooltip.orders': 'Pedidos',
    'credits.title': 'Créditos de {item} disponibles',
    'credits.now': 'ahora',
    'credits.nextIn': 'Próximo crédito en',
    'credits.atMax': 'Tienes el máximo de créditos disponibles.',
    'credits.empty': 'Sin créditos. Mejora tu plan para crear sin límites.',
    'plan.popular': 'Popular',
    'plan.free': 'Gratis',
    'plan.perMonth': '/mes',
    'plan.current': 'Tu Plan Actual',
    'plan.upgrade': 'Mejorar Plan',
    'plan.seller.cosecha.name': 'Cosecha',
    'plan.seller.campo.name': 'Campo',
    'plan.seller.finca.name': 'Finca',
    'plan.buyer.mercado.name': 'Mercado',
    'plan.buyer.lonja.name': 'Lonja',
    'plan.buyer.central.name': 'Central',
    'plan.badge.campo': 'Vendedor Activo',
    'plan.badge.finca': 'Vendedor Pro',
    'plan.badge.lonja': 'Comprador Verificado',
    'plan.badge.central': 'Comprador Premium',
    'plan.feature.lotes3': 'Hasta 3 lotes activos en publicación',
    'plan.feature.photos3': '3 fotos por lote',
    'plan.feature.matches15min': 'Matches con 24 h de retraso (los planes de pago los reciben antes)',
    'plan.feature.analytics30d': 'Panel de analíticas: últimos 30 días',
    'plan.feature.certs3': '3 certificados de calidad (BIO, GLOBALG.A.P., IFS…)',
    'plan.feature.negotiation': 'Chat de negociación completo con el contraparte',
    'plan.feature.lotes15': 'Hasta 15 lotes activos en publicación',
    'plan.feature.photos10': '10 fotos por lote (mayor visibilidad en matching)',
    'plan.feature.matchesNow': 'Matches en tiempo real (sin retraso)',
    'plan.feature.analyticsFull': 'Analíticas completas: histórico 12 meses',
    'plan.feature.certs5': '5 certificados de calidad',
    'plan.feature.exportCsv': 'Exportar operaciones a CSV',
    'plan.feature.harvestEstim': 'Estimación de cosecha con IA (planifica volumen)',
    'plan.feature.support24h': 'Soporte prioritario por email (respuesta <24 h)',
    'plan.feature.lotesUnlimited': 'Lotes activos ilimitados',
    'plan.feature.photosUnlimited': 'Fotos por lote ilimitadas',
    'plan.feature.matchesAlerts': 'Matches en tiempo real + alertas por email',
    'plan.feature.analyticsTrends': 'Analíticas + tendencias de mercado y benchmarks',
    'plan.feature.certsUnlimited': 'Certificados de calidad ilimitados',
    'plan.feature.exportCsvPdf': 'Exportar CSV + informes PDF brandeables',
    'plan.feature.supportPhone': 'Account manager dedicado + soporte telefónico',
    'plan.feature.orders5': 'Hasta 5 pedidos activos simultáneos',
    'plan.feature.commissionStandard': 'Comisión estándar Primar-IA por operación',
    'plan.feature.invoiceDownload': 'Descarga PDF de facturas y contratos firmados',
    'plan.feature.orders20': 'Hasta 20 pedidos activos + badge "Comprador Verificado"',
    'plan.feature.ordersUnlimited': 'Pedidos activos ilimitados',
    'plan.feature.commissionDiscount': 'Descuento −1,0 pp sobre la comisión estándar (ahorro por operación)',
    'plan.feature.exportStats': 'Exportar estadísticas a CSV y PDF',
    'plan.feature.supportDedicated': 'Account manager dedicado + soporte telefónico',
    'plan.feature.credits3regenWeek': '3 créditos de creación (se regenera 1 cada semana hasta el máximo)',
    'plan.feature.creditsUnlimited': 'Creaciones ilimitadas (sin créditos, solo limitado por el máximo activo)',
    'plan.feature.commissionMore': 'ver más',
    'commissions.back': 'Volver',
    'commissions.title': 'Cómo funciona la comisión Primar-IA',
    'commissions.intro': 'La comisión es la ÚNICA cantidad que Primar-IA cobra por intermediar una operación. Se calcula sobre el importe total del contrato (mercancía + logística), y se compone de un porcentaje base por ticket más descuentos por plan de suscripción y por volumen de compra confirmado.',
    'commissions.whoPays.title': '¿Quién paga la comisión?',
    'commissions.whoPays.body': 'La comisión la paga SIEMPRE el comprador a Primar-IA en el momento de firmar el contrato (vía Stripe). El vendedor recibe el 100% del importe acordado fuera de la plataforma, por transferencia, según el término de pago pactado. Primar-IA no cobra ni paga la mercancía — solo intermedia contrato y comisión.',
    'commissions.baseTiers.title': '1. Porcentaje base por ticket',
    'commissions.baseTiers.desc': 'El porcentaje base depende del valor total del contrato. Cuanto mayor es la operación, menor es el porcentaje.',
    'commissions.baseTiers.colTicket': 'Valor del contrato',
    'commissions.baseTiers.colPct': 'Comisión base',
    'commissions.planDiscount.title': '2. Descuento por plan de suscripción',
    'commissions.planDiscount.desc': 'Los compradores con plan de pago obtienen un descuento permanente sobre el porcentaje base. Se aplica en TODAS sus operaciones.',
    'commissions.planDiscount.colPlan': 'Plan del comprador',
    'commissions.planDiscount.colDiscount': 'Descuento',
    'commissions.volumeDiscount.title': '3. Descuento por volumen confirmado',
    'commissions.volumeDiscount.desc': 'Se calcula sobre el volumen comprado y entregado en los últimos 30 días. Cuanto más compras (y completas sin incidencias), más bajo es tu porcentaje en la siguiente operación.',
    'commissions.volumeDiscount.colVolume': 'Volumen últimos 30 días',
    'commissions.volumeDiscount.colDiscount': 'Descuento',
    'commissions.caps.title': 'Topes y mínimos',
    'commissions.caps.min': 'Mínimo 5 € por operación (cubre coste administrativo).',
    'commissions.caps.max': 'Máximo 5 000 € por operación (tope absoluto, da igual el tamaño).',
    'commissions.caps.floor': 'El porcentaje final tras descuentos nunca baja del 0 % — los descuentos solo restan, no generan crédito.',
    'commissions.calc.title': 'Calculadora de comisión',
    'commissions.calc.desc': 'Introduce el importe del contrato y, opcionalmente, tu volumen comprado en los últimos 30 días. Comparamos lo que pagarías de comisión en cada plan de comprador.',
    'commissions.calc.amountLabel': 'Importe del contrato',
    'commissions.calc.volumeLabel': 'Tu volumen últimos 30 días (opcional)',
    'commissions.calc.volumeHint': 'Solo cuenta volumen confirmado y entregado sin incidencias.',
    'commissions.calc.tierFree': 'Free',
    'commissions.calc.tierMid': 'Mid',
    'commissions.calc.tierTop': 'Top',
    'commissions.calc.rowBase': 'Base por ticket',
    'commissions.calc.rowPlanDisc': 'Descuento por plan',
    'commissions.calc.rowVolDisc': 'Descuento por volumen',
    'commissions.calc.rowFinalPct': 'Porcentaje final',
    'commissions.calc.rowCommission': 'Comisión a pagar',
    'commissions.calc.savings': 'Ahorras {n} vs Mercado',
    'commissions.calc.note': 'Los importes ya incluyen los topes (mínimo 5 €, máximo 5 000 €). Cálculo en tiempo real con los porcentajes vigentes.',
    'commissions.footer': 'Estos valores son los implementados a fecha de hoy. Cualquier cambio se notifica con 30 días de antelación a usuarios activos.',
    'incotermWizard.title': '¿Cuáles aceptas?',
    'incotermWizard.q1': '¿Quién transporta?',
    'incotermWizard.q1.iShip': 'Yo envío',
    'incotermWizard.q1.otherPicks': 'Otro recoge',
    'incotermWizard.q1.indifferent': 'Indiferente (más matches)',
    'incotermWizard.q2': '¿Hasta dónde transportas?',
    'incotermWizard.q2.exwLabel': 'Solo carga en mi origen (EXW)',
    'incotermWizard.q2.exwDesc': 'El comprador carga y se lo lleva.',
    'incotermWizard.q2.fcaLabel': 'Cargado en transporte del comprador (FCA)',
    'incotermWizard.q2.fcaDesc': 'Yo cargo en su camión en mi origen.',
    'incotermWizard.q3': '¿Hasta qué punto pagas el transporte?',
    'incotermWizard.q3.localTransportLabel': 'Transporte local (FOB/CFR/CIF…)',
    'incotermWizard.q3.localTransportDesc': 'Cubres hasta el puerto o frontera local.',
    'incotermWizard.q3.fullDoorLabel': 'Hasta puerta del comprador (DAP/DDP)',
    'incotermWizard.q3.fullDoorDesc': 'Tú asumes el transporte completo.',
    'incotermWizard.recommended': 'Recomendado',
    'incotermWizard.acceptedInList': 'Ya está en tu lista',
    'incotermWizard.willAdd': 'Lo añadiremos a tu lista',
    'incotermWizard.back': 'Atrás',
    'incotermWizard.cancel': 'Cancelar',
    'incotermWizard.apply': 'Añadir incoterm',
    'incotermWizard.open': '¿No sabes cuál elegir? Te ayudamos',
    'incotermWizard.progress.question': 'Pregunta {n} de 5',
    'incotermWizard.progress.results': 'Resultados',
    'incotermWizard.welcome.title': 'Configura tus Incoterms',
    'incotermWizard.welcome.desc': 'Antes de publicar tu primer lote, vamos a ver qué tipos de contrato puedes usar 🌿',
    'incotermWizard.welcome.start': 'Comenzar →',
    'incotermWizard.prev': '← Anterior',
    'incotermWizard.next': 'Siguiente →',
    'incotermWizard.results.title': 'Tu Incoterm recomendado',
    'incotermWizard.results.desc': 'Basado en tus respuestas, te sugerimos empezar con:',
    'incotermWizard.results.selectOthers': 'Selecciona otros Incoterms que también quieras usar:',
    'incotermWizard.results.back': '← Volver',
    'incotermWizard.results.confirm': 'Confirmar y comenzar →',
    'incotermWizard.q.v1.text': '¿A dónde envías habitualmente tus productos?',
    'incotermWizard.q.v1.nacional': '🇪🇸 Solo en España (nacional)',
    'incotermWizard.q.v1.ue': '🇪🇺 A otros países de la UE',
    'incotermWizard.q.v1.extraue': '🌍 Fuera de la UE (exportación)',
    'incotermWizard.q.v2.text': '¿Quién organiza el transporte?',
    'incotermWizard.q.v2.comprador': 'El comprador lo gestiona todo',
    'incotermWizard.q.v2.vendedor': 'Yo (el vendedor) contrato el transporte',
    'incotermWizard.q.v2.compartido': 'Lo compartimos / servicio de Primar-IA',
    'incotermWizard.q.v3.text': '¿Quién asume el seguro de la mercancía?',
    'incotermWizard.q.v3.comprador': 'El comprador se asegura',
    'incotermWizard.q.v3.vendedor': 'Prefiero asegurarla yo',
    'incotermWizard.q.v3.ninguno': 'Sin seguro específico',
    'incotermWizard.q.v4.text': '¿Tienes experiencia con aduanas e importación?',
    'incotermWizard.q.v4.si': 'Sí, gestiono exportaciones habitualmente',
    'incotermWizard.q.v4.no': 'No, prefiero una operación simple',
    'incotermWizard.q.v5.text': '¿Cuándo quieres que el riesgo pase al comprador?',
    'incotermWizard.q.v5.recogida': 'Cuando recoge en mi explotación / almacén',
    'incotermWizard.q.v5.entrega': 'Al entregar en destino',
    'incotermWizard.q.v5.puerto': 'En el puerto o terminal de origen',
    'market.title': 'Mercado',
    'market.subtitle': 'Precios y volumen de mercado por producto en Primar-IA',
    'market.loadFail': 'No se pudieron cargar los datos de mercado.',
    'market.lastUpdated': 'Actualizado',
    'market.filterProduct': 'Producto',
    'market.allProducts': 'Todos los productos',
    'market.filterCategory': 'Categoría',
    'market.allCategories': 'Todas las categorías',
    'market.empty': 'Sin datos de mercado todavía',
    'market.emptyHint': 'Aparecerán datos cuando haya matches confirmados en la plataforma.',
    'market.col.product': 'PRODUCTO',
    'market.col.variety': 'VARIEDAD',
    'market.col.category': 'CATEGORÍA',
    'market.col.priceAvg': 'PRECIO MEDIO',
    'market.col.priceMin': 'MÍN',
    'market.col.priceMax': 'MÁX',
    'market.col.volume': 'VOLUMEN',
    'market.col.matches': 'MATCHES',
    'market.col.trend': 'TENDENCIA',
    'market.trend.up': 'Subiendo',
    'market.trend.down': 'Bajando',
    'market.trend.flat': 'Estable',
    'market.searchPh': 'Buscar producto…',
    'market.noResults': 'Sin resultados con el filtro aplicado.',
    'market.export': 'Exportar CSV',
    'market.totalProducts': 'Productos',
    'market.totalVolume': 'Volumen total',
    'market.totalMatches': 'Matches',
    'market.avgPrice': 'Precio medio',
    'market.analysisTitle': 'Análisis de Mercado',
    'market.analysisDesc': 'Precios reales en Primar-IA y análisis semanal del boletín oficial del MAPA.',
    'market.weekly.title': 'Análisis semanal — Boletín MAPA',
    'market.weekly.week': 'Semana',
    'market.weekly.generated': 'Generado el',
    'market.weekly.officialBulletin': 'Boletín oficial',
    'market.weekly.alza': 'Al alza',
    'market.weekly.baja': 'A la baja',
    'market.sentiment.alcista': 'Alcista',
    'market.sentiment.bajista': 'Bajista',
    'market.sentiment.mixto': 'Mixto',
    'market.sentiment.estable': 'Estable',
    'market.byProduct': 'Mercado por producto',
    'market.confirmedOpsDays': 'Operaciones confirmadas en los últimos {n} días',
    'market.emptyNotEnough': 'Aún no hay suficientes transacciones confirmadas para mostrar datos de mercado.',
    'market.col.product2': 'Producto',
    'market.col.priceAvg2': 'Precio medio',
    'market.col.variation7d': 'Variación (7d)',
    'market.col.volume2': 'Volumen',
    'market.col.txCount': 'Transacciones',
    'market.row.hide': 'Ocultar',
    'market.row.more': 'Más detalles',
    'market.detail.lockedTitle': 'El análisis detallado requiere suscripción',
    'market.detail.lockedDesc': 'Accede a histórico de precios diario y desglose por calibre con cualquiera de nuestros planes.',
    'market.detail.viewPlans': 'Ver planes',
    'market.detail.loadFail': 'Error al cargar el detalle',
    'market.detail.noDaily': 'Aún no hay suficientes datos diarios de {product} en este periodo.',
    'market.detail.kpi.current': 'Precio actual',
    'market.detail.kpi.variation': 'Var. en periodo',
    'market.detail.kpi.totalVolume': 'Volumen total',
    'market.detail.kpi.daysWithData': 'Días con datos',
    'market.detail.priceHistoryHeader': 'Histórico diario de precio medio',
    'market.detail.calibreBreakdownHeader': 'Desglose por calibre',
    'market.detail.noCalibre': 'Sin calibre',
    'market.detail.col.calibre': 'Calibre',
    'market.detail.col.avgPrice': 'Precio medio',
    'market.detail.col.volume': 'Volumen',
    'market.detail.col.ops': 'Ops.',
    'market.tooltip.priceAvg': 'Precio medio',
    'profile.loadFail': 'No se pudo cargar el perfil.',
    'profile.saveFail': 'Error al guardar el perfil.',
    'profile.saveSuccess': 'Cambios guardados.',
    'profile.section.account': 'Cuenta',
    'profile.section.company': 'Datos de la empresa',
    'profile.section.address': 'Dirección fiscal',
    'profile.section.contact': 'Persona de contacto legal',
    'profile.section.bank': 'Datos bancarios',
    'profile.section.tax': 'Régimen fiscal',
    'profile.section.preferences': 'Preferencias',
    'profile.email': 'Email',
    'profile.phone': 'Teléfono',
    'profile.razonSocial': 'Razón social',
    'profile.legalForm': 'Forma jurídica',
    'profile.cifNif': 'CIF / NIF',
    'profile.street': 'Calle y número',
    'profile.city': 'Ciudad',
    'profile.zip': 'Código postal',
    'profile.country': 'País',
    'profile.name': 'Nombre',
    'profile.lastName': 'Apellidos',
    'profile.position': 'Cargo',
    'profile.iban': 'IBAN',
    'profile.swift': 'SWIFT / BIC',
    'profile.regimenFiscal': 'Régimen fiscal',
    'profile.notEditable': 'No editable — contacta con soporte para cambiarlo.',
    'profile.cancel': 'Cancelar',
    'profile.password.title': 'Cambiar contraseña',
    'profile.password.current': 'Contraseña actual',
    'profile.password.new': 'Contraseña nueva',
    'profile.password.confirm': 'Confirmar contraseña nueva',
    'profile.password.change': 'Cambiar contraseña',
    'profile.password.mismatch': 'Las contraseñas no coinciden.',
    'profile.password.tooShort': 'La contraseña debe tener al menos 12 caracteres.',
    'profile.password.success': 'Contraseña actualizada correctamente.',
    'profile.password.fail': 'No se pudo actualizar la contraseña.',
    'profile.delete.title': 'Eliminar cuenta',
    'profile.delete.desc': 'Esto eliminará permanentemente tu cuenta y todos tus datos. Esta acción no se puede deshacer.',
    'profile.delete.button': 'Eliminar mi cuenta',
    'profile.delete.confirm': '¿Seguro que quieres eliminar tu cuenta? Esta acción no se puede deshacer.',
    'profile.delete.fail': 'No se pudo eliminar la cuenta. Contacta con soporte.',
    'profile.logout': 'Cerrar sesión',
    'profile.tab.account': 'Cuenta',
    'profile.tab.company': 'Datos de empresa',
    'profile.tab.tutoriales': 'Tutoriales',
    'profile.subtitle': 'Gestiona tu cuenta y los datos de tu empresa.',
    'profile.contactPerson': 'Persona de contacto',
    'profile.fullName': 'Nombre',
    'profile.preferences': 'Preferencias',
    'profile.phonePh': '+34 600 000 000',
    'profile.saveError': 'Error al guardar los cambios.',
    'profile.passwordError': 'Error al cambiar la contraseña.',
    'profile.passwordUpdateButton': 'Actualizar contraseña',
    'profile.company.lockedBanner.before': 'Los datos de empresa quedan bloqueados una vez verificados. Escribe a',
    'profile.company.lockedBanner.after': 'para solicitar cambios.',
    'profile.company.loading': 'Cargando…',
    'profile.company.razonSocial': 'Razón social',
    'profile.company.cifNif': 'CIF / NIF',
    'profile.company.formaJuridica': 'Forma jurídica',
    'profile.company.direccionFiscal': 'Dirección fiscal',
    'profile.company.ciudad': 'Ciudad',
    'profile.company.codigoPostal': 'Código postal',
    'profile.company.pais': 'País',
    'profile.company.iban': 'IBAN',
    'profile.company.ibanStripe': 'Gestionado de forma segura por Stripe',
    'profile.tab.documents': 'Mis documentos',
    'profile.tab.contracts': 'Incoterms',
    'profile.sellerSubtitle': 'Gestiona tu cuenta, los datos de tu empresa y tus certificaciones.',
    'tutorials.title': 'Tutoriales',
    'tutorials.subtitle': 'Aprende a sacar el máximo de Primar-IA en unos minutos.',
    'tutorials.completed': 'Completado',
    'tutorials.start': 'Empezar',
    'tutorials.replay': 'Repetir',
    'tutorials.skip': 'Saltar',
    'tutorials.next': 'Siguiente',
    'tutorials.back': 'Atrás',
    'tutorials.finish': 'Finalizar',
    'tutorials.banner.title': 'Te damos la bienvenida a Primar-IA',
    'tutorials.banner.body': 'Empieza con un tour de 2 minutos para conocer la plataforma.',
    'tutorials.banner.cta': 'Empezar tour',
    'tutorials.banner.dismiss': 'Ahora no',
    'tutorials.error.title': 'No pudimos mostrar este tutorial',
    'tutorials.error.body': 'Algo ha fallado al iniciar el tour. Vuelve a intentarlo en unos segundos.',
    'tutorials.error.close': 'Cerrar',
    'tutorials.banner.testMode': 'Modo prueba',
    'tutorials.banner.followingTour': 'estás siguiendo el tutorial',
    'tutorials.banner.nothingSaved': 'Nada de lo que hagas se guarda.',
    'tutorials.banner.exit': 'Salir del tutorial',
    'tutorials.flow.crearLote': 'Crear y vender un lote',
    'tutorials.flow.hacerPedido': 'Hacer un pedido',
    'tutorials.boundary.title': 'El tutorial encontró un error',
    'tutorials.boundary.body': 'Hemos cerrado el modo prueba para que la app vuelva a funcionar con normalidad. Recarga la página para continuar.',
    'tutorials.boundary.reload': 'Recargar',
    'tutorials.launcher.title': 'Tour guiado de la plataforma',
    'tutorials.launcher.subtitle': 'Empieza con un tour interactivo para conocer Primar-IA paso a paso.',
    'tutorials.launcher.duration': '~3 minutos',
    'tutorials.launcher.start': 'Empezar tour',
    'tutorials.launcher.close': 'Cerrar',
    'tutorials.intro.welcome.title': '¡Bienvenido a Primar-IA!',
    'tutorials.intro.welcome.content': 'En este recorrido te enseñamos los apartados principales en menos de 1 minuto. Puedes saltarlo cuando quieras y verlo de nuevo desde tu perfil.',
    'tutorials.intro.sidebar.title': 'Menú principal',
    'tutorials.intro.sidebar.contentSeller': 'Desde aquí accedes a tus Lotes, Matches con compradores, Contratos, Mensajes y más.',
    'tutorials.intro.sidebar.contentBuyer': 'Desde aquí accedes a tus Pedidos, Mensajes, Contratos, Estadísticas y más.',
    'tutorials.intro.header.title': 'Notificaciones y cuenta',
    'tutorials.intro.header.content': 'Arriba a la derecha verás tus notificaciones, el acceso al perfil y la opción de cerrar sesión.',
    'tutorials.intro.panel.title': 'Tu panel',
    'tutorials.intro.panel.contentSeller': 'En el panel verás tus lotes activos, matches pendientes y operaciones en curso. Crea un lote y la plataforma lo emparejará automáticamente con compradores compatibles.',
    'tutorials.intro.panel.contentBuyer': 'En el panel verás tus pedidos activos y las ofertas de los vendedores. Crea un pedido y la plataforma te traerá lotes que encajen con tus calibres y precio.',
    'tutorials.intro.reputation.title': 'Tu reputación se construye operando',
    'tutorials.intro.reputation.content': 'Tu puntuación se calcula con cada operación: cuantas más transacciones cierres con éxito, mejor reputación tendrás en la plataforma — y mejores condiciones desbloquearás.',
    'tutorials.intro.moreTutorials.title': 'Más tutoriales en tu perfil',
    'tutorials.intro.moreTutorials.content': 'En Perfil → Tutoriales tienes guías para los flujos principales (crear lote, hacer pedido, abrir una incidencia…). Te llevamos ahora para que les eches un vistazo.',
    'tutorials.intro.locale.back': 'Atrás',
    'tutorials.intro.locale.close': 'Cerrar',
    'tutorials.intro.locale.last': 'Ir a mi perfil',
    'tutorials.intro.locale.next': 'Siguiente',
    'tutorials.intro.locale.open': 'Abrir',
    'tutorials.intro.locale.skip': 'Saltar tutorial',
    'tutorials.section.title': 'Aprende a usar la plataforma',
    'tutorials.section.subtitle': 'Guías cortas para los flujos principales. No son obligatorias y puedes hacerlas en cualquier orden.',
    'tutorials.section.loading': 'Cargando…',
    'tutorials.section.minutes': 'min',
    'tutorials.section.completed': 'Completado',
    'tutorials.section.comingSoon': 'Próximamente',
    'tutorials.section.replay': 'Repetir',
    'tutorials.section.start': 'Empezar',
    'tutorials.catalog.intro.title': 'Introducción a Primar-IA',
    'tutorials.catalog.intro.desc': 'Recorrido por el menú, las notificaciones y tu panel. Incluye cómo se construye tu reputación con cada operación.',
    'tutorials.catalog.crearLote.title': 'Crear y vender un lote (flujo completo)',
    'tutorials.catalog.crearLote.desc': 'Recorrido con datos simulados: publicar lote, recibir matches, firmar contrato, enviar y cobrar.',
    'tutorials.catalog.hacerPedido.title': 'Hacer un pedido (flujo completo)',
    'tutorials.catalog.hacerPedido.desc': 'Recorrido con datos simulados: crear pedido, recibir ofertas, firmar contrato, pagar comisión, recibir mercancía.',
    'tutorials.catalog.incidencia.title': 'Abrir una incidencia',
    'tutorials.catalog.incidencia.desc': 'Qué hacer si algo no llega como debía: pasos para abrir disputa y resolución.',
    'tutorials.runner.back': 'Atrás',
    'tutorials.runner.close': 'Salir',
    'tutorials.runner.last': 'Terminar',
    'tutorials.runner.next': 'Continuar',
    'tutorials.runner.open': 'Abrir',
    'tutorials.runner.skip': 'Salir del tutorial',
    'tasks.title': 'Tareas pendientes',
    'tasks.empty': 'Sin tareas pendientes.',
    'tasks.back': 'Volver',
    'tasks.type.firma': 'Firma de contrato',
    'tasks.type.pago': 'Pago de comisión',
    'tasks.type.envio': 'Envío de mercancía',
    'tasks.type.recepcion': 'Confirmar recepción',
    'tasks.type.valoracion': 'Valorar transacción',
    'tasks.action': 'Ir a la tarea',
    'tasks.backToDashboard': 'Volver al panel',
    'tasks.loadFail': 'No se pudieron cargar las tareas.',
    'tasks.unknownType': 'Tipo de tarea desconocido.',
    'tasks.allCaughtUp': '¡Estás al día!',
    'tasks.pendingTaskOne': 'tarea pendiente',
    'tasks.pendingTaskMany': 'tareas pendientes',
    'tasks.lotPrefix': 'Lote',
    'tasks.buyer': 'Comprador',
    'tasks.seller': 'Vendedor',
    'tasks.sign': 'Firmar →',
    'tasks.prepare': 'Preparar →',
    'tasks.review': 'Revisar →',
    'tasks.expired': 'Caducado',
    'tasks.ended': 'Finalizado',
    'tasks.sold': 'Vendido',
    'tasks.extendLabel': 'Extender a nueva fecha',
    'tasks.saving': 'Guardando…',
    'tasks.extend': 'Extender',
    'tasks.closeLot': 'Cerrar lote',
    'tasks.closeOrder': 'Cerrar pedido',
    'tasks.publishNewLot': 'Publicar lote nuevo',
    'tasks.createNewOrder': 'Crear pedido nuevo',
    'tasks.empty.seller.contracts': 'No hay contratos pendientes de tu firma.',
    'tasks.empty.seller.photos': 'No hay envíos pendientes de QR o foto.',
    'tasks.empty.seller.matches': 'No hay ofertas de match pendientes de revisión.',
    'tasks.empty.seller.expiry': 'No hay lotes con fecha de disponibilidad vencida.',
    'tasks.empty.buyer.contracts': 'No hay contratos pendientes de firmar y pagar.',
    'tasks.empty.buyer.offers': 'No hay ofertas pendientes de autorizar.',
    'tasks.empty.buyer.deliveries': 'No hay entregas pendientes de confirmar.',
    'tasks.empty.buyer.expiry': 'No hay pedidos con fecha de entrega vencida.',
    'tasks.seller.contracts': 'Contratos por firmar',
    'tasks.seller.photos': 'Preparación de envío y QR',
    'tasks.seller.matches': 'Ofertas por revisar',
    'tasks.seller.expiry': 'Lotes con disponibilidad caducada',
    'tasks.buyer.contracts': 'Contratos por firmar y pagar',
    'tasks.buyer.offers': 'Ofertas pendientes de autorizar',
    'tasks.buyer.deliveries': 'Entregas pendientes de confirmar',
    'tasks.buyer.expiry': 'Pedidos con fecha de entrega vencida',
    'tasks.confirm': 'Confirmar →',
    'tasks.pay': 'Pagar →',
    'qr.title': 'Código QR del envío',
    'qr.subtitle': 'Pega el código en el exterior del lote para que el comprador pueda confirmar la entrega.',
    'qr.codeLabel': 'Código de verificación',
    'qr.copyCode': 'Copiar código',
    'qr.copied': '¡Copiado!',
    'qr.deliveryInstructions': 'El comprador deberá introducir este código al recibir la mercancía para liberar el pago.',
    'qr.back': 'Volver',
    'qr.loadFail': 'No se pudo cargar el QR.',
    'qr.redirecting': 'Redirigiendo al detalle del pedido…',
    'qr.loadContract': 'No se pudo cargar la información del contrato.',
    'qr.imageOnly': 'Selecciona un archivo de imagen.',
    'qr.imageMax': 'La imagen debe ser menor de 10MB.',
    'qr.uploadFail': 'Subida fallida.',
    'qr.addPhotos': 'Añade al menos una foto.',
    'qr.savePhotosFail': 'No se pudieron guardar las fotos.',
    'qr.savePhotosSuccess': '¡Fotos guardadas! El comprador podrá verlas.',
    'qr.backToLot': 'Volver al lote',
    'qr.notFound': 'No encontrado.',
    'qr.notGeneratedTitle': 'Código QR aún no generado',
    'qr.notGeneratedDesc': 'Ambas partes deben firmar el contrato antes de generar el QR.',
    'qr.pageTitle': 'Código QR y fotos del lote',
    'qr.lotVerification': 'Código QR de verificación del lote',
    'qr.printHint': 'Imprime este QR y pégalo en el lote antes de enviar.',
    'qr.buyerScans': 'El comprador escaneará este código para confirmar la entrega.',
    'qr.manualEntryLabel': 'Código de verificación (entrada manual):',
    'qr.deliveryConfirmedByBuyer': 'Entrega confirmada por el comprador',
    'qr.alreadyRated': 'Ya has valorado esta transacción.',
    'qr.rateBuyer': 'Valorar comprador',
    'qr.printBtn': 'Imprimir QR',
    'qr.shipment': 'Envío',
    'qr.product': 'Producto',
    'qr.quantity': 'Cantidad',
    'qr.buyer': 'Comprador',
    'qr.status': 'Estado',
    'qr.photosTitle': 'Fotos de preparación del lote',
    'qr.photosDesc': 'Sube fotos del lote preparado. El comprador las verá antes de la entrega.',
    'qr.uploading': 'Subiendo…',
    'qr.clickToUpload': 'Pulsa para subir una foto',
    'qr.photoFormat': 'JPG o PNG, máximo 10MB cada una',
    'qr.savePhotos': 'Guardar fotos',
    'qr.photosUploaded': 'Fotos del lote',
    'confirm.loadFail': 'No se pudieron cargar los detalles del pedido.',
    'confirm.notFound': 'Pedido no encontrado.',
    'confirm.noTx': 'No se encontró transacción para este pedido.',
    'confirm.releaseFail': 'No se pudo liberar el pago. Contacta con soporte.',
    'confirm.backToOrders': 'Volver a pedidos',
    'confirm.successTitle': '¡Lote recibido correctamente!',
    'confirm.successDesc': 'Revisa los detalles antes de liberar el pago.',
    'confirm.summary': 'Resumen de entrega',
    'confirm.product': 'Producto',
    'confirm.farmerId': 'ID vendedor',
    'confirm.quantity': 'Cantidad',
    'confirm.orderId': 'Pedido',
    'confirm.releaseBtn': 'Marcar como inspeccionado y liberar pago',
    'confirm.reportBtn': 'Reportar incidencia',
    'confirm.warning': 'Liberar el pago es irreversible. Confirma solo si el lote ha sido inspeccionado y aceptado.',
    'delivery.title': 'Confirmar entrega',
    'delivery.confirmTitle': 'Introduce el código de verificación',
    'delivery.confirmDesc': 'El código viene impreso en la etiqueta QR pegada al lote.',
    'delivery.codePh': 'Código QR / verificación…',
    'delivery.confirm': 'Confirmar entrega',
    'delivery.fail': 'No se pudo verificar el código.',
    'delivery.success': 'Entrega confirmada. Pago liberado al vendedor.',
    'delivery.back': 'Volver al pedido',
    'delivery.loadFail': 'No se pudo cargar la información de entrega.',
    'delivery.notFound': 'No encontrado.',
    'delivery.cameraFail': 'No se pudo acceder a la cámara. Introduce el código manualmente.',
    'delivery.enterCode': 'Introduce el código QR.',
    'delivery.verifyFail': 'Falló la verificación.',
    'delivery.notSignedTitle': 'Contrato aún sin firmar por ambas partes',
    'delivery.notSignedDesc': 'Ambas partes deben firmar el contrato antes de poder confirmar la entrega.',
    'delivery.backToOrder': 'Volver al pedido',
    'delivery.shipmentDetails': 'Detalles del envío',
    'delivery.product': 'Producto',
    'delivery.quantity': 'Cantidad',
    'delivery.seller': 'Vendedor',
    'delivery.status': 'Estado',
    'delivery.lotPhotos': 'Fotos de preparación del lote',
    'delivery.confirmedTitle': 'Entrega confirmada',
    'delivery.confirmedDesc': 'El pago se ha liberado al vendedor. Este pedido está cerrado.',
    'delivery.viewClosed': 'Ver pedidos cerrados',
    'delivery.allOrders': 'Todos los pedidos',
    'delivery.scanTitle': 'Escanear código QR',
    'delivery.scanDesc': 'Escanea el código QR pegado en el lote, o introduce el código de verificación manualmente.',
    'delivery.closeCamera': 'Cerrar cámara',
    'delivery.openCamera': 'Abrir cámara',
    'delivery.manualTitle': 'Código de verificación manual',
    'delivery.manualDesc': 'Si no puedes escanear el QR, introduce el código impreso en la etiqueta.',
    'delivery.codePlaceholder': 'Introduce el código de verificación…',
    'report.title': 'Reportar incidencia',
    'report.subtitle': 'Cuéntanos qué ha pasado y nuestro equipo lo revisará.',
    'report.problem': 'Tipo de incidencia',
    'report.describe': 'Describe la incidencia',
    'report.evidence': 'Evidencias (fotos / PDFs)',
    'report.submit': 'Enviar reporte',
    'report.fail': 'No se pudo enviar el reporte.',
    'report.success': 'Reporte enviado. Te contactaremos en menos de 48 h.',
    'report.back': 'Volver',
    'report.orderHash': 'Pedido #',
    'report.descMin': 'mín. caracteres',
    'report.descPh': 'Describe la incidencia con detalle…',
    'report.descRequired': 'La descripción debe tener al menos {n} caracteres',
    'report.evidenceLabel': 'Archivos de evidencia',
    'report.evidenceHint': 'Sube hasta 6 archivos (máx 10 MB cada uno). {n}/6 subidos.',
    'report.uploaded': 'subidos',
    'report.minChars': 'min chars',
    'report.uploadFail': 'No se pudo subir el archivo.',
    'report.submitFail': 'No se pudo enviar el reporte. Inténtalo de nuevo.',
    'report.remove': 'Quitar',
    'report.cancel': 'Cancelar',
    'report.issue.CALIDAD': 'Problema de calidad',
    'report.issue.CANTIDAD': 'Problema de cantidad',
    'report.issue.EMPAQUETADO': 'Problema de empaquetado',
    'report.issue.CALIBRES': 'Problema de calibres',
    'report.issue.PRODUCTO_DIFERENTE': 'Producto diferente',
    'report.issue.OTRO': 'Otro',
    'report.issueType': 'Tipo de incidencia',
    'harvest.title': 'Estimación de cosecha',
    'harvest.subtitle': 'Calcula tu volumen y revenue esperado en función de hectáreas y rendimiento.',
    'harvest.product': 'Producto',
    'harvest.variety': 'Variedad',
    'harvest.hectares': 'Hectáreas',
    'harvest.expectedYield': 'Rendimiento esperado (kg/ha)',
    'harvest.estimate': 'Estimar',
    'harvest.estimateResult': 'Resultado de la estimación',
    'harvest.totalKg': 'Volumen total estimado',
    'harvest.priceRange': 'Rango de precios actual',
    'harvest.revenue': 'Revenue estimado',
    'harvest.fail': 'No se pudo calcular la estimación.',
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
    'auth.login.errEmailNotVerified': 'Please verify your email before signing in. Check your inbox for the verification link.',
    'auth.login.errAccountRejected': 'Your account has been rejected. Contact support for more information.',
    'auth.login.errAccountSuspended': 'Your account is suspended. Contact support.',
    'auth.login.errInvalidCredentials': 'Invalid credentials. Check your email and password.',
    'auth.verify.title.loading': 'Verifying your account…',
    'auth.verify.subtitle.loading': 'One moment, checking the link.',
    'auth.verify.title.pending': 'Email confirmed',
    'auth.verify.body.pending': "We've confirmed your email. Your account is awaiting manual approval by an administrator — usually less than 24 business hours. We'll notify you by email once it's active. Meanwhile you can sign in and browse the platform.",
    'auth.verify.title.error': 'Could not verify',
    'auth.verify.body.errorDefault': 'Could not verify the email. The link may have expired or already been used.',
    'auth.verify.title.success': 'Email verified!',
    'auth.verify.body.success': 'Your account is active. You can now sign in and start using Primar-IA.',
    'auth.verify.btn.signIn': 'Sign in',
    'auth.verify.btn.backLogin': 'Back to login',
    'auth.verify.btn.newAccount': 'Create a new account',
    'auth.verify.tokenMissing': 'Verification token missing from URL.',
    'auth.verify.support': 'Problems? Contact support: soporte@primar-ia.com',
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
    'dashboard.action.signContract.one': 'Sign and pay 1 contract',
    'dashboard.action.signContract.many': 'Sign and pay {n} contracts',
    'dashboard.action.signContract.desc': "The seller has signed. You have 48 business hours to pay the commission and sign.",
    'dashboard.action.authorizePayment.one': 'Authorize payment for 1 offer',
    'dashboard.action.authorizePayment.many': 'Authorize payment for {n} offers',
    'dashboard.action.authorizePayment.desc': 'Pre-authorize payment to confirm the deal in escrow.',
    'dashboard.action.confirmDelivery.one': 'Confirm delivery of 1 shipment',
    'dashboard.action.confirmDelivery.many': 'Confirm delivery of {n} shipments',
    'dashboard.action.confirmDelivery.desc': "The seller has marked it as shipped. Confirm you have received the goods.",
    'dashboard.action.rateSeller.one': 'Rate the seller on 1 operation',
    'dashboard.action.rateSeller.many': 'Rate the seller on {n} operations',
    'dashboard.action.rateSeller.desc': 'Goods received. Rate the seller to close the operation.',
    'dashboard.action.rateBuyer.one': 'Rate the buyer on 1 operation',
    'dashboard.action.rateBuyer.many': 'Rate the buyer on {n} operations',
    'dashboard.action.rateBuyer.desc': 'Goods received. Rate the buyer to close the operation.',
    'dashboard.action.expiredOrders.one': '1 order past delivery date',
    'dashboard.action.expiredOrders.many': '{n} orders past delivery date',
    'dashboard.action.expiredOrders.desc': 'Extend the deadline or close the order with the current coverage.',
    'dashboard.action.expiredLots.one': '1 lot past availability date',
    'dashboard.action.expiredLots.many': '{n} lots past availability date',
    'dashboard.action.expiredLots.desc': 'Extend the date or close the lot with the current coverage.',
    'dashboard.action.unreadMessages.one': '1 unread message',
    'dashboard.action.unreadMessages.many': '{n} unread messages',
    'dashboard.action.unreadMessages.desc': 'You have pending messages from the other party.',
    'dashboard.action.reviewMatches.one': 'Review 1 new match',
    'dashboard.action.reviewMatches.many': 'Review {n} new matches',
    'dashboard.action.reviewMatches.desc': 'Buyers interested in your lots. Accept or decline from the Matches tab.',
    'dashboard.action.markShipped.one': 'Mark 1 shipment as sent',
    'dashboard.action.markShipped.many': 'Mark {n} shipments as sent',
    'dashboard.action.markShipped.desc': "Contract is signed and commission paid. Mark the shipment so the buyer can confirm.",
    'dashboard.action.sellerSignContract.one': 'Sign 1 contract',
    'dashboard.action.sellerSignContract.many': 'Sign {n} contracts',
    'dashboard.action.sellerSignContract.desc': 'You have contracts pending to sign as seller. The buyer can pay and sign after.',
    'lots.title': 'My lots',
    'lots.newLot': 'New lot',
    'lots.empty': 'No lots yet. Publish your first lot to start selling.',
    'lots.search': 'Search by lot ID or product…',
    'lots.tab.all': 'All',
    'lots.tab.open': 'Open',
    'lots.tab.inProgress': 'In progress',
    'lots.tab.full': 'Completed',
    'lots.tab.cancelled': 'Cancelled',
    'lots.col.id': 'Lot ID',
    'lots.col.product': 'Product',
    'lots.col.totalKg': 'Total qty',
    'lots.col.coverage': 'Coverage %',
    'lots.col.status': 'Status',
    'lots.col.availableDate': 'Pickup date',
    'lots.pendingRating': 'You have a transaction pending rating.',
    'lots.rateNow': 'Rate now',
    'orders.title': 'My orders',
    'orders.newOrder': 'New order',
    'orders.empty': 'No orders yet. Create your first order to start buying.',
    'orders.search': 'Search by order ID or product…',
    'orders.tab.all': 'All',
    'orders.tab.open': 'Open',
    'orders.tab.inProgress': 'In progress',
    'orders.tab.covered': 'Covered',
    'orders.tab.closed': 'Closed',
    'orders.tab.cancelled': 'Cancelled',
    'orders.col.id': 'Order ID',
    'orders.col.product': 'Product',
    'orders.col.totalKg': 'Total qty',
    'orders.col.coverage': 'Coverage %',
    'orders.col.status': 'Status',
    'orders.col.deliveryDate': 'Delivery date',
    'orders.pendingRating': 'You have a transaction pending rating.',
    'orders.rateNow': 'Rate now',
    'matches.title': 'Compatible orders',
    'matches.loadError': 'Could not load matches.',
    'matches.hiddenByDelay.title': 'You have {n} {n_plural} waiting',
    'matches.hiddenByDelay.body': 'On the free seller plan, matches are generated instantly but only become visible 24 h later. Upgrade your plan to see them now — or wait and they will appear on their own.',
    'matches.hiddenByDelay.cta': 'See plans and unlock now',
    'matches.hiddenByDelay.nextVisible': 'The next one becomes visible {when}',
    'dashboard.loadError': 'Could not load dashboard data.',
    'dashboard.emptyOrdersInline': 'No active orders.',
    'dashboard.emptyOrdersCta': 'Create one',
    'dashboard.emptyLotsInline': 'No active lots.',
    'dashboard.emptyLotsCta': 'Publish one',
    'freeTier.notice.title': 'Your free plan delays matching by 24 hours',
    'freeTier.notice.bodyLote': 'Once you publish this lot, match proposals will be generated immediately but not visible until 24 h later. Upgrade your plan so your lot starts receiving matches instantly.',
    'freeTier.notice.bodyPedido': 'Once you publish this order, match proposals will be generated immediately but not visible until 24 h later. Upgrade your plan so your order starts receiving matches instantly.',
    'freeTier.notice.cta': 'See plans and remove the delay',
    'seasonalCalendar.favTab': 'Favorites',
    'seasonalCalendar.emptyFavorites': "You haven't favorited anything yet. Tap the star ⭐ on a product to add it.",
    'seasonalCalendar.emptyCategory': 'No data for this category',
    'seasonalCalendar.addFav': 'Mark as favorite',
    'seasonalCalendar.removeFav': 'Remove from favorites',
    'market.favorites.section': 'Your favorites',
    'market.favorites.starLabel': 'Favorite',
    'potential.banner.lote': 'There are {n} {n_plural} interested in a lot like this.',
    'potential.banner.pedido': 'There are {n} {n_plural} who could fulfil this order.',
    'potential.banner.calculating': 'Calculating potential counterparties…',
    'potential.banner.singularBuyer': 'potential buyer',
    'potential.banner.pluralBuyer': 'potential buyers',
    'potential.banner.singularSeller': 'potential seller',
    'potential.banner.pluralSeller': 'potential sellers',
    'lotForm.step1.title': 'Product and sizes',
    'lotForm.step1.desc': 'What you sell, what variety and what sizes.',
    'lotForm.step2.title': 'Logistics and delivery',
    'lotForm.step2.desc': 'Where the lot is, dates, Incoterm and who ships.',
    'lotForm.step3.title': 'Payment and publishing',
    'lotForm.step3.desc': 'Accepted payment terms and final publish.',
    'lotForm.nextStep': 'Next',
    'lotForm.prevStep': 'Back',
    'orderForm.step1.title': 'Product and sizes',
    'orderForm.step1.desc': 'What you need, what variety and what sizes.',
    'orderForm.step2.title': 'Logistics and delivery',
    'orderForm.step2.desc': 'Destination, dates, Incoterm and who ships.',
    'orderForm.step3.title': 'Payment and publishing',
    'orderForm.step3.desc': 'Accepted payment terms and final publish.',
    'orderForm.nextStep': 'Next',
    'orderForm.prevStep': 'Back',
    'matches.subtitle': 'Orders that best match your published lots.',
    'matches.incotermFilter': 'Incoterm filter',
    'matches.incotermFilterRecommended': 'Recommended',
    'matches.incotermFilterCount': '{n} of {total} selected',
    'matches.show': 'Show',
    'matches.hide': 'Hide',
    'matches.edit': 'Edit',
    'matches.reset': 'Reset',
    'matches.bestMatchTitle': 'Best automatic match',
    'matches.bestMatchSub': 'Estimated potential revenue:',
    'matches.bestMatchPotential': '(summing all pending matches)',
    'matches.reviewAccept': 'Review and accept',
    'matches.tab.best': 'Best match',
    'matches.tab.price': 'Best price',
    'matches.tab.distance': 'Closest',
    'matches.tab.newest': 'Newest',
    'matches.empty.filterHides.one': 'You have 1 match but the incoterm filter hides it.',
    'matches.empty.filterHides.many': 'You have {n} matches but the incoterm filter hides them.',
    'matches.empty.filterHidesDesc': 'Broaden the incoterms in the filter or press "Reset" to see them all.',
    'matches.empty.noMatches': 'No compatible orders yet.',
    'matches.empty.noMatchesDesc': "No buyer matches the calibres of your current lots. See what they're asking for below.",
    'matches.marketDemandTitle': "What buyers are asking for",
    'matches.marketDemandSub': "— update your lot calibres to match",
    'matches.marketDemandCalibre': 'Calibre {c}',
    'matches.marketDemandOrders.one': '1 order',
    'matches.marketDemandOrders.many': '{n} orders',
    'matches.group.matches.one': '1 match',
    'matches.group.matches.many': '{n} matches',
    'matchCard.profitability': 'Profitability\nindex',
    'matchCard.yourLot': 'Your lot',
    'matchCard.price': 'Price',
    'matchCard.destination': 'Destination',
    'matchCard.distance': 'Distance',
    'matchCard.remainingQty': 'Remaining quantity',
    'matchCard.notAvailable': 'N/A',
    'matchCard.contribute': 'Contribute',
    'similar.title': 'Similar offers',
    'similar.subtitle': 'Orders close to yours with small differences you could tweak to match.',
    'similar.severity.minor': 'Minor change',
    'similar.severity.moderate': 'Needs adjustments',
    'similar.severity.major': 'Big differences',
    'similar.field.calibre': 'Calibre',
    'similar.field.incoterm': 'Incoterm',
    'similar.field.logistica': 'Logistics',
    'similar.field.precio': 'Price',
    'similar.field.terminoPago': 'Payment terms',
    'similar.adjust': 'Adjust',
    'similar.delivery': 'Delivery',
    'similar.empty': "No orders close to your lots right now. We'll notify you when there are.",
    'similar.errorLoading': 'Could not load similar offers.',
    'similar.headerSub.one': '1 order close to your lots — tweak conditions to match',
    'similar.headerSub.many': '{n} orders close to your lots — tweak conditions to match',
    'orderForm.title': 'Create order',
    'orderForm.commercialDetails': 'Commercial details',
    'orderForm.product': 'Product',
    'orderForm.product.placeholder': 'Select product…',
    'orderForm.variety': 'Variety',
    'orderForm.variety.placeholder': 'Select variety…',
    'orderForm.variety.other': 'Other (specify)…',
    'orderForm.variety.any': 'Any variety (matches all)',
    'orderForm.variety.customPlaceholder': 'Type variety name…',
    'orderForm.frequency': 'Frequency',
    'orderForm.frequency.placeholder': 'Select…',
    'orderForm.frequency.weekly': 'Weekly',
    'orderForm.frequency.biweekly': 'Bi-weekly',
    'orderForm.frequency.monthly': 'Monthly',
    'orderForm.frequency.onetime': 'One-time',
    'orderForm.destination': 'Final destination',
    'orderForm.destination.placeholder': 'e.g. Port of Rotterdam',
    'orderForm.deliveryDate': 'Desired delivery date',
    'orderForm.noCalibreCheckbox': 'No calibre (any calibre accepted)',
    'orderForm.quantityKg': 'Quantity (kg)',
    'orderForm.maxPriceKg': 'Max price (€/kg)',
    'orderForm.caliber': 'Calibre',
    'orderForm.caliber.placeholder': 'Select calibre…',
    'orderForm.qtyKg': 'Qty (kg)',
    'orderForm.sellingPriceKg': 'Buying price (€/kg)',
    'orderForm.addCaliber': 'Add another calibre',
    'orderForm.comments': 'Comments',
    'orderForm.comments.placeholder': 'Additional notes for sellers…',
    'orderForm.logisticsTitle': 'Logistics and terms',
    'orderForm.whoShips': 'Who handles shipping?',
    'orderForm.principalIncoterm': 'Principal incoterm',
    'orderForm.otherIncoterms': 'Other accepted incoterms',
    'orderForm.otherIncotermsHint': '(optional, more matches)',
    'orderForm.incotermFilteredNote': "Incoterms are filtered by who ships. Change the logistics option to see them all.",
    'orderForm.paymentTermsTitle': 'Accepted payment terms',
    'orderForm.paymentTermsHelp': "Select one or more. Matches will include sellers accepting any of these.",
    'orderForm.futureLogisticsTitle': 'Get a logistics quote with Primar-IA',
    'orderForm.futureLogisticsBadge': 'Coming soon',
    'orderForm.futureLogisticsDesc': "Soon you'll be able to request transport quotes directly from Primar-IA with integrated carriers, without leaving the platform.",
    'orderForm.futureLogisticsBtn': 'Request quote',
    'orderForm.futureLogisticsBtnTitle': 'This feature will be available soon',
    'orderForm.cancel': 'Cancel',
    'orderForm.publish': 'Publish order',
    'orderForm.publishing': 'Publishing…',
    'lotForm.title': 'Publish new lot',
    'lotForm.productDetails': 'Product details',
    'lotForm.product': 'Product',
    'lotForm.product.placeholder': 'Select product…',
    'lotForm.variety': 'Variety',
    'lotForm.variety.placeholder': 'Select variety…',
    'lotForm.variety.other': 'Other (specify)…',
    'lotForm.variety.customPlaceholder': 'Type variety name…',
    'lotForm.noCalibreCheckbox': 'Non calibrated / non graded lot',
    'lotForm.estimatedQty': 'Estimated quantity (kg)',
    'lotForm.estimatedQty.placeholder': 'Total kg available',
    'lotForm.caliber': 'Calibre',
    'lotForm.caliber.placeholder': 'Select calibre…',
    'lotForm.caliber.customPlaceholder': 'e.g. 70/80 mm',
    'lotForm.qtyKg': 'Quantity (kg)',
    'lotForm.qtyKg.placeholder': '1000',
    'lotForm.addCaliber': 'Add another calibre',
    'lotForm.logisticsTitle': 'Logistics and availability',
    'lotForm.location.placeholder': 'Lot location',
    'lotForm.availableFrom': 'Available from',
    'lotForm.availableUntil': 'Available until',
    'lotForm.whoShips': 'Who handles shipping?',
    'lotForm.acceptedIncoterms': 'Accepted incoterms',
    'lotForm.acceptedIncotermsHint': '(pick one or more)',
    'lotForm.recommendedByProfile': 'Recommended for your profile:',
    'lotForm.dontShow': "Don't show",
    'lotForm.dontShowTitle': 'Hide the recommendation and accept all incoterms by default',
    'lotForm.incotermFilteredNote': 'Incoterms are filtered by who ships. To see more, change the logistics option.',
    'lotForm.paymentTermsTitle': 'Accepted payment terms',
    'lotForm.paymentTermsHelp': 'Pick one or more. The buyer will be able to pay under any of the terms you accept.',
    'lotForm.extraInfoTitle': 'Extra info',
    'lotForm.certificates': 'Associated certificates',
    'lotForm.certificates.empty': 'You have no approved certificates yet. Upload them in your profile and wait for the admin to verify.',
    'lotForm.photos': 'Lot photos',
    'lotForm.photos.upload': 'Upload lot photo',
    'lotForm.photos.error': "Couldn't upload the photo. Try again.",
    'lotForm.extraComments': 'Additional comments',
    'lotForm.extraComments.placeholder': 'Any extra information about this lot…',
    'lotForm.saveDraft': 'Save as draft',
    'lotForm.publish': 'Publish lot',
    'lotForm.publishing': 'Publishing…',
    'contract.notFound': 'Contract not found.',
    'contract.backToMatches': 'Back to matches',
    'contract.sellerTitle': 'Contract — Sign as seller',
    'contract.summary': 'Operation summary',
    'contract.summary.product': 'Product',
    'contract.summary.quantity': 'Quantity',
    'contract.summary.pricePerKg': 'Agreed price/kg',
    'contract.summary.totalGoods': 'Total goods amount',
    'contract.summary.incoterm': 'Incoterm',
    'contract.summary.paymentTerms': 'Payment terms',
    'contract.summary.destination': 'Destination',
    'contract.summary.calibres': 'Calibres',
    'contract.summary.transferHint': "You'll receive the full amount directly from the buyer by bank transfer per the agreed payment terms.",
    'contract.commission.title': 'Primar-IA commission',
    'contract.commission.amount': 'Estimated amount',
    'contract.commission.percent': 'Applied percentage',
    'contract.commission.helpSeller': 'The commission is paid by the buyer directly to Primar-IA. You receive 100% of the agreed amount by transfer per the contract terms.',
    'contract.document': 'Document',
    'contract.document.download': 'Download contract (PDF)',
    'contract.document.watermark': 'The PDF carries a "Not valid until signed and paid" watermark until both parties sign and the buyer pays the commission.',
    'contract.signatures': 'Signatures status',
    'contract.signatures.sellerYou': 'Seller (you)',
    'contract.signatures.buyer': 'Buyer',
    'contract.signatures.signedOn': 'Signed on',
    'contract.signatures.pendingYours': 'Pending your signature',
    'contract.signatures.buyerWillSignLater': 'Will sign after paying the commission',
    'contract.sign.needTitle': 'Your signature is needed',
    'contract.sign.needDesc': 'Review the PDF before signing. Once you sign, the buyer has',
    'contract.sign.deadlineWord': '48 business hours',
    'contract.sign.deadlineTail': "to pay the commission and sign as well. Otherwise the contract will expire and you can restart.",
    'contract.sign.btn': 'Sign contract',
    'contract.sign.modify': 'Modify terms (chat)',
    'contract.sign.cancel': 'Cancel contract',
    'contract.sign.drawHere': 'Draw your signature:',
    'contract.sign.clear': 'Clear',
    'contract.sign.confirm': 'Confirm signature',
    'contract.sign.cancelDraw': 'Cancel',
    'contract.waitingBuyer.title': 'Waiting for the buyer',
    'contract.waitingBuyer.desc.before': 'You already signed. The buyer must pay the commission and sign before:',
    'contract.waitingBuyer.desc.after': 'Otherwise the contract expires and your signature will be voided automatically.',
    'contract.waitingBuyer.openChat': 'Open chat with the buyer',
    'contract.waitingBuyer.cancel': 'Cancel contract',
    'contract.expired.title': 'Contract expired',
    'contract.expired.desc': "The buyer didn't sign within the deadline. You can regenerate the contract and restart signing from the match screen.",
    'contract.cancelled.title': 'Contract cancelled',
    'contract.cancelled.byYou': 'You cancelled this contract on',
    'contract.cancelled.byBuyer': 'The buyer cancelled this contract on',
    'contract.cancelled.reason': 'Reason:',
    'contract.cancelled.back': 'Back to my matches',
    'contract.signed.title': 'Contract signed by both parties',
    'contract.signed.desc': 'The buyer paid the commission on {date}. Proceed with delivery and collection per the agreed terms.',
    'contract.docs.title': 'Generated documents',
    'contract.docs.intro': "After signing we've auto-generated your sale invoice and Primar-IA's commission invoice.",
    'contract.docs.sellerInvoice': 'Your invoice (sale to buyer)',
    'contract.docs.platformInvoice': 'Primar-IA commission invoice (reference)',
    'contract.buyerTitle': 'Contract — Sign and pay',
    'contract.backToOrders': 'Back to orders',
    'contract.summary.amountToSeller': 'Amount to pay the seller',
    'contract.commission.amountToPay': 'Amount to pay',
    'contract.commission.helpBuyer': 'This commission is paid by the buyer (you) directly to Primar-IA for the matchmaking service. The goods amount is paid directly to the seller per the agreed contract terms.',
    'contract.document.watermarkBuyer': 'Review the contract carefully before signing. It bears a watermark until you sign and pay the commission.',
    'contract.signatures.seller': 'Seller',
    'contract.signatures.buyerYou': 'Buyer (you)',
    'contract.signatures.sellerPending': 'Pending — must sign first',
    'contract.signatures.buyerWillSignOnPay': "You'll sign when paying the commission",
    'contract.sellerNotSignedYet': "The seller hasn't signed yet. You'll be able to sign and pay once they complete their signature.",
    'contract.sellerSignedBanner.title': 'The seller has signed',
    'contract.sellerSignedBanner.before': 'You have until',
    'contract.sellerSignedBanner.deadlineWord': '48 business hours',
    'contract.sellerSignedBanner.after': 'to sign and pay the commission. After that the contract will expire.',
    'contract.signAndPay': 'Sign and pay commission',
    'contract.deadlineExpiredBuyer.title': 'Signing deadline expired',
    'contract.deadlineExpiredBuyer.desc': 'The 48 business-hours window expired on {date}. The contract will move to expired shortly. Chat with the seller if you want to reopen the deal.',
    'contract.openSellerChat': 'Open chat with the seller',
    'contract.expired.descBuyer': 'The 48 business-hours window to sign and pay has expired. Chat with the seller if you want to restart.',
    'contract.cancelled.byBuyerSelf': 'You cancelled this contract on',
    'contract.cancelled.bySeller': 'The seller cancelled this contract on',
    'contract.cancelled.backToOrders': 'Back to my orders',
    'contract.signed.titleBuyer': 'Contract signed and commission paid',
    'contract.signed.descBuyer': 'Commission paid on {date}. Now proceed with paying the goods amount to the seller per the contract terms.',
    'contract.docs.introBuyer': "We've auto-generated the invoices and the payment slip with instructions to pay the seller.",
    'contract.docs.escrow': 'Payment slip to the seller',
    'contract.docs.escrowSub': 'IBAN, amount and reference for your bank transfer',
    'contract.docs.sellerInvoiceBuyer': "Seller's invoice (goods)",
    'contract.docs.platformInvoiceBuyer': 'Primar-IA invoice (commission)',
    'contract.docs.watermarkAmber': 'Review the contract carefully before signing.',
    'contract.signModal.title': 'Irrevocable signature',
    'contract.signModal.warning1': 'Important notice. By signing and paying the commission you accept the contract in a binding and irrevocable way. You will not be able to undo the signature or recover the commission.',
    'contract.signModal.warning2': 'If you fail to meet the agreed terms, you may face legal liability under the Spanish Commercial Code and EU Regulation 910/2014 (eIDAS).',
    'contract.signModal.fieldLabel': 'Your signature (first and last name)',
    'contract.signModal.placeholder': 'E.g. John García López',
    'contract.signModal.fieldHelp': 'This counts as a simple electronic signature under the eIDAS Regulation.',
    'contract.signModal.ack': 'I understand this signature is irrevocable and that by continuing I accept the contract in its entirety.',
    'contract.signModal.cancel': 'Cancel',
    'contract.signModal.confirm': 'Confirm and pay',
    'contract.payment.processing.title': 'Processing your payment…',
    'contract.payment.processing.desc': 'Stripe confirmed the payment. We are finalising the signature and the contract. This usually takes a few seconds.',
    'contract.payment.finalizing.title': 'Payment is being finalised',
    'contract.payment.finalizing.desc1': "Your payment was sent to Stripe but we haven't received the final confirmation yet. Don't press “Sign and pay” again — it's already in progress.",
    'contract.payment.finalizing.desc2': 'If you have been waiting more than a minute, press "Reconcile with Stripe": we check the payment status directly with Stripe and force the contract finalisation.',
    'contract.payment.refresh': 'Refresh',
    'contract.payment.reconcile': 'Reconcile with Stripe',
    'contract.payment.stuck.title': 'Payment is taking longer than usual',
    'contract.payment.stuck.desc': 'Stripe already confirmed the charge but the finalisation is taking longer than usual. Do not retry — the payment is in progress. If you do not see the contract signed in a few minutes, contact support.',
    'contract.payment.cancelled.title': 'Payment cancelled',
    'contract.payment.cancelled.desc': "You cancelled the payment on Stripe. You can retry whenever you want, as long as the seller's signature hasn't expired.",
    'contract.downloadFail': 'Could not download the contract.',
    'chat.title': 'Messages',
    'chat.empty': "You don't have any conversations yet",
    'chat.selectConv': 'Select a conversation',
    'chat.orderHash': 'Order #',
    'chat.noMessages': 'No messages yet. Say hello!',
    'chat.bypassDetected': 'BYPASS DETECTED — message sanitized',
    'chat.close': 'Close',
    'chat.privacy': "For your safety: don't share phone, email or close the deal outside Primar-IA until the contract is signed. Messages are reviewed by AI.",
    'chat.estado.completed': 'Completed',
    'chat.estado.cancelled': 'Cancelled',
    'chat.estado.refunded': 'Refunded',
    'chat.banner.completed': 'This transaction is completed — the conversation is read-only.',
    'chat.banner.cancelled': 'This transaction was cancelled — the conversation is read-only.',
    'chat.banner.refunded': 'This transaction was refunded — the conversation is read-only.',
    'chat.actions.propose': 'Propose price or incoterm change',
    'chat.actions.proposeTitle': 'Propose change',
    'chat.actions.attach': 'Attach file (coming soon)',
    'chat.actions.attachTitle': 'Attachments coming soon',
    'chat.placeholder': 'Type a message… (Enter to send, Shift+Enter for new line)',
    'chat.send': 'Send message',
    'chat.sendFail': 'Could not send the message',
    'register.step1.accountType': 'Account type',
    'register.step1.seller': 'SELLER',
    'register.step1.buyer': 'BUYER',
    'register.step1.email': 'Corporate email',
    'register.step1.emailPh': 'you@company.com',
    'register.step1.password': 'Create password',
    'register.step1.passwordHint': 'Minimum 12 characters',
    'register.step1.confirmPassword': 'Confirm password',
    'register.step1.phone': 'Contact phone number',
    'register.step1.language': 'Preferred language',
    'register.step1.continue': 'Continue to business details',
    'register.step2.companyHeader': 'Company details',
    'register.step2.razonSocial': 'Legal name',
    'register.step2.razonSocialPh': 'Frutas García S.L.',
    'register.step2.legalForm': 'Legal form',
    'register.step2.legalFormPh': 'Select legal form…',
    'register.step2.cifNif': 'CIF / NIF (tax ID)',
    'register.step2.cifNifHint': 'Spanish CIF/NIF or international VAT ID (e.g. B12345678, DE123456789)',
    'register.step2.addressHeader': 'Tax address',
    'register.step2.street': 'Street and number',
    'register.step2.streetPh': 'Calle Mayor 1',
    'register.step2.city': 'City',
    'register.step2.zip': 'Postal code',
    'register.step2.country': 'Country',
    'register.step2.legalContactHeader': 'Legal contact person',
    'register.step2.name': 'First name',
    'register.step2.lastName': 'Last name',
    'register.step2.position': 'Position',
    'register.step2.positionPh': 'Sole Administrator',
    'register.step2.sellerBankHeader': 'Bank and tax details (sellers only)',
    'register.step2.sellerBankDesc': "Needed to issue invoices with the correct tax setup and so the buyer can transfer funds to you. They are entered only once here — to modify them later you'll need to contact Primar-IA.",
    'register.step2.iban': 'IBAN',
    'register.step2.ibanHint': 'International IBAN (ES, DE, FR, IT, GB, NL…). Auto-normalised.',
    'register.step2.swift': 'SWIFT / BIC',
    'register.step2.swiftPh': 'e.g. BSCHESMM, DEUTDEFF (optional)',
    'register.step2.regimenFiscal': 'Tax regime',
    'register.step2.regimenFiscalPh': 'Select tax regime…',
    'register.step2.regimenGeneral': 'General (VAT 21%, no withholding)',
    'register.step2.regimenAgrario': 'Special agricultural regime (VAT 4/10%, IRPF 2%)',
    'register.step2.regimenRecargo': 'Equivalence surcharge (retailer)',
    'register.step2.regimenExento': 'Exempt (intra-community, export…)',
    'register.step2.ibanInvalid': 'Invalid IBAN — required for sellers',
    'register.step2.regimenMissing': 'Select the tax regime',
    'register.step2.back': 'Back',
    'register.step2.continue': 'Continue',
    'register.step3.optionalDocs': 'Documents are NOT mandatory but will position you better in the marketplace.',
    'register.step3.seller.land': 'Proof of land ownership or lease',
    'register.step3.seller.landHint': 'Official document proving access to agricultural land',
    'register.step3.seller.gap': 'GlobalG.A.P. or food safety certificate',
    'register.step3.seller.gapHint': 'Certification from an accredited body',
    'register.step3.seller.organic': 'Organic certification (if applicable)',
    'register.step3.seller.organicHint': 'e.g. CAAE, CCPAE or EU Organic logo',
    'register.step3.buyer.registration': 'Company registration document',
    'register.step3.buyer.registrationHint': 'Official registration from Registro Mercantil or equivalent',
    'register.step3.buyer.license': 'Import / export licence (if applicable)',
    'register.step3.buyer.licenseHint': 'Required for international trade operations',
    'register.step3.back': 'Back',
    'register.step3.continue': 'Continue',
    'register.step4.review': "Your application will be sent for manual review after submission. You'll be notified of the outcome by email within 1–2 business days. In the meantime, your access to the platform will be limited.",
    'register.step4.termsAccept': 'I have read and accept the',
    'register.step4.terms': 'Terms and Conditions',
    'register.step4.privacyAccept': 'I have read and accept the',
    'register.step4.privacy': 'Privacy Policy',
    'register.step4.back': 'Back',
    'register.step4.submit': 'Submit registration request',
    'subscription.title': 'Your Subscription',
    'subscription.subtitleSeller': 'Choose the plan that best fits your production',
    'subscription.subtitleBuyer': 'Choose the plan that best fits your business',
    'subscription.success': 'Your subscription has been activated successfully! You can now enjoy the benefits of your new plan.',
    'subscription.cancelled': 'The payment process was cancelled. You can try again whenever you want.',
    'subscription.errorCheckout': 'Failed to start payment',
    'subscription.changed.upgradedNow': 'Plan upgraded to {plan} — the change applies now, with prorated billing.',
    'subscription.changed.downgradeScheduled': 'Your plan will be downgraded to {plan} on {date}. Until then you keep your current paid plan.',
    'subscription.changed.cancelScheduled': 'Your subscription will be cancelled on {date}. Until then you keep access to your current plan.',
    'subscription.banner.downgradePending': 'Pending change: your plan will downgrade to {plan} on {date}.',
    'subscription.banner.cancelPending': 'Your subscription will be cancelled on {date} and switch to the free plan.',
    'subscription.confirm.upgradeTitle': 'Upgrade to a higher plan?',
    'subscription.confirm.upgradeBody': "You're about to switch from {current} to {target}. The change is immediate and the prorated difference for the current period will be charged.",
    'subscription.confirm.upgradeCta': 'Upgrade now',
    'subscription.confirm.downgradeTitle': 'Downgrade to a lower plan?',
    'subscription.confirm.downgradeBody': "You're about to switch from {current} to {target}. You keep your current plan until the end of the period you've already paid for; next month you'll be charged for the lower plan.",
    'subscription.confirm.downgradeCta': 'Downgrade',
    'subscription.confirm.cancelTitle': 'Cancel subscription?',
    'subscription.confirm.cancelBody': "You're about to switch from {current} to the free plan. You keep full access until the end of the period you've already paid for; the subscription will then be cancelled automatically.",
    'subscription.confirm.cancelCta': 'Cancel subscription',
    'subscription.confirm.keepPlan': 'Keep my plan',
    'subscription.confirm.giftTitle': 'Wait! A welcome gift 🎁',
    'subscription.confirm.giftBody': "As a thank-you for staying with us, we'll give you 1 EXTRA month free on your {current} plan. One-time offer only.",
    'subscription.confirm.giftCta': 'Accept gift and keep my plan',
    'subscription.confirm.giftLoading': 'Applying gift…',
    'subscription.confirm.giftApplied': 'Gift applied. Your next billing date is {date}.',
    'subscription.currentPlan': 'Current plan:',
    'subscription.manage': 'Manage subscription',
    'subscription.activeLots': 'Active lots',
    'subscription.activeOrders': 'Active orders',
    'subscription.breakdown.searching': 'searching',
    'subscription.breakdown.dealing': 'in deal',
    'subscription.breakdown.reserved': 'reserved (pending commission)',
    'subscription.itemLot': 'lot',
    'subscription.itemOrder': 'order',
    'subscription.redirecting': 'Redirecting to Stripe...',
    'disputes.title': 'My disputes',
    'disputes.none': 'No disputes.',
    'disputes.role.buyer': 'Buyer',
    'disputes.role.seller': 'Seller',
    'disputes.role.admin': 'Admin',
    'disputes.estado.open': 'Open',
    'disputes.estado.sellerResponded': 'Seller responded',
    'disputes.estado.inReview': 'In review',
    'disputes.estado.resolved': 'Resolved',
    'disputes.back': 'Back to disputes',
    'disputes.opened': 'Opened',
    'disputes.notFound': 'Dispute not found.',
    'disputes.yourDescription': 'Your description',
    'disputes.buyerClaim': "Buyer's claim",
    'disputes.evidence': 'Evidence',
    'disputes.sellerResponseTitle': "Seller's response",
    'disputes.sellerEvidence': 'Seller evidence',
    'disputes.yourResponse': 'Your response',
    'disputes.yourEvidence': 'Your evidence',
    'disputes.respondPromptDesc': 'A buyer has filed a claim against this transaction. You can submit your response.',
    'disputes.respondPromptBtn': 'Respond',
    'disputes.respondFormTitle': 'Submit your response',
    'disputes.respondFormPh': 'Explain your side. Include any relevant context, dates, and details…',
    'disputes.uploading': 'Uploading…',
    'disputes.addEvidence': 'Add photo or PDF',
    'disputes.respondFail': 'Failed to submit response.',
    'disputes.cancel': 'Cancel',
    'disputes.submitResponse': 'Submit response',
    'disputes.chatTitle': 'Messages',
    'disputes.chatEmpty': 'No messages yet.',
    'disputes.chatPlaceholder': 'Write a message…',
    'lotDetail.loadFail': 'Could not load lot details.',
    'lotDetail.notFound': 'Lot not found.',
    'lotDetail.backToLots': 'Back to my lots',
    'lotDetail.lotHash': 'Lot #',
    'lotDetail.created': 'Created',
    'lotDetail.publishFail': 'Failed to publish lot.',
    'lotDetail.cancelConfirmWithMatches': 'This lot has active contributions. Only the uncommitted part will be cancelled. The committed quantities will be kept and the lot will be marked as completed. Continue?',
    'lotDetail.cancelConfirm': 'Are you sure you want to cancel this lot? This cannot be undone.',
    'lotDetail.cancelFail': 'Failed to cancel lot.',
    'lotDetail.hiddenMatches.one': 'You have {n} match pending to display',
    'lotDetail.hiddenMatches.many': 'You have {n} matches pending to display',
    'lotDetail.hiddenMatchesDesc': 'Your current plan delays new matches by 24 h. Subscribe to see them instantly →',
    'lotDetail.coverage': 'Coverage',
    'lotDetail.totalKg': 'total kg',
    'lotDetail.committedKg': 'committed kg',
    'lotDetail.calibres': 'Calibres',
    'lotDetail.col.calibre': 'CALIBRE',
    'lotDetail.col.quantity': 'QUANTITY (kg)',
    'lotDetail.col.percent': '% OF LOT',
    'lotDetail.noCalibres': 'No calibres defined',
    'lotDetail.activeMatches': 'Active matches',
    'lotDetail.noMatches': 'No active matches yet.',
    'lotDetail.noMatchesHint': "The platform will notify you when a match is found.",
    'lotDetail.action.openChat': 'Open chat',
    'lotDetail.action.viewContract': 'View contract',
    'lotDetail.action.downloadInvoice': 'Download invoice',
    'lotDetail.action.openDispute': 'Open dispute',
    'lotDetail.details': 'Details',
    'lotDetail.product': 'Product',
    'lotDetail.category': 'Category',
    'lotDetail.variety': 'Variety',
    'lotDetail.type': 'Type',
    'lotDetail.typeDirect': 'Direct sale',
    'lotDetail.typeAuction': 'Auction',
    'lotDetail.availability': 'Availability',
    'lotDetail.location': 'Location',
    'lotDetail.certifications': 'Certifications',
    'lotDetail.comments': 'Comments',
    'lotDetail.actions': 'Actions',
    'lotDetail.publish': 'Publish lot',
    'lotDetail.edit': 'Edit lot',
    'lotDetail.cancel': 'Cancel lot',
    'orderDetail.loadFail': 'Failed to load order details.',
    'orderDetail.notFound': 'Order not found.',
    'orderDetail.backToOrders': 'Back to my orders',
    'orderDetail.title': 'Order',
    'orderDetail.coverage': 'Coverage',
    'orderDetail.edit': 'Edit',
    'orderDetail.close': 'Close order',
    'orderDetail.contract': 'Contract',
    'orderDetail.cancelConfirmWithContrib': 'This order has committed seller contributions. Only the uncommitted part will be cancelled. The committed quantities will be kept and the order will be marked as completed. Continue?',
    'orderDetail.cancelConfirm': 'Are you sure you want to close this order? This cannot be undone.',
    'orderDetail.cancelFail': 'Failed to cancel order.',
    'orderDetail.rejectConfirm': 'Reject this proposal? The seller will no longer see it in their offers.',
    'orderDetail.rejectReason': 'Proposal rejected by the buyer from the order view.',
    'orderDetail.rejectFail': 'Failed to reject the proposal.',
    'orderDetail.hiddenMatches.one': 'You have {n} match pending to display',
    'orderDetail.hiddenMatches.many': 'You have {n} matches pending to display',
    'orderDetail.closedTitle': 'Order closed — all deliveries confirmed',
    'orderDetail.closedDesc': 'Payment has been released to the seller(s). This order is now archived.',
    'orderDetail.acceptedContrib.one': '{n} accepted seller contribution',
    'orderDetail.acceptedContrib.many': '{n} accepted seller contributions',
    'orderDetail.acceptedDesc': "Sign the contract and pay the Primar-IA commission to close the deal. The goods amount is paid to the seller by bank transfer per the agreed terms.",
    'orderDetail.signAndPay': 'Sign and pay commission',
    'orderDetail.preAuthTitle': 'Payment pre-authorised',
    'orderDetail.preAuthDesc': 'The amount is released to the seller when you confirm delivery.',
    'orderDetail.requestedCalibres': 'Requested calibres',
    'orderDetail.col.calibre': 'CALIBRE',
    'orderDetail.col.quantity': 'QTY (kg)',
    'orderDetail.col.maxPrice': 'MAX PRICE (€/kg)',
    'orderDetail.noCalibres': 'No calibres defined',
    'orderDetail.sellerOffers': 'Seller offers',
    'orderDetail.noOffers': 'No proposals yet.',
    'orderDetail.noOffersHint': 'When a seller makes a concrete proposal it will appear here.',
    'orderDetail.matchScore': 'Match',
    'orderDetail.totalLabel': 'Total',
    'orderDetail.proposalReadyPulse': 'The seller has made a proposal — action required',
    'orderDetail.rejectProposal': 'Reject proposal',
    'orderDetail.completed': 'Completed',
    'orderDetail.invoice': 'Invoice',
    'orderDetail.viewContract': 'View contract',
    'orderDetail.openChat': 'Open chat',
    'orderDetail.openDispute': 'Open dispute',
    'orderDetail.shipmentFrom': 'Shipment from',
    'orderDetail.delivered': 'Delivered',
    'orderDetail.lotPhotos': '📸 Lot preparation photos',
    'orderDetail.deliveryReceivedPrompt': '📦 Received the shipment? Confirm delivery to release payment.',
    'orderDetail.qrCodePlaceholder': 'Enter the QR / verification code…',
    'orderDetail.confirm': 'Confirm',
    'orderDetail.qrHelp': 'The code is printed on the QR label attached to the lot. Payment is released to the seller once confirmed.',
    'orderDetail.codeFail': 'Could not verify the code.',
    'orderDetail.codeMissing': 'Enter the verification code.',
    'orderDetail.deliveryConfirmed': 'You confirmed delivery. Payment released.',
    'orderDetail.alreadyRated': "You've already rated this transaction.",
    'orderDetail.rateSeller': 'Rate the seller',
    'orderDetail.waitingSellerSig': 'Waiting for the seller to sign the contract.',
    'orderDetail.sellerSignedAwaitYou': "The seller has signed. Your signature and commission payment are pending — use the “Sign and pay commission” button above.",
    'orderDetail.bothSignedAwaitShipment': 'Contract signed by both parties. The QR code will appear as soon as the seller marks the goods as shipped.',
    'orderDetail.details': 'Order details',
    'orderDetail.product': 'Product',
    'orderDetail.variety': 'Variety',
    'orderDetail.totalQty': 'Total quantity',
    'orderDetail.incoterm': 'Incoterm',
    'orderDetail.destination': 'Destination',
    'orderDetail.frequency': 'Frequency',
    'orderDetail.deliveryBy': 'Deliver by',
    'orderDetail.notes': 'Notes',
    'orderDetail.proposalTooltip': 'The seller has made a proposal — action required',
    'orderDetail.matchEstado.PROPUESTO': 'Proposed',
    'orderDetail.matchEstado.ENVIADO_VENDEDOR': 'Sent to seller',
    'orderDetail.matchEstado.ACEPTADO_VENDEDOR': 'Proposal',
    'orderDetail.matchEstado.RECHAZADO_VENDEDOR': 'Rejected',
    'orderDetail.matchEstado.PENDIENTE_PAGO': 'Pending payment',
    'orderDetail.matchEstado.CONFIRMADO': 'Confirmed',
    'orderDetail.matchEstado.CANCELADO': 'Cancelled',
    'editOrder.title': 'Edit order',
    'editOrder.loadFail': 'Could not load the order.',
    'editOrder.saveFail': 'Failed to save the order',
    'editOrder.committedBanner': 'kg already reserved by sellers. You cannot reduce the total below this amount. Prices on confirmed matches are locked.',
    'editOrder.detailsHeader': 'Order details',
    'editOrder.caliber': 'Caliber',
    'editOrder.selectCaliber': 'Select caliber…',
    'editOrder.qtyKg': 'Qty (kg)',
    'editOrder.maxPrice': 'Max price (€/kg)',
    'editOrder.addCaliber': 'Add caliber',
    'editOrder.selectIncoterm': 'Select incoterm…',
    'editOrder.finalDest': 'Final destination',
    'editOrder.finalDestPh': 'e.g. Port of Rotterdam, Netherlands',
    'editOrder.frequency': 'Frequency',
    'editOrder.frequencyPh': 'e.g. Weekly, Monthly',
    'editOrder.deliveryDate': 'Desired delivery date',
    'editOrder.notes': 'Additional notes',
    'editOrder.notesPh': 'Optional notes…',
    'editOrder.cancel': 'Cancel',
    'editOrder.save': 'Save changes',
    'editLot.title': 'Edit lot',
    'editLot.loadFail': 'Could not load the lot.',
    'editLot.saveFail': 'Failed to save the lot',
    'editLot.committedBanner': 'kg already committed by buyers. You cannot reduce the total below this amount.',
    'editLot.focusHint': "You're adjusting {field} to match a buyer's offer. Change just that field and save — the rest can stay the same.",
    'editLot.focus.calibre': 'the calibres',
    'editLot.focus.precio': 'the minimum price per caliber',
    'editLot.focus.incoterm': 'the accepted incoterms',
    'editLot.focus.logistica': 'logistics',
    'editLot.focus.terminoPago': 'payment terms',
    'editLot.calibresHeader': 'Calibres & prices',
    'editLot.priceNoteCommitted': 'Note: prices can be updated, but total kg must stay ≥ {n} kg committed.',
    'editLot.minPrice': 'Min price (€/kg)',
    'editLot.commercialHeader': 'Commercial terms',
    'editLot.whoShips': 'Who ships?',
    'editLot.logIndiff': 'more matches',
    'editLot.incotermsAccepted': 'Accepted incoterms',
    'editLot.paymentTermsAccepted': 'Accepted payment terms',
    'editLot.locationHeader': 'Location & notes',
    'editLot.pickup': 'Pickup location',
    'editLot.availableFrom': 'Available from',
    'editLot.comments': 'Additional comments',
    'editLot.commentsPh': 'Optional notes…',
    'cancelModal.title': 'Cancel contract',
    'cancelModal.warning': "By cancelling, this contract will move to CANCELLED. Any in-progress signatures or open payment deadlines will be voided. The other party will receive a chat message with your reason.",
    'cancelModal.reasonLabel': 'Reason for cancellation',
    'cancelModal.reasonPh': "e.g. we reached a different deal with another party…",
    'cancelModal.charCount': 'characters',
    'cancelModal.ack': 'I understand that cancellation is final and that repeated cancellations with the same counterpart will be reviewed by Primar-IA.',
    'cancelModal.reasonMin': 'Describe the reason (at least 5 characters).',
    'cancelModal.ackRequired': 'Confirm you understand the cancellation is final.',
    'cancelModal.fail': 'Could not cancel the contract.',
    'cancelModal.no': 'Do not cancel',
    'cancelModal.yes': 'Confirm cancellation',
    'rating.title': 'Rate transaction',
    'rating.close': 'Close',
    'rating.alreadyRated': "You've already rated this transaction.",
    'rating.successMsg': 'Rating submitted. Thank you.',
    'rating.allRequired': 'Please rate all criteria.',
    'rating.submitFail': 'Could not submit the rating. Try again.',
    'rating.commentLabel': 'Comment (optional)',
    'rating.commentPh': 'Share your experience…',
    'rating.cancel': 'Cancel',
    'rating.submit': 'Submit rating',
    'rating.starsAria': '{n} stars',
    'rating.eje.calidad': 'Product quality',
    'rating.eje.puntualidadDelivery': 'Delivery punctuality',
    'rating.eje.empaquetado': 'Packaging',
    'rating.eje.comunicacion': 'Communication',
    'rating.eje.profesionalidad': 'Professionalism',
    'rating.eje.puntualidadPago': 'Payment punctuality',
    'shipping.title': 'Delivery tracking',
    'shipping.shipmentLabel': 'Shipment',
    'shipping.shipmentMarked': 'Marked by the seller on {date}',
    'shipping.shipmentPending': "Pending — the seller will confirm when the goods are shipped",
    'shipping.receiptLabel': 'Receipt',
    'shipping.receiptMarked': 'Confirmed by the buyer on {date}',
    'shipping.receiptPending': "Pending — the buyer will confirm receipt when the goods arrive",
    'shipping.markShipped': 'Mark as shipped',
    'shipping.markShippedFail': 'Could not mark the shipment.',
    'shipping.confirmReceived': 'Confirm receipt',
    'shipping.confirmReceivedFail': 'Could not confirm receipt.',
    'shipping.rateCounterpart': 'Rate the counterpart',
    'shipping.alreadyRated': "You've already rated this deal",
    'shipping.waitingBuyerReceipt': "Waiting for the buyer to confirm receipt. You'll be able to rate them once they do.",
    'shipping.openChat': 'Open chat to coordinate delivery →',
    'dispute.title': 'Open a claim',
    'dispute.filingAsBuyer': 'Filing as buyer',
    'dispute.filingAsSeller': 'Filing as seller',
    'dispute.product': 'Product',
    'dispute.buyerCounterpart': 'Buyer',
    'dispute.sellerCounterpart': 'Seller',
    'dispute.selectPromptBuyer': 'What is the issue with this order?',
    'dispute.selectPromptSeller': 'What issue are you experiencing with this transaction?',
    'dispute.describeLabel': 'Describe the issue',
    'dispute.describeMin': '(min. 20 characters)',
    'dispute.describePhBuyer': 'Explain what happened in detail. Include quantities, dates, and any other relevant information…',
    'dispute.describePhSeller': 'Explain the situation in detail. Include dates, communication attempts, and any relevant context…',
    'dispute.reviewNote': 'Our team will review your claim within 48 hours. Both parties will be notified and can provide evidence.',
    'dispute.reviewNoteBuyer': 'Funds remain in escrow during the process.',
    'dispute.reviewNoteSeller': 'You will be notified of any resolution.',
    'dispute.evidenceLabel': 'Evidence (up to 6 files)',
    'dispute.uploading': 'Uploading…',
    'dispute.addEvidence': 'Add photo or PDF',
    'dispute.uploadFail': 'Failed to upload file.',
    'dispute.submitFail': 'Failed to open claim. Please try again.',
    'dispute.successTitle': 'Claim submitted',
    'dispute.successDesc': "Our team will review your claim within 48 hours. You'll be notified of any updates.",
    'dispute.back': '← Back',
    'dispute.submit': 'Submit claim',
    'dispute.cancel': 'Cancel',
    'dispute.continue': 'Continue →',
    'dispute.problemBuyer.calidad.label': 'Quality issue',
    'dispute.problemBuyer.calidad.desc': 'Product does not meet the agreed quality standards',
    'dispute.problemBuyer.cantidad.label': 'Wrong quantity',
    'dispute.problemBuyer.cantidad.desc': 'Received fewer kg than agreed',
    'dispute.problemBuyer.empaquetado.label': 'Packaging issue',
    'dispute.problemBuyer.empaquetado.desc': 'Product arrived damaged or poorly packaged',
    'dispute.problemBuyer.calibres.label': 'Wrong calibres',
    'dispute.problemBuyer.calibres.desc': 'Received calibres different from what was ordered',
    'dispute.problemBuyer.productoDif.label': 'Different product',
    'dispute.problemBuyer.productoDif.desc': 'Received a product different from what was ordered',
    'dispute.problemBuyer.retraso.label': 'Delivery delay',
    'dispute.problemBuyer.retraso.desc': 'Product has not arrived within the agreed timeframe',
    'dispute.problemBuyer.otro.label': 'Other issue',
    'dispute.problemBuyer.otro.desc': 'Other problem not listed above',
    'dispute.problemSeller.pago.label': 'Payment not received',
    'dispute.problemSeller.pago.desc': 'Payment has not been released after confirmed delivery',
    'dispute.problemSeller.noResponde.label': 'Buyer not responding',
    'dispute.problemSeller.noResponde.desc': 'The buyer is not responding to messages or delivery confirmation',
    'dispute.problemSeller.rechazo.label': 'Unjustified rejection',
    'dispute.problemSeller.rechazo.desc': 'The buyer rejected the delivery without valid reason',
    'dispute.problemSeller.logistica.label': 'Logistics / access issue',
    'dispute.problemSeller.logistica.desc': 'Unable to complete delivery due to logistics or access problems',
    'dispute.problemSeller.datos.label': 'Incorrect delivery data',
    'dispute.problemSeller.datos.desc': 'The delivery address or contact information provided is wrong',
    'dispute.problemSeller.cancelacion.label': 'Buyer cancelled unfairly',
    'dispute.problemSeller.cancelacion.desc': 'The buyer cancelled after the lot was already prepared and dispatched',
    'dispute.problemSeller.otro.label': 'Other issue',
    'dispute.problemSeller.otro.desc': 'Other problem not listed above',
    'negCard.ownProposal': 'Your proposal',
    'negCard.receivedProposal': 'Proposal received',
    'negCard.estado.pending': 'Pending',
    'negCard.estado.accepted': 'Accepted',
    'negCard.estado.rejected': 'Rejected',
    'negCard.estado.superseded': 'Superseded',
    'negCard.currentSuffix': 'current',
    'negCard.proposed': 'Proposed',
    'negCard.field.price': 'Price',
    'negCard.field.incoterm': 'Incoterm',
    'negCard.field.logistics': 'Logistics',
    'negCard.field.payment': 'Payment',
    'negCard.field.calibres': 'Calibres',
    'negCard.calibresShort': '{n} cal. · {kg} kg',
    'negCard.reject': 'Reject',
    'negCard.counter': 'Counter-offer',
    'negCard.accept': 'Accept',
    'negCard.acceptFail': 'Failed to accept',
    'negCard.rejectFail': 'Failed to reject',
    'negCard.waitingResponse': "Waiting for the other party's response…",
    'negModal.titlePropose': 'Propose change',
    'negModal.titleCounter': 'Make counter-offer',
    'negModal.logistics': 'Logistics',
    'negModal.noChange': 'No change',
    'negModal.incoterm': 'Incoterm',
    'negModal.filteredByLog': '(filtered by logistics)',
    'negModal.paymentTerm': 'Payment term',
    'negModal.calibresHeader': 'Calibres and quantities',
    'negModal.editCalibres': 'Edit calibres',
    'negModal.cancelEdit': 'Cancel changes',
    'negModal.noCalibres': 'No calibres defined',
    'negModal.col.caliber': 'Caliber',
    'negModal.col.qty': 'Quantity (kg)',
    'negModal.col.price': 'Price €/kg',
    'negModal.addCalibre': 'Add caliber',
    'negModal.noContextCalibres': 'No negotiable calibres in this match.',
    'negModal.maxKg': 'Max {n} kg',
    'negModal.maxKgSplit': '(seller {v} / buyer {c})',
    'negModal.errNoChange': 'You must change at least one term from the current one.',
    'negModal.errOverMax': 'Some calibres have kg above the maximum allowed by the match.',
    'negModal.submitFail': 'Could not send the proposal.',
    'negModal.cancel': 'Cancel',
    'negModal.submit': 'Send proposal',
    'negModal.submitCounter': 'Counter-offer',
    'negModal.pricePh': '€/kg',
    'messagesPage.title': 'Messages',
    'messagesPage.subtitleSeller': 'Chat with your buyers about active deals.',
    'messagesPage.subtitleBuyer': 'Chat with your sellers about active orders.',
    'analytics.sellerTitle': 'Sales analytics',
    'analytics.buyerTitle': 'Purchase analytics',
    'analytics.empty': 'No data yet',
    'analytics.emptySellerHint': 'Publish your first lot and complete a match to see your analytics here.',
    'analytics.emptyBuyerHint': 'Create and publish your first order to start seeing your purchase analytics.',
    'analytics.kpi.totalOrders': 'Total orders',
    'analytics.kpi.totalSpend': 'Total spend',
    'analytics.kpi.volumePurchased': 'Volume purchased',
    'analytics.kpi.avgPrice': 'Avg. price / kg',
    'analytics.kpi.totalVolMatched': 'Total volume matched',
    'analytics.kpi.totalValue': 'Total value',
    'analytics.kpi.lotsSold': 'Lots sold',
    'analytics.kpi.subActiveCovered': '{a} active · {c} covered',
    'analytics.kpi.subFromCommitted': 'From committed lots',
    'analytics.kpi.subAllOrders': 'Across all orders',
    'analytics.kpi.subWeighted': 'Weighted average',
    'analytics.kpi.subFromConfirmed': 'From confirmed matches',
    'analytics.kpi.subAcrossCalibres': 'Across all calibres',
    'analytics.kpi.subOfTotal': 'of {n} total lots',
    'analytics.kpi.subActiveLotsOne': '{n} active lot',
    'analytics.kpi.subActiveLotsMany': '{n} active lots',
    'analytics.volBuyerHeader': 'Volume purchased over time (kg) — Last 12 months',
    'analytics.volSellerHeader': 'Volume committed over time (kg) — Last 12 months',
    'analytics.topProductsBuyer': 'Top products purchased by volume (kg)',
    'analytics.topProductsSeller': 'Top products sold by volume (kg)',
    'analytics.ordersByCategory': 'Orders by product category',
    'analytics.topSellers': 'Top sellers by volume',
    'analytics.noMatchedVolume': 'No matched volume yet. Matches appear once a seller accepts your order.',
    'analytics.noMatchedVolumeSeller': 'No matched volume yet. Complete your first match to see the chart.',
    'analytics.noProductData': 'No product data yet.',
    'analytics.noProductDataSeller': 'No product data available yet.',
    'analytics.noCategoryData': 'No category data yet.',
    'analytics.noSellerData': 'No seller data yet. Data appears once matches are confirmed.',
    'analytics.searchSellers': 'Search sellers…',
    'analytics.noSellerDataAvailable': 'No seller data available.',
    'analytics.lotSummary': 'Lot summary',
    'analytics.lotSummary.total': 'Total lots',
    'analytics.lotSummary.active': 'Active',
    'analytics.lotSummary.sold': 'Sold',
    'analytics.col.farmer': 'SELLER',
    'analytics.col.volume': 'VOLUME (kg)',
    'analytics.col.value': 'VALUE (€)',
    'analytics.col.matches': 'MATCHES',
    'analytics.tooltip.volume': 'Volume',
    'analytics.tooltip.orders': 'Orders',
    'credits.title': 'Available {item} credits',
    'credits.now': 'now',
    'credits.nextIn': 'Next credit in',
    'credits.atMax': 'You have the maximum credits available.',
    'credits.empty': 'No credits left. Upgrade your plan to create without limits.',
    'plan.popular': 'Popular',
    'plan.free': 'Free',
    'plan.perMonth': '/month',
    'plan.current': 'Your current plan',
    'plan.upgrade': 'Upgrade plan',
    'plan.seller.cosecha.name': 'Harvest',
    'plan.seller.campo.name': 'Field',
    'plan.seller.finca.name': 'Farm',
    'plan.buyer.mercado.name': 'Market',
    'plan.buyer.lonja.name': 'Wholesale',
    'plan.buyer.central.name': 'Central',
    'plan.badge.campo': 'Active seller',
    'plan.badge.finca': 'Pro seller',
    'plan.badge.lonja': 'Verified buyer',
    'plan.badge.central': 'Premium buyer',
    'plan.feature.lotes3': 'Up to 3 active lots published',
    'plan.feature.photos3': '3 photos per lot',
    'plan.feature.matches15min': 'Matches with 24h delay (paid plans get them sooner)',
    'plan.feature.analytics30d': 'Analytics dashboard: last 30 days',
    'plan.feature.certs3': '3 quality certificates (BIO, GLOBALG.A.P., IFS…)',
    'plan.feature.negotiation': 'Full negotiation chat with counterparty',
    'plan.feature.lotes15': 'Up to 15 active lots published',
    'plan.feature.photos10': '10 photos per lot (better matching visibility)',
    'plan.feature.matchesNow': 'Real-time matches (no delay)',
    'plan.feature.analyticsFull': 'Full analytics: 12-month history',
    'plan.feature.certs5': '5 quality certificates',
    'plan.feature.exportCsv': 'Export operations to CSV',
    'plan.feature.harvestEstim': 'AI harvest estimation (plan volume)',
    'plan.feature.support24h': 'Priority email support (response <24 h)',
    'plan.feature.lotesUnlimited': 'Unlimited active lots',
    'plan.feature.photosUnlimited': 'Unlimited photos per lot',
    'plan.feature.matchesAlerts': 'Real-time matches + email alerts',
    'plan.feature.analyticsTrends': 'Analytics + market trends and benchmarks',
    'plan.feature.certsUnlimited': 'Unlimited quality certificates',
    'plan.feature.exportCsvPdf': 'CSV export + branded PDF reports',
    'plan.feature.supportPhone': 'Dedicated account manager + phone support',
    'plan.feature.orders5': 'Up to 5 simultaneous active orders',
    'plan.feature.commissionStandard': 'Standard Primar-IA commission per operation',
    'plan.feature.invoiceDownload': 'PDF download of invoices and signed contracts',
    'plan.feature.orders20': 'Up to 20 active orders + "Verified buyer" badge',
    'plan.feature.ordersUnlimited': 'Unlimited active orders',
    'plan.feature.commissionDiscount': '−1.0 pp off the standard commission (saved per operation)',
    'plan.feature.exportStats': 'Export statistics to CSV and PDF',
    'plan.feature.supportDedicated': 'Dedicated account manager + phone support',
    'plan.feature.credits3regenWeek': '3 creation credits (1 regenerates per week up to the cap)',
    'plan.feature.creditsUnlimited': 'Unlimited creations (no credits — only capped by active limit)',
    'plan.feature.commissionMore': 'see more',
    'commissions.back': 'Back',
    'commissions.title': 'How the Primar-IA commission works',
    'commissions.intro': 'The commission is the ONLY amount Primar-IA charges for intermediating an operation. It is calculated on the total contract amount (goods + logistics) and combines a base ticket percentage with subscription-plan and confirmed-volume discounts.',
    'commissions.whoPays.title': 'Who pays the commission?',
    'commissions.whoPays.body': 'The commission is ALWAYS paid by the buyer to Primar-IA at the time of signing the contract (via Stripe). The seller receives 100% of the agreed amount off-platform via wire transfer, per the agreed payment term. Primar-IA does not collect or pay for the goods — it only intermediates contract and commission.',
    'commissions.baseTiers.title': '1. Base percentage by ticket',
    'commissions.baseTiers.desc': 'The base percentage depends on the total contract value. The bigger the operation, the lower the percentage.',
    'commissions.baseTiers.colTicket': 'Contract value',
    'commissions.baseTiers.colPct': 'Base commission',
    'commissions.planDiscount.title': '2. Subscription-plan discount',
    'commissions.planDiscount.desc': "Buyers on a paid plan get a permanent discount on the base percentage. It applies to ALL their operations.",
    'commissions.planDiscount.colPlan': "Buyer's plan",
    'commissions.planDiscount.colDiscount': 'Discount',
    'commissions.volumeDiscount.title': '3. Confirmed-volume discount',
    'commissions.volumeDiscount.desc': "Computed on the volume purchased AND delivered in the last 30 days. The more you buy (and close without incidents), the lower your percentage on the next operation.",
    'commissions.volumeDiscount.colVolume': 'Volume last 30 days',
    'commissions.volumeDiscount.colDiscount': 'Discount',
    'commissions.caps.title': 'Caps and minimums',
    'commissions.caps.min': 'Minimum €5 per operation (covers admin cost).',
    'commissions.caps.max': "Maximum €5,000 per operation (absolute cap, regardless of size).",
    'commissions.caps.floor': "The final percentage after discounts never goes below 0% — discounts only subtract, they don't generate credit.",
    'commissions.calc.title': 'Commission calculator',
    'commissions.calc.desc': "Enter the contract amount and, optionally, your purchase volume in the last 30 days. We compare what you'd pay in commission across each buyer plan.",
    'commissions.calc.amountLabel': 'Contract amount',
    'commissions.calc.volumeLabel': 'Your volume last 30 days (optional)',
    'commissions.calc.volumeHint': 'Only counts confirmed volume delivered without incidents.',
    'commissions.calc.tierFree': 'Free',
    'commissions.calc.tierMid': 'Mid',
    'commissions.calc.tierTop': 'Top',
    'commissions.calc.rowBase': 'Base by ticket',
    'commissions.calc.rowPlanDisc': 'Plan discount',
    'commissions.calc.rowVolDisc': 'Volume discount',
    'commissions.calc.rowFinalPct': 'Final percentage',
    'commissions.calc.rowCommission': 'Commission due',
    'commissions.calc.savings': 'You save {n} vs Market',
    'commissions.calc.note': 'Amounts already include the caps (€5 min, €5,000 max). Computed live with the current percentages.',
    'commissions.footer': "These values reflect what's implemented today. Any change is notified 30 days in advance to active users.",
    'incotermWizard.title': 'Which do you accept?',
    'incotermWizard.q1': 'Who transports?',
    'incotermWizard.q1.iShip': 'I ship',
    'incotermWizard.q1.otherPicks': 'Buyer picks up',
    'incotermWizard.q1.indifferent': "I'm flexible (more matches)",
    'incotermWizard.q2': 'How far do you transport?',
    'incotermWizard.q2.exwLabel': 'Just load at my origin (EXW)',
    'incotermWizard.q2.exwDesc': 'The buyer loads and takes it.',
    'incotermWizard.q2.fcaLabel': "Loaded on the buyer's transport (FCA)",
    'incotermWizard.q2.fcaDesc': "I load it on their truck at my origin.",
    'incotermWizard.q3': 'How far do you pay for transport?',
    'incotermWizard.q3.localTransportLabel': 'Local transport (FOB/CFR/CIF…)',
    'incotermWizard.q3.localTransportDesc': 'You cover up to local port or border.',
    'incotermWizard.q3.fullDoorLabel': "To the buyer's door (DAP/DDP)",
    'incotermWizard.q3.fullDoorDesc': 'You cover the entire transport.',
    'incotermWizard.recommended': 'Recommended',
    'incotermWizard.acceptedInList': 'Already in your list',
    'incotermWizard.willAdd': "We'll add it to your list",
    'incotermWizard.back': 'Back',
    'incotermWizard.cancel': 'Cancel',
    'incotermWizard.apply': 'Add incoterm',
    'incotermWizard.open': "Not sure which to pick? We'll help",
    'incotermWizard.progress.question': 'Question {n} of 5',
    'incotermWizard.progress.results': 'Results',
    'incotermWizard.welcome.title': 'Configure your Incoterms',
    'incotermWizard.welcome.desc': "Before publishing your first lot, let's go through which contract types you can use 🌿",
    'incotermWizard.welcome.start': 'Start →',
    'incotermWizard.prev': '← Previous',
    'incotermWizard.next': 'Next →',
    'incotermWizard.results.title': 'Your recommended Incoterm',
    'incotermWizard.results.desc': 'Based on your answers, we suggest starting with:',
    'incotermWizard.results.selectOthers': 'Pick other Incoterms you also want to use:',
    'incotermWizard.results.back': '← Back',
    'incotermWizard.results.confirm': 'Confirm and start →',
    'incotermWizard.q.v1.text': 'Where do you usually ship your products?',
    'incotermWizard.q.v1.nacional': '🇪🇸 Only within Spain (domestic)',
    'incotermWizard.q.v1.ue': '🇪🇺 To other EU countries',
    'incotermWizard.q.v1.extraue': '🌍 Outside the EU (export)',
    'incotermWizard.q.v2.text': 'Who organises the transport?',
    'incotermWizard.q.v2.comprador': 'The buyer handles everything',
    'incotermWizard.q.v2.vendedor': 'I (the seller) hire the transport',
    'incotermWizard.q.v2.compartido': 'We share it / Primar-IA service',
    'incotermWizard.q.v3.text': 'Who takes the goods insurance?',
    'incotermWizard.q.v3.comprador': 'The buyer insures it',
    'incotermWizard.q.v3.vendedor': 'I prefer to insure it myself',
    'incotermWizard.q.v3.ninguno': 'No specific insurance',
    'incotermWizard.q.v4.text': 'Do you have experience with customs and import?',
    'incotermWizard.q.v4.si': 'Yes, I handle exports regularly',
    'incotermWizard.q.v4.no': 'No, I prefer a simple operation',
    'incotermWizard.q.v5.text': 'When do you want the risk to pass to the buyer?',
    'incotermWizard.q.v5.recogida': 'When they pick up at my farm / warehouse',
    'incotermWizard.q.v5.entrega': 'On delivery at destination',
    'incotermWizard.q.v5.puerto': 'At the port or terminal of origin',
    'market.title': 'Market',
    'market.subtitle': 'Market prices and volume by product on Primar-IA',
    'market.loadFail': 'Could not load market data.',
    'market.lastUpdated': 'Updated',
    'market.filterProduct': 'Product',
    'market.allProducts': 'All products',
    'market.filterCategory': 'Category',
    'market.allCategories': 'All categories',
    'market.empty': 'No market data yet',
    'market.emptyHint': "Data will appear once there are confirmed matches on the platform.",
    'market.col.product': 'PRODUCT',
    'market.col.variety': 'VARIETY',
    'market.col.category': 'CATEGORY',
    'market.col.priceAvg': 'AVG PRICE',
    'market.col.priceMin': 'MIN',
    'market.col.priceMax': 'MAX',
    'market.col.volume': 'VOLUME',
    'market.col.matches': 'MATCHES',
    'market.col.trend': 'TREND',
    'market.trend.up': 'Up',
    'market.trend.down': 'Down',
    'market.trend.flat': 'Flat',
    'market.searchPh': 'Search product…',
    'market.noResults': 'No results with the current filter.',
    'market.export': 'Export CSV',
    'market.totalProducts': 'Products',
    'market.totalVolume': 'Total volume',
    'market.totalMatches': 'Matches',
    'market.avgPrice': 'Avg. price',
    'market.analysisTitle': 'Market analysis',
    'market.analysisDesc': 'Real prices on Primar-IA plus weekly analysis from the official MAPA bulletin.',
    'market.weekly.title': 'Weekly analysis — MAPA bulletin',
    'market.weekly.week': 'Week',
    'market.weekly.generated': 'Generated on',
    'market.weekly.officialBulletin': 'Official bulletin',
    'market.weekly.alza': 'Rising',
    'market.weekly.baja': 'Falling',
    'market.sentiment.alcista': 'Bullish',
    'market.sentiment.bajista': 'Bearish',
    'market.sentiment.mixto': 'Mixed',
    'market.sentiment.estable': 'Stable',
    'market.byProduct': 'Market by product',
    'market.confirmedOpsDays': 'Confirmed operations in the last {n} days',
    'market.emptyNotEnough': "Not enough confirmed transactions yet to show market data.",
    'market.col.product2': 'Product',
    'market.col.priceAvg2': 'Avg. price',
    'market.col.variation7d': 'Variation (7d)',
    'market.col.volume2': 'Volume',
    'market.col.txCount': 'Transactions',
    'market.row.hide': 'Hide',
    'market.row.more': 'More details',
    'market.detail.lockedTitle': 'Detailed analysis requires subscription',
    'market.detail.lockedDesc': 'Access daily price history and calibre breakdown with any of our plans.',
    'market.detail.viewPlans': 'See plans',
    'market.detail.loadFail': 'Failed to load detail',
    'market.detail.noDaily': "Not enough daily data for {product} in this period.",
    'market.detail.kpi.current': 'Current price',
    'market.detail.kpi.variation': 'Period variation',
    'market.detail.kpi.totalVolume': 'Total volume',
    'market.detail.kpi.daysWithData': 'Days with data',
    'market.detail.priceHistoryHeader': 'Daily average price history',
    'market.detail.calibreBreakdownHeader': 'Calibre breakdown',
    'market.detail.noCalibre': 'No calibre',
    'market.detail.col.calibre': 'Calibre',
    'market.detail.col.avgPrice': 'Avg. price',
    'market.detail.col.volume': 'Volume',
    'market.detail.col.ops': 'Ops.',
    'market.tooltip.priceAvg': 'Avg. price',
    'profile.loadFail': 'Could not load the profile.',
    'profile.saveFail': 'Failed to save the profile.',
    'profile.saveSuccess': 'Changes saved.',
    'profile.section.account': 'Account',
    'profile.section.company': 'Company details',
    'profile.section.address': 'Tax address',
    'profile.section.contact': 'Legal contact person',
    'profile.section.bank': 'Bank details',
    'profile.section.tax': 'Tax regime',
    'profile.section.preferences': 'Preferences',
    'profile.email': 'Email',
    'profile.phone': 'Phone',
    'profile.razonSocial': 'Legal name',
    'profile.legalForm': 'Legal form',
    'profile.cifNif': 'CIF / NIF',
    'profile.street': 'Street and number',
    'profile.city': 'City',
    'profile.zip': 'Postal code',
    'profile.country': 'Country',
    'profile.name': 'First name',
    'profile.lastName': 'Last name',
    'profile.position': 'Position',
    'profile.iban': 'IBAN',
    'profile.swift': 'SWIFT / BIC',
    'profile.regimenFiscal': 'Tax regime',
    'profile.notEditable': 'Not editable — contact support to change it.',
    'profile.cancel': 'Cancel',
    'profile.password.title': 'Change password',
    'profile.password.current': 'Current password',
    'profile.password.new': 'New password',
    'profile.password.confirm': 'Confirm new password',
    'profile.password.change': 'Change password',
    'profile.password.mismatch': 'Passwords do not match.',
    'profile.password.tooShort': 'Password must be at least 12 characters.',
    'profile.password.success': 'Password updated successfully.',
    'profile.password.fail': 'Could not update the password.',
    'profile.delete.title': 'Delete account',
    'profile.delete.desc': 'This will permanently delete your account and all your data. This cannot be undone.',
    'profile.delete.button': 'Delete my account',
    'profile.delete.confirm': 'Are you sure you want to delete your account? This cannot be undone.',
    'profile.delete.fail': 'Could not delete the account. Contact support.',
    'profile.logout': 'Log out',
    'profile.tab.account': 'Account',
    'profile.tab.company': 'Company details',
    'profile.tab.tutoriales': 'Tutorials',
    'profile.subtitle': 'Manage your account and company details.',
    'profile.contactPerson': 'Contact person',
    'profile.fullName': 'Name',
    'profile.preferences': 'Preferences',
    'profile.phonePh': '+34 600 000 000',
    'profile.saveError': 'Failed to save changes.',
    'profile.passwordError': 'Failed to change password.',
    'profile.passwordUpdateButton': 'Update password',
    'profile.company.lockedBanner.before': 'Company details are locked once verified. Email',
    'profile.company.lockedBanner.after': 'to request changes.',
    'profile.company.loading': 'Loading…',
    'profile.company.razonSocial': 'Legal name',
    'profile.company.cifNif': 'CIF / NIF',
    'profile.company.formaJuridica': 'Legal form',
    'profile.company.direccionFiscal': 'Tax address',
    'profile.company.ciudad': 'City',
    'profile.company.codigoPostal': 'Postal code',
    'profile.company.pais': 'Country',
    'profile.company.iban': 'IBAN',
    'profile.company.ibanStripe': 'Managed securely by Stripe',
    'profile.tab.documents': 'My documents',
    'profile.tab.contracts': 'Incoterms',
    'profile.sellerSubtitle': 'Manage your account, company details and certifications.',
    'tutorials.title': 'Tutorials',
    'tutorials.subtitle': 'Learn how to get the most out of Primar-IA in a few minutes.',
    'tutorials.completed': 'Completed',
    'tutorials.start': 'Start',
    'tutorials.replay': 'Replay',
    'tutorials.skip': 'Skip',
    'tutorials.next': 'Next',
    'tutorials.back': 'Back',
    'tutorials.finish': 'Finish',
    'tutorials.banner.title': 'Welcome to Primar-IA',
    'tutorials.banner.body': 'Start with a 2-minute tour to get to know the platform.',
    'tutorials.banner.cta': 'Start tour',
    'tutorials.banner.dismiss': 'Not now',
    'tutorials.error.title': "Couldn't show this tutorial",
    'tutorials.error.body': "Something went wrong starting the tour. Try again in a few seconds.",
    'tutorials.error.close': 'Close',
    'tutorials.banner.testMode': 'Test mode',
    'tutorials.banner.followingTour': "you're following the tutorial",
    'tutorials.banner.nothingSaved': 'Nothing you do is saved.',
    'tutorials.banner.exit': 'Exit tutorial',
    'tutorials.flow.crearLote': 'Create and sell a lot',
    'tutorials.flow.hacerPedido': 'Place an order',
    'tutorials.boundary.title': 'The tutorial hit an error',
    'tutorials.boundary.body': "We've closed test mode so the app works normally again. Reload the page to continue.",
    'tutorials.boundary.reload': 'Reload',
    'tutorials.launcher.title': 'Guided platform tour',
    'tutorials.launcher.subtitle': 'Start with an interactive tour to learn Primar-IA step by step.',
    'tutorials.launcher.duration': '~3 minutes',
    'tutorials.launcher.start': 'Start tour',
    'tutorials.launcher.close': 'Close',
    'tutorials.intro.welcome.title': 'Welcome to Primar-IA!',
    'tutorials.intro.welcome.content': "We'll walk you through the main sections in under a minute. You can skip it any time and re-launch it from your profile.",
    'tutorials.intro.sidebar.title': 'Main menu',
    'tutorials.intro.sidebar.contentSeller': 'From here you reach your Lots, Matches with buyers, Contracts, Messages and more.',
    'tutorials.intro.sidebar.contentBuyer': 'From here you reach your Orders, Messages, Contracts, Stats and more.',
    'tutorials.intro.header.title': 'Notifications and account',
    'tutorials.intro.header.content': 'Top right you have notifications, profile access and the logout option.',
    'tutorials.intro.panel.title': 'Your dashboard',
    'tutorials.intro.panel.contentSeller': "On the dashboard you'll see your active lots, pending matches and live operations. Create a lot and the platform will auto-match compatible buyers.",
    'tutorials.intro.panel.contentBuyer': "On the dashboard you'll see your active orders and seller offers. Create an order and the platform brings you matching lots.",
    'tutorials.intro.reputation.title': 'Your reputation grows by operating',
    'tutorials.intro.reputation.content': 'Your score is computed with every operation: the more successful transactions you close, the better your reputation — unlocking better terms.',
    'tutorials.intro.moreTutorials.title': 'More tutorials on your profile',
    'tutorials.intro.moreTutorials.content': "Under Profile → Tutorials you have guides for the main flows (create lot, place order, open a claim…). We'll take you there now.",
    'tutorials.intro.locale.back': 'Back',
    'tutorials.intro.locale.close': 'Close',
    'tutorials.intro.locale.last': 'Go to my profile',
    'tutorials.intro.locale.next': 'Next',
    'tutorials.intro.locale.open': 'Open',
    'tutorials.intro.locale.skip': 'Skip tutorial',
    'tutorials.section.title': 'Learn to use the platform',
    'tutorials.section.subtitle': 'Short guides for the main flows. Not mandatory and you can do them in any order.',
    'tutorials.section.loading': 'Loading…',
    'tutorials.section.minutes': 'min',
    'tutorials.section.completed': 'Completed',
    'tutorials.section.comingSoon': 'Coming soon',
    'tutorials.section.replay': 'Replay',
    'tutorials.section.start': 'Start',
    'tutorials.catalog.intro.title': 'Intro to Primar-IA',
    'tutorials.catalog.intro.desc': 'Tour of the menu, notifications and your dashboard. Includes how your reputation grows with each operation.',
    'tutorials.catalog.crearLote.title': 'Create and sell a lot (full flow)',
    'tutorials.catalog.crearLote.desc': 'Simulated walkthrough: publish lot, receive matches, sign contract, ship and get paid.',
    'tutorials.catalog.hacerPedido.title': 'Place an order (full flow)',
    'tutorials.catalog.hacerPedido.desc': 'Simulated walkthrough: create order, receive offers, sign contract, pay commission, receive goods.',
    'tutorials.catalog.incidencia.title': 'Open a claim',
    'tutorials.catalog.incidencia.desc': "What to do if something doesn't arrive as expected: steps to open a dispute and resolution.",
    'tutorials.runner.back': 'Back',
    'tutorials.runner.close': 'Exit',
    'tutorials.runner.last': 'Finish',
    'tutorials.runner.next': 'Continue',
    'tutorials.runner.open': 'Open',
    'tutorials.runner.skip': 'Exit tutorial',
    'tasks.title': 'Pending tasks',
    'tasks.empty': 'No pending tasks.',
    'tasks.back': 'Back',
    'tasks.type.firma': 'Contract signature',
    'tasks.type.pago': 'Commission payment',
    'tasks.type.envio': 'Ship goods',
    'tasks.type.recepcion': 'Confirm receipt',
    'tasks.type.valoracion': 'Rate transaction',
    'tasks.action': 'Go to task',
    'tasks.backToDashboard': 'Back to dashboard',
    'tasks.loadFail': 'Could not load tasks.',
    'tasks.unknownType': 'Unknown task type.',
    'tasks.allCaughtUp': "You're all caught up!",
    'tasks.pendingTaskOne': 'pending task',
    'tasks.pendingTaskMany': 'pending tasks',
    'tasks.lotPrefix': 'Lot',
    'tasks.buyer': 'Buyer',
    'tasks.seller': 'Seller',
    'tasks.sign': 'Sign →',
    'tasks.prepare': 'Prepare →',
    'tasks.review': 'Review →',
    'tasks.expired': 'Expired',
    'tasks.ended': 'Ended',
    'tasks.sold': 'Sold',
    'tasks.extendLabel': 'Extend to new date',
    'tasks.saving': 'Saving…',
    'tasks.extend': 'Extend',
    'tasks.closeLot': 'Close lot',
    'tasks.closeOrder': 'Close order',
    'tasks.publishNewLot': 'Publish new lot',
    'tasks.createNewOrder': 'Create new order',
    'tasks.empty.seller.contracts': 'No contracts pending your signature.',
    'tasks.empty.seller.photos': 'No shipments pending QR or photo upload.',
    'tasks.empty.seller.matches': 'No pending match offers to review.',
    'tasks.empty.seller.expiry': 'No lots past their availability date.',
    'tasks.empty.buyer.contracts': 'No contracts pending signature and payment.',
    'tasks.empty.buyer.offers': 'No offers pending authorisation.',
    'tasks.empty.buyer.deliveries': 'No deliveries pending confirmation.',
    'tasks.empty.buyer.expiry': 'No orders past their delivery date.',
    'tasks.seller.contracts': 'Contracts to sign',
    'tasks.seller.photos': 'Shipment & QR preparation',
    'tasks.seller.matches': 'Offers to review',
    'tasks.seller.expiry': 'Lots with expired availability',
    'tasks.buyer.contracts': 'Contracts to sign and pay',
    'tasks.buyer.offers': 'Offers pending authorisation',
    'tasks.buyer.deliveries': 'Deliveries pending confirmation',
    'tasks.buyer.expiry': 'Orders with expired delivery date',
    'tasks.confirm': 'Confirm →',
    'tasks.pay': 'Pay →',
    'qr.title': 'Shipment QR code',
    'qr.subtitle': 'Stick the code on the outside of the lot so the buyer can confirm delivery.',
    'qr.codeLabel': 'Verification code',
    'qr.copyCode': 'Copy code',
    'qr.copied': 'Copied!',
    'qr.deliveryInstructions': 'The buyer must enter this code on receipt to release payment.',
    'qr.back': 'Back',
    'qr.loadFail': 'Could not load the QR.',
    'qr.redirecting': 'Redirecting to order details…',
    'qr.loadContract': 'Could not load contract info.',
    'qr.imageOnly': 'Please select an image file.',
    'qr.imageMax': 'Image must be under 10MB.',
    'qr.uploadFail': 'Upload failed.',
    'qr.addPhotos': 'Add at least one photo.',
    'qr.savePhotosFail': 'Failed to save photos.',
    'qr.savePhotosSuccess': 'Photos saved! The buyer will be able to see them.',
    'qr.backToLot': 'Back to lot',
    'qr.notFound': 'Not found.',
    'qr.notGeneratedTitle': 'QR code not yet generated',
    'qr.notGeneratedDesc': 'Both parties must sign the contract before the QR code is generated.',
    'qr.pageTitle': 'QR code & lot photos',
    'qr.lotVerification': 'Lot verification QR code',
    'qr.printHint': 'Print this QR code and attach it to the lot before shipping.',
    'qr.buyerScans': 'The buyer will scan this code to confirm delivery.',
    'qr.manualEntryLabel': 'Verification code (manual entry):',
    'qr.deliveryConfirmedByBuyer': 'Delivery confirmed by buyer',
    'qr.alreadyRated': "You've already rated this transaction.",
    'qr.rateBuyer': 'Rate buyer',
    'qr.printBtn': 'Print QR code',
    'qr.shipment': 'Shipment',
    'qr.product': 'Product',
    'qr.quantity': 'Quantity',
    'qr.buyer': 'Buyer',
    'qr.status': 'Status',
    'qr.photosTitle': 'Lot preparation photos',
    'qr.photosDesc': "Upload photos of the prepared lot. The buyer will see these before delivery.",
    'qr.uploading': 'Uploading…',
    'qr.clickToUpload': 'Click to upload photo',
    'qr.photoFormat': 'JPG or PNG, max 10MB each',
    'qr.savePhotos': 'Save photos',
    'qr.photosUploaded': 'Lot photos',
    'confirm.loadFail': 'Failed to load order details.',
    'confirm.notFound': 'Order not found.',
    'confirm.noTx': 'No transaction found for this order.',
    'confirm.releaseFail': 'Failed to release payment. Please contact support.',
    'confirm.backToOrders': 'Back to orders',
    'confirm.successTitle': 'Lot received successfully!',
    'confirm.successDesc': 'Please review the details below before releasing payment.',
    'confirm.summary': 'Delivery summary',
    'confirm.product': 'Product',
    'confirm.farmerId': 'Farmer ID',
    'confirm.quantity': 'Quantity',
    'confirm.orderId': 'Order ID',
    'confirm.releaseBtn': 'Mark as inspected & release payment',
    'confirm.reportBtn': 'Report an issue',
    'confirm.warning': 'Releasing payment is irreversible. Only confirm if the lot has been inspected and accepted.',
    'delivery.title': 'Confirm delivery',
    'delivery.confirmTitle': 'Enter the verification code',
    'delivery.confirmDesc': 'The code is printed on the QR label attached to the lot.',
    'delivery.codePh': 'QR / verification code…',
    'delivery.confirm': 'Confirm delivery',
    'delivery.fail': 'Could not verify the code.',
    'delivery.success': 'Delivery confirmed. Payment released to the seller.',
    'delivery.back': 'Back to order',
    'delivery.loadFail': 'Could not load delivery info.',
    'delivery.notFound': 'Not found.',
    'delivery.cameraFail': 'Could not access camera. Please enter the code manually.',
    'delivery.enterCode': 'Please enter the QR code.',
    'delivery.verifyFail': 'Verification failed.',
    'delivery.notSignedTitle': 'Contract not yet fully signed',
    'delivery.notSignedDesc': 'Both parties must sign the contract before delivery confirmation is available.',
    'delivery.backToOrder': 'Back to order',
    'delivery.shipmentDetails': 'Shipment details',
    'delivery.product': 'Product',
    'delivery.quantity': 'Quantity',
    'delivery.seller': 'Seller',
    'delivery.status': 'Status',
    'delivery.lotPhotos': 'Lot preparation photos',
    'delivery.confirmedTitle': 'Delivery confirmed',
    'delivery.confirmedDesc': 'Payment has been released to the seller. This order is now closed.',
    'delivery.viewClosed': 'View closed orders',
    'delivery.allOrders': 'All orders',
    'delivery.scanTitle': 'Scan QR code',
    'delivery.scanDesc': 'Scan the QR code attached to the lot, or enter the verification code manually.',
    'delivery.closeCamera': 'Close camera',
    'delivery.openCamera': 'Open camera',
    'delivery.manualTitle': 'Manual verification code',
    'delivery.manualDesc': 'If you cannot scan the QR, enter the code printed on the label.',
    'delivery.codePlaceholder': 'Enter verification code…',
    'report.title': 'Report incident',
    'report.subtitle': "Tell us what happened and our team will review it.",
    'report.problem': 'Type of issue',
    'report.describe': 'Describe the issue',
    'report.evidence': 'Evidence (photos / PDFs)',
    'report.submit': 'Submit report',
    'report.fail': 'Could not submit the report.',
    'report.success': "Report submitted. We'll contact you within 48 h.",
    'report.back': 'Back',
    'report.orderHash': 'Order #',
    'report.descMin': 'min chars',
    'report.descPh': 'Describe the issue in detail…',
    'report.descRequired': 'Description must be at least {n} characters',
    'report.evidenceLabel': 'Evidence files',
    'report.evidenceHint': 'Upload up to 6 files (max 10 MB each). {n}/6 uploaded.',
    'report.uploaded': 'uploaded',
    'report.minChars': 'min chars',
    'report.uploadFail': 'Failed to upload file.',
    'report.submitFail': 'Failed to submit report. Please try again.',
    'report.remove': 'Remove',
    'report.cancel': 'Cancel',
    'report.issue.CALIDAD': 'Quality issue',
    'report.issue.CANTIDAD': 'Quantity issue',
    'report.issue.EMPAQUETADO': 'Packaging issue',
    'report.issue.CALIBRES': 'Caliber/size issue',
    'report.issue.PRODUCTO_DIFERENTE': 'Different product',
    'report.issue.OTRO': 'Other',
    'report.issueType': 'Issue type',
    'harvest.title': 'Harvest estimation',
    'harvest.subtitle': 'Estimate your expected volume and revenue based on hectares and yield.',
    'harvest.product': 'Product',
    'harvest.variety': 'Variety',
    'harvest.hectares': 'Hectares',
    'harvest.expectedYield': 'Expected yield (kg/ha)',
    'harvest.estimate': 'Estimate',
    'harvest.estimateResult': 'Estimation result',
    'harvest.totalKg': 'Estimated total volume',
    'harvest.priceRange': 'Current price range',
    'harvest.revenue': 'Estimated revenue',
    'harvest.fail': 'Could not compute the estimation.',
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
