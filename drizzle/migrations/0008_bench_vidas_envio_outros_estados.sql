INSERT INTO public.bench_vidas_envio_chave (id, hash)
VALUES ('mensal-outros-estados', 'e46ae1cd3c31d4422fb45889660e1e11d484c86386d95c949e4dd752a1f752a5')
ON CONFLICT (id) DO NOTHING;