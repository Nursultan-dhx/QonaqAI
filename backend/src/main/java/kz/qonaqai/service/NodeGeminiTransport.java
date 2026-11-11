package kz.qonaqai.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.util.Map;
import java.util.concurrent.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class NodeGeminiTransport {
    public record Response(int status,String body) {}
    private final ObjectMapper mapper;
    private final String command;
    private Path script;
    public NodeGeminiTransport(ObjectMapper mapper,@Value("${qonaq.ai.node-command:node}") String command) { this.mapper=mapper; this.command=command; }
    private synchronized Path script() throws Exception {
        if(script==null) {
            script=Files.createTempFile("qonaq-gemini-transport-",".mjs"); script.toFile().deleteOnExit();
            try(var resource=getClass().getResourceAsStream("/gemini-transport.mjs")) {
                if(resource==null) throw new IllegalStateException("Gemini transport resource missing");
                Files.copy(resource,script,StandardCopyOption.REPLACE_EXISTING);
            }
        }
        return script;
    }
    public Response send(String key,String model,Object payload) throws Exception {
        var process=new ProcessBuilder(command,script().toString()).redirectError(ProcessBuilder.Redirect.DISCARD).start();
        try {
            var output=CompletableFuture.supplyAsync(()->{try{return process.getInputStream().readNBytes(1000000);}catch(Exception ex){throw new CompletionException(ex);}});
            try(var stdin=process.getOutputStream()) { stdin.write(mapper.writeValueAsBytes(Map.of("key",key,"model",model,"payload",payload))); }
            if(!process.waitFor(50,TimeUnit.SECONDS)) throw new TimeoutException();
            if(process.exitValue()!=0) throw new IllegalStateException("Gemini transport failed");
            var envelope=mapper.readTree(new String(output.get(2,TimeUnit.SECONDS),StandardCharsets.UTF_8));
            return new Response(envelope.path("status").asInt(),envelope.path("body").asText(""));
        } finally { if(process.isAlive()) process.destroyForcibly(); }
    }
}
