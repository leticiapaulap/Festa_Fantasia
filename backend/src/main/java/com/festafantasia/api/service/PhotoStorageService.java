package com.festafantasia.api.service;

import com.festafantasia.api.exception.BusinessException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.StringUtils;
import org.springframework.web.client.RestClient;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
public class PhotoStorageService {
    private static final Set<String> ALLOWED_TYPES = Set.of("image/jpeg", "image/png", "image/webp");

    private final long maxSizeBytes;
    private final String cloudName;
    private final String uploadPreset;
    private final RestClient restClient;

    public PhotoStorageService(
            @Value("${app.uploads.max-photo-size-mb}") long maxSizeMb,
            @Value("${app.storage.cloudinary-cloud-name}") String cloudName,
            @Value("${app.storage.cloudinary-upload-preset}") String uploadPreset,
            RestClient.Builder restClientBuilder
    ) {
        this.maxSizeBytes = maxSizeMb * 1024 * 1024;
        this.cloudName = cloudName;
        this.uploadPreset = uploadPreset;
        this.restClient = restClientBuilder.build();
    }

    public String uploadParticipantPhoto(MultipartFile file) {
        validate(file);
        if (!StringUtils.hasText(cloudName) || !StringUtils.hasText(uploadPreset)) {
            throw new BusinessException("Storage de fotos não configurado.", HttpStatus.INTERNAL_SERVER_ERROR);
        }
        try {
            var filename = "participants/" + UUID.randomUUID() + extensionFor(file.getContentType());
            var resource = new ByteArrayResource(file.getBytes()) {
                @Override
                public String getFilename() {
                    return filename;
                }
            };
            var body = new LinkedMultiValueMap<String, Object>();
            body.add("file", resource);
            body.add("upload_preset", uploadPreset);
            body.add("folder", "festa-fantasia/participants");
            body.add("public_id", filename);

            @SuppressWarnings("unchecked")
            var response = restClient.post()
                    .uri("https://api.cloudinary.com/v1_1/{cloudName}/image/upload", cloudName)
                    .contentType(MediaType.MULTIPART_FORM_DATA)
                    .body(body)
                    .retrieve()
                    .body(Map.class);
            var secureUrl = response == null ? null : response.get("secure_url");
            if (secureUrl == null) {
                throw new BusinessException("Não foi possível salvar a foto.", HttpStatus.BAD_GATEWAY);
            }
            return secureUrl.toString();
        } catch (IOException ex) {
            throw new BusinessException("Não foi possível ler a imagem enviada.", HttpStatus.BAD_REQUEST);
        }
    }

    private void validate(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BusinessException("Selecione uma imagem para upload.", HttpStatus.BAD_REQUEST);
        }
        if (!ALLOWED_TYPES.contains(file.getContentType())) {
            throw new BusinessException("Selecione uma imagem JPG, PNG ou WEBP.", HttpStatus.BAD_REQUEST);
        }
        if (file.getSize() > maxSizeBytes) {
            throw new BusinessException("A imagem deve ter no máximo 5 MB.", HttpStatus.BAD_REQUEST);
        }
    }

    private String extensionFor(String contentType) {
        return switch (contentType) {
            case "image/png" -> ".png";
            case "image/webp" -> ".webp";
            default -> ".jpg";
        };
    }
}
