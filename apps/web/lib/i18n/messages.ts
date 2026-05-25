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
    'register.step1.phone': 'Teléfono de contacto',
    'register.step1.language': 'Idioma preferido',
    'register.step1.continue': 'Continuar a datos fiscales',
    'register.step2.companyHeader': 'Datos de la empresa',
    'register.step2.razonSocial': 'Razón social',
    'register.step2.razonSocialPh': 'Frutas García S.L.',
    'register.step2.legalForm': 'Forma jurídica',
    'register.step2.legalFormPh': 'Selecciona forma jurídica…',
    'register.step2.cifNif': 'CIF / NIF',
    'register.step2.cifNifHint': '9 caracteres — letra + 8 dígitos (ej.: B12345678)',
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
    'register.step2.ibanHint': 'IBAN europeo — 24 caracteres (España). Se normaliza automáticamente.',
    'register.step2.swift': 'SWIFT / BIC',
    'register.step2.swiftPh': 'BSCHESMM (opcional, sólo cuentas no-IBAN)',
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
    'register.step1.phone': 'Contact phone number',
    'register.step1.language': 'Preferred language',
    'register.step1.continue': 'Continue to business details',
    'register.step2.companyHeader': 'Company details',
    'register.step2.razonSocial': 'Legal name',
    'register.step2.razonSocialPh': 'Frutas García S.L.',
    'register.step2.legalForm': 'Legal form',
    'register.step2.legalFormPh': 'Select legal form…',
    'register.step2.cifNif': 'CIF / NIF (tax ID)',
    'register.step2.cifNifHint': '9 characters — letter + 8 digits (e.g. B12345678)',
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
    'register.step2.ibanHint': 'European IBAN — 24 characters (Spain). Auto-normalised.',
    'register.step2.swift': 'SWIFT / BIC',
    'register.step2.swiftPh': 'BSCHESMM (optional, only non-IBAN accounts)',
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
