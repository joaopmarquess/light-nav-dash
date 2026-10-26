import { render, waitFor, cleanup } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import CarteiraTrialLancers from './CarteiraTrialLancers';

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
it('consulta somente Enfermaria (Prata) em Entradas Lancers', async () => {
  render(<CarteiraTrialLancers />);
  await waitFor(() => expect(eq).toHaveBeenCalledWith('tp_acomodacao', 'PRATA'));
});