import { render, waitFor, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import CarteiraTrialLancers, { percentualEntradasFaixa, ticketMedioEntradas } from './CarteiraTrialLancers';

const { eq } = vi.hoisted(() => ({ eq: vi.fn() }));
vi.mock('@/lib/hostingerClient', () => ({
  hostinger: { from: () => {
    const query = {
      select: vi.fn(() => query),
      eq: eq.mockImplementation(() => query),
      lte: vi.fn(() => query),
      ilike: vi.fn(() => query),
      gte: vi.fn(() => query),
      order: vi.fn(() => query),
      range: vi.fn(async () => ({ data: [], error: null })),
    };
    return query;
  } },
}));

afterEach(cleanup);
it('%CART divide entradas da faixa pelo total de entradas', () => {
  expect(percentualEntradasFaixa(25, 100)).toBe(25);
  expect(percentualEntradasFaixa(100, 100)).toBe(100);
  expect(percentualEntradasFaixa(0, 0)).toBe(0);
});
it('ticket médio divide Soma TMM pelas entradas', () => {
  expect(ticketMedioEntradas(2037586.60, 11318)).toBeCloseTo(180.0306237851, 8);
  expect(ticketMedioEntradas(400, 2)).toBe(200);
  expect(ticketMedioEntradas(0, 0)).toBe(0);
});
it('consulta somente Enfermaria (Prata) em Entradas Lancers', async () => {
  render(<CarteiraTrialLancers />);
  await waitFor(() => expect(eq).toHaveBeenCalledWith('tp_acomodacao', 'PRATA'));
});