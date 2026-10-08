package br.dev.ricardomartins.odonto.shared;

import java.security.SecureRandom;
import java.util.UUID;

/**
 * Gera UUIDs versão 7 (RFC 9562): 48 bits de timestamp em milissegundos seguidos de bits aleatórios.
 * Por serem ordenáveis no tempo, mantêm boa localidade no índice da chave primária, ao contrário do v4.
 */
public final class UuidV7 {

    private static final SecureRandom RANDOM = new SecureRandom();

    private UuidV7() {
    }

    public static UUID gerar() {
        long timestamp = System.currentTimeMillis();
        long mostSignificant = (timestamp << 16) | (0x7L << 12) | (RANDOM.nextInt() & 0xFFFL);
        long leastSignificant = (RANDOM.nextLong() & 0x3FFFFFFFFFFFFFFFL) | 0x8000000000000000L;
        return new UUID(mostSignificant, leastSignificant);
    }
}
