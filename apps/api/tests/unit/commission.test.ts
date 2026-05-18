import { calcularComision, calcularComisionLegacy } from '@primaria/shared';

describe('calcularComision (Matchmaker v2 commission table)', () => {
  describe('Base tier — by ticket size', () => {
    it('charges 5% under €500', () => {
      const r = calcularComision(400);
      expect(r.porcentajeBase).toBeCloseTo(0.05);
      expect(r.porcentajeFinal).toBeCloseTo(0.05);
      // 400 * 0.05 = 20 → above €5 floor
      expect(r.total).toBeCloseTo(20);
    });

    it('charges 4% from €500 to €2k', () => {
      const r = calcularComision(1500);
      expect(r.porcentajeBase).toBeCloseTo(0.04);
      // 1500 * 0.04 = 60
      expect(r.total).toBeCloseTo(60);
    });

    it('charges 3% from €2k to €10k', () => {
      const r = calcularComision(5000);
      expect(r.porcentajeBase).toBeCloseTo(0.03);
      expect(r.total).toBeCloseTo(150);
    });

    it('charges 2.5% from €10k to €50k', () => {
      const r = calcularComision(20000);
      expect(r.porcentajeBase).toBeCloseTo(0.025);
      // 20000 * 0.025 = 500
      expect(r.total).toBeCloseTo(500);
    });

    it('charges 2% over €50k', () => {
      const r = calcularComision(100000);
      expect(r.porcentajeBase).toBeCloseTo(0.02);
      // 100k * 0.02 = 2000
      expect(r.total).toBeCloseTo(2000);
    });
  });

  describe('Subscription discount (buyer plan)', () => {
    it('MID gives -0.5pp', () => {
      // base 3% on €5k = €150. With MID: 2.5% = €125.
      const r = calcularComision(5000, { subscriptionTier: 'MID' });
      expect(r.descuentoSuscripcion).toBeCloseTo(0.005);
      expect(r.porcentajeFinal).toBeCloseTo(0.025);
      expect(r.total).toBeCloseTo(125);
    });

    it('TOP gives -1pp', () => {
      // base 2.5% on €15k = €375. With TOP: 1.5% = €225.
      const r = calcularComision(15000, { subscriptionTier: 'TOP' });
      expect(r.descuentoSuscripcion).toBeCloseTo(0.01);
      expect(r.porcentajeFinal).toBeCloseTo(0.015);
      expect(r.total).toBeCloseTo(225);
    });

    it('FREE gives 0', () => {
      const r = calcularComision(5000, { subscriptionTier: 'FREE' });
      expect(r.descuentoSuscripcion).toBe(0);
      expect(r.porcentajeFinal).toBeCloseTo(0.03);
    });
  });

  describe('Volume discount (buyer monthly volume)', () => {
    // We deliberately use €5k as the base (firmly in the 3% bracket — boundary
    // €10k belongs to the 2.5% tier).
    it('no discount under €25k/month', () => {
      const r = calcularComision(5000, { monthlyVolumeEur: 10000 });
      expect(r.descuentoVolumen).toBe(0);
    });

    it('-0.1pp from €25k to €100k', () => {
      const r = calcularComision(5000, { monthlyVolumeEur: 50000 });
      expect(r.descuentoVolumen).toBeCloseTo(0.001);
      // base 3% - 0.1pp = 2.9% on €5k = €145
      expect(r.total).toBeCloseTo(145);
    });

    it('-0.2pp from €100k to €500k', () => {
      const r = calcularComision(5000, { monthlyVolumeEur: 200000 });
      expect(r.descuentoVolumen).toBeCloseTo(0.002);
      // 3% - 0.2pp = 2.8% on €5k = €140
      expect(r.total).toBeCloseTo(140);
    });

    it('-0.3pp over €500k', () => {
      const r = calcularComision(5000, { monthlyVolumeEur: 600000 });
      expect(r.descuentoVolumen).toBeCloseTo(0.003);
    });
  });

  describe('Combined discounts — user examples', () => {
    it('CENTRAL + €150k/month + €15k ticket → 1.3% → €195', () => {
      const r = calcularComision(15000, { subscriptionTier: 'TOP', monthlyVolumeEur: 150000 });
      // base 2.5% - 1pp - 0.2pp = 1.3%
      expect(r.porcentajeFinal).toBeCloseTo(0.013);
      // 15000 * 0.013 = 195
      expect(r.total).toBeCloseTo(195);
    });

    it('FREE + no volume + €400 ticket → 5% = €20', () => {
      const r = calcularComision(400, { subscriptionTier: 'FREE', monthlyVolumeEur: 0 });
      expect(r.total).toBeCloseTo(20);
    });

    it('Discounts never push the rate below 0', () => {
      // Construct an extreme: very low base + max discounts
      const r = calcularComision(60000, { subscriptionTier: 'TOP', monthlyVolumeEur: 600000 });
      // base 2% - 1pp - 0.3pp = 0.7%
      expect(r.porcentajeFinal).toBeCloseTo(0.007);
      expect(r.porcentajeFinal).toBeGreaterThan(0);
    });
  });

  describe('Floor and ceiling', () => {
    it('charges minimum €5 even on tiny orders', () => {
      // 50 * 0.05 = 2.5 → floored to 5
      const r = calcularComision(50);
      expect(r.total).toBe(5);
    });

    it('caps at €5000 even on huge orders', () => {
      // 1,000,000 * 0.02 = 20000 → capped to 5000
      const r = calcularComision(1000000);
      expect(r.total).toBe(5000);
    });

    it('returns 0 for zero or negative amounts (defensive)', () => {
      expect(calcularComision(0).total).toBe(0);
      expect(calcularComision(-100).total).toBe(0);
      expect(calcularComision(NaN).total).toBe(0);
    });
  });

  describe('Return shape', () => {
    it('returns the full breakdown', () => {
      const r = calcularComision(15000, { subscriptionTier: 'TOP', monthlyVolumeEur: 150000 });
      expect(r).toMatchObject({
        importe: 15000,
        porcentajeBase: 0.025,
      });
      expect(r.descuentoSuscripcion).toBeCloseTo(0.01);
      expect(r.descuentoVolumen).toBeCloseTo(0.002);
      expect(r.porcentajeFinal).toBeCloseTo(0.013);
      expect(typeof r.total).toBe('number');
      expect(typeof r.comisionAntesCaps).toBe('number');
      // Backwards-compat alias
      expect(r.porcentaje).toBeCloseTo(r.porcentajeFinal);
    });
  });
});

describe('calcularComisionLegacy (backwards compat)', () => {
  it('still works for old callers passing (importe, metodoPago)', () => {
    const r = calcularComisionLegacy(5000, 'card');
    expect(r).toHaveProperty('importe', 5000);
    expect(r).toHaveProperty('porcentaje');
    expect(r).toHaveProperty('total');
    // Base for €5k is 3%
    expect(r.porcentaje).toBeCloseTo(0.03);
  });
});
