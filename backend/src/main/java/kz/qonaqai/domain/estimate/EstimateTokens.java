package kz.qonaqai.domain.estimate;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.*;
import java.util.HexFormat;

/** Optimistic preconditions, not authorization credentials. */
public final class EstimateTokens {
    private EstimateTokens() {}
    public static String hash(String... values) {
        try {
            var hash = MessageDigest.getInstance("SHA-256");
            for (String value : values) {
                byte[] bytes = String.valueOf(value).getBytes(StandardCharsets.UTF_8);
                hash.update(ByteBuffer.allocate(4).putInt(bytes.length).array());
                hash.update(bytes);
            }
            return HexFormat.of().formatHex(hash.digest());
        } catch (NoSuchAlgorithmException ex) { throw new IllegalStateException(ex); }
    }
}
