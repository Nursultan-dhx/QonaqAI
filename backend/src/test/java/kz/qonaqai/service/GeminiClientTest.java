package kz.qonaqai.service;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.*;
import org.junit.jupiter.api.Test;
import org.springframework.web.server.ResponseStatusException;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class GeminiClientTest {
    final NodeGeminiTransport node=mock(NodeGeminiTransport.class);
    final GeminiClient client=new GeminiClient(new ObjectMapper(),"test-only-key","test-model","node",node);
    @Test void readsStructuredTextAndExcludesThinkingParts() throws Exception {
        when(node.send(anyString(),anyString(),any())).thenReturn(new NodeGeminiTransport.Response(200,"""
            {"candidates":[{"content":{"parts":[{"thought":true,"text":"internal reasoning"},{"text":"{\\"message\\":\\"Готово\\"}"}]}}]}
            """));
        assertEquals("Готово",client.generate("instruction","prompt",Map.of("type","object")).path("message").asText());
    }
    @Test void neverExposesProviderErrorBodyOrCredential() throws Exception {
        when(node.send(anyString(),anyString(),any())).thenReturn(new NodeGeminiTransport.Response(403,"test-only-key and private provider diagnostics"));
        var failure=assertThrows(ResponseStatusException.class,()->client.generate("","",Map.of()));
        assertEquals(503,failure.getStatusCode().value());
        assertFalse(failure.getReason().contains("test-only-key")); assertFalse(failure.getReason().contains("private provider"));
    }
    @Test void missingKeyMakesNoNetworkRequest() {
        var empty=new GeminiClient(new ObjectMapper(),"","test-model","node",node);
        assertThrows(ResponseStatusException.class,()->empty.generate("","",Map.of())); verifyNoInteractions(node);
    }
    @Test void mapsQuotaAndMalformedResponsesToUsefulErrors() throws Exception {
        when(node.send(anyString(),anyString(),any())).thenReturn(new NodeGeminiTransport.Response(429,"{}"));
        assertEquals(429,assertThrows(ResponseStatusException.class,()->client.generate("","",Map.of())).getStatusCode().value());
        when(node.send(anyString(),anyString(),any())).thenReturn(new NodeGeminiTransport.Response(200,"not-json"));
        assertEquals(503,assertThrows(ResponseStatusException.class,()->client.generate("","",Map.of())).getStatusCode().value());
    }
}
