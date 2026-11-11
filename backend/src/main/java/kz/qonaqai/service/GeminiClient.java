package kz.qonaqai.service;

import com.fasterxml.jackson.databind.*;
import java.net.URI;
import java.net.http.*;
import java.time.Duration;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

/** Server-only integration. Credentials and provider error bodies never reach the browser or logs. */
@Service
public class GeminiClient {
    private final ObjectMapper mapper;
    private final String key, model;
    private final boolean nodeTransport;
    private final NodeGeminiTransport node;
    private final HttpClient http=HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    public GeminiClient(ObjectMapper mapper,@Value("${qonaq.ai.api-key:}") String key,
                        @Value("${qonaq.ai.model:gemini-3.5-flash-lite}") String model,
                        @Value("${qonaq.ai.transport:java}") String transport,NodeGeminiTransport node) {
        this.mapper=mapper; this.key=key; this.model=model; this.nodeTransport="node".equals(transport); this.node=node;
        if (!model.matches("[a-zA-Z0-9._-]+")) throw new IllegalArgumentException("Invalid Gemini model configuration");
    }
    public boolean configured() { return !key.isBlank(); }
    public String model() { return model; }
    public JsonNode generate(String instruction,String prompt,Map<String,Object> schema) {
        if (!configured()) throw unavailable("ИИ пока не настроен на сервере. Можно заполнить параметры вручную.");
        try {
            var config=new LinkedHashMap<String,Object>();
            config.put("temperature",0.3); config.put("maxOutputTokens",2600);
            config.put("responseMimeType","application/json"); config.put("responseSchema",schema);
            var payload=Map.of("systemInstruction",Map.of("parts",List.of(Map.of("text",instruction))),
                "contents",List.of(Map.of("role","user","parts",List.of(Map.of("text",prompt)))),"generationConfig",config);
            var request=HttpRequest.newBuilder(URI.create("https://generativelanguage.googleapis.com/v1beta/models/"+model+":generateContent"))
                .timeout(Duration.ofSeconds(45)).header("Content-Type","application/json").header("x-goog-api-key",key)
                .POST(HttpRequest.BodyPublishers.ofString(mapper.writeValueAsString(payload))).build();
            NodeGeminiTransport.Response response;
            if(nodeTransport) response=node.send(key,model,payload);
            else { var nativeResponse=http.send(request,HttpResponse.BodyHandlers.ofString()); response=new NodeGeminiTransport.Response(nativeResponse.statusCode(),nativeResponse.body()); }
            if (response.status()==429) throw new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,"Лимит Gemini временно исчерпан. Попробуйте позже.");
            if (response.status()==400 || response.status()==401 || response.status()==403)
                throw unavailable("Gemini отклонил запрос. Проверьте ключ, доступ к модели и регион в настройках сервера.");
            if (response.status()!=200) throw unavailable("Gemini временно недоступен. Попробуйте ещё раз или заполните вручную.");
            var root=mapper.readTree(response.body());
            var parts=root.path("candidates").path(0).path("content").path("parts");
            StringBuilder result=new StringBuilder();
            for (var part:parts) if (!part.path("thought").asBoolean(false)) result.append(part.path("text").asText(""));
            if (result.isEmpty()) throw unavailable("ИИ не смог ответить на этот запрос. Попробуйте уточнить описание.");
            return mapper.readTree(result.toString());
        } catch (ResponseStatusException ex) { throw ex; }
        catch (InterruptedException ex) { Thread.currentThread().interrupt(); throw unavailable("Запрос к ИИ прерван. Попробуйте снова."); }
        catch (Exception ex) { throw unavailable("Не удалось связаться с Gemini. Проверьте подключение и повторите запрос."); }
    }
    private ResponseStatusException unavailable(String message) { return new ResponseStatusException(HttpStatus.SERVICE_UNAVAILABLE,message); }
}
